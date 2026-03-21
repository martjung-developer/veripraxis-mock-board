// app/auth/callback/route.ts
// Handles Google OAuth redirect and email confirmation link.

import { NextResponse }           from 'next/server'
import { createClient }           from '@/lib/supabase/server'
import { getProfile }             from '@/lib/auth/helpers'
import { getDashboardByRole }     from '@/lib/types/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const profile = await getProfile(data.user.id)
      const role    = profile?.role ?? 'student'
      return NextResponse.redirect(`${origin}${getDashboardByRole(role)}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}