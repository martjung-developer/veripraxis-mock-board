// app/api/auth/send-otp/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generates a 6-digit OTP, stores a bcrypt hash, and emails it via Resend.
// POST { email: string }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { Resend }                    from 'resend'
import bcrypt                        from 'bcryptjs'
import { storeOtp }                  from '@/lib/utils/auth/otp-store'
import { OTP_LENGTH }                from '@/lib/constants/auth'
import type { SendOtpResult }        from '@/lib/types/auth/'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateOtp(length: number): string {
  const digits = Array.from(
    { length },
    () => Math.floor(Math.random() * 10),
  )
  return digits.join('')
}

export async function POST(req: NextRequest): Promise<NextResponse<SendOtpResult>> {
  try {
    const { email } = await req.json() as { email?: string }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ sent: false, error: 'Email is required.' }, { status: 400 })
    }

    const otp    = generateOtp(OTP_LENGTH)
    const hashed = await bcrypt.hash(otp, 10)

    storeOtp(email, hashed)

    const { error } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? 'VeriPraxis <onboarding@resend.dev>',
      to:      [email],
      subject: 'Your VeriPraxis verification code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
          <img src="https://yourdomain.com/images/veripraxis-logo.png"
               alt="VeriPraxis" height="36" style="margin-bottom:24px" />
          <h2 style="margin:0 0 8px;color:#0f172a">Check your email</h2>
          <p style="color:#475569;margin:0 0 24px">
            Use the code below to verify your email address. It expires in 10 minutes.
          </p>
          <div style="
            letter-spacing:0.25em;font-size:2rem;font-weight:700;
            color:#6366f1;background:#f1f5f9;border-radius:8px;
            padding:16px 24px;text-align:center;margin-bottom:24px
          ">${otp}</div>
          <p style="color:#94a3b8;font-size:0.8rem">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[send-otp] Resend error:', error)
      return NextResponse.json({ sent: false, error: 'Failed to send email. Try again.' }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[send-otp] Unexpected error:', err)
    return NextResponse.json({ sent: false, error: 'Server error.' }, { status: 500 })
  }
}