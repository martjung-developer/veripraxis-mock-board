// app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SendOtpResult } from '@/lib/types/auth/'

async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // no-op
      },
    },
  )
}

export async function POST(req: NextRequest): Promise<NextResponse<SendOtpResult>> {
  try {
    const body = await req.json()

    if (typeof body.email !== 'string' || !body.email.trim()) {
      return NextResponse.json(
        { sent: false, error: 'Email is required.' },
        { status: 400 }
      )
    }

    const email = body.email.trim().toLowerCase()
    const supabase = await getSupabaseServer()

    const { error } = await supabase.auth.signInWithOtp({
      email,
    })

    if (error) {
      console.error('[send-otp] error:', error.message)
      return NextResponse.json(
        { sent: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ sent: true })

  } catch (err) {
    console.error('[send-otp] unexpected:', err)
    return NextResponse.json(
      { sent: false, error: 'Server error.' },
      { status: 500 }
    )
  }
}