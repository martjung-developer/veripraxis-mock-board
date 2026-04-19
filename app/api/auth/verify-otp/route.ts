// app/api/auth/verify-otp/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Verifies the submitted OTP, then signs the user in via Supabase admin API.
// POST { email: string, token: string }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }   from 'next/server'
import { createClient }                from '@supabase/supabase-js'
import bcrypt                          from 'bcryptjs'
import { consumeOtp }                  from '@/lib/utils/auth/otp-store'
import { ROLE_DASHBOARDS }             from '@/lib/types/auth/'
import type { VerifyOtpResult, UserRole } from '@/lib/types/auth/'

// Service-role client — only used server-side, never exposed to the browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function POST(req: NextRequest): Promise<NextResponse<VerifyOtpResult>> {
  try {
    const { email, token } = await req.json() as { email?: string; token?: string }

    if (!email || !token) {
      return NextResponse.json({ verified: false, error: 'Email and code are required.' }, { status: 400 })
    }

    const result = consumeOtp(email, (hash) => bcrypt.compareSync(token, hash))

    if (result === 'expired') {
      return NextResponse.json({ verified: false, error: 'Code expired. Please request a new one.' })
    }
    if (result === 'too_many_attempts') {
      return NextResponse.json({ verified: false, error: 'Too many attempts. Please request a new code.' })
    }
    if (result === 'invalid') {
      return NextResponse.json({ verified: false, error: 'Invalid code. Please try again.' })
    }

    // OTP is valid — confirm the user's email via admin API
    const { data: userData, error: lookupError } = await supabaseAdmin.auth.admin.listUsers()
    if (lookupError) {
      return NextResponse.json({ verified: false, error: 'Server error. Try again.' }, { status: 500 })
    }

    const user = userData.users.find((u) => u.email === email)
    if (!user) {
      return NextResponse.json({ verified: false, error: 'Account not found.' }, { status: 404 })
    }

    // Mark email as confirmed if it isn't already
    if (!user.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      })
    }

    const role = (user.user_metadata?.role ?? 'student') as UserRole
    return NextResponse.json({ verified: true, redirectTo: ROLE_DASHBOARDS[role] })
  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err)
    return NextResponse.json({ verified: false, error: 'Server error.' }, { status: 500 })
  }
}