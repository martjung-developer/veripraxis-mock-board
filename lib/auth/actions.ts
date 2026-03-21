// lib/auth/actions.ts
// All Supabase auth operations.
// The signup form shows "Student" and "Faculty" to users.
// Faculty choice maps to DB role 'reviewer'.

import { createClient } from '@/lib/supabase/client'
import type { AuthError } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import type { SignupRole, UserRole } from '@/lib/types/auth'
import { getDashboardByRole } from '@/lib/types/auth'

type StudentsInsert = Database['public']['Tables']['students']['Insert']

export type AuthResult =
  | { success: true;  redirectTo: string }
  | { success: false; error: string }

// ── Sign Up ───────────────────────────────────────────────────────────────────
// signupRole: 'student' | 'reviewer'
// UI label:   'Student' | 'Faculty'
// Both get a students row (trigger handles it) because both can take exams.
export async function signUp(
  fullName:   string,
  email:      string,
  password:   string,
  signupRole: SignupRole,
): Promise<AuthResult> {
  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role:      signupRole, // 'student' or 'reviewer'
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) return { success: false, error: formatError(error) }

  // Save email so verify-email page knows who to verify
  sessionStorage.setItem('verify_email', email)

  return { success: true, redirectTo: '/verify-email' }
}

// ── Sign In ───────────────────────────────────────────────────────────────────
export async function signIn(
  email:    string,
  password: string,
): Promise<AuthResult> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { success: false, error: formatError(error) }

  const role = (data.user?.user_metadata?.role ?? 'student') as UserRole
  return { success: true, redirectTo: getDashboardByRole(role) }
}

// ── Sign Out ──────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/login'
}

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Google sign-ins always default to 'student' role.
// Faculty must sign up via email to set the 'reviewer' role.
export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt:      'consent',
      },
    },
  })

  if (error) return { success: false, error: formatError(error) }
  return { success: true, redirectTo: '/dashboard' }
}

// ── Resend verification email ─────────────────────────────────────────────────
export async function resendVerification(email: string): Promise<AuthResult> {
  const supabase = createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  })

  if (error) return { success: false, error: formatError(error) }
  return { success: true, redirectTo: '/verify-email' }
}

// ── Verify OTP ────────────────────────────────────────────────────────────────
export async function verifyOtp(
  email: string,
  token: string,
): Promise<AuthResult> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  })

  if (error) return { success: false, error: formatError(error) }

  const role = (data.user?.user_metadata?.role ?? 'student') as UserRole

  
 if ((role === 'student' || role === 'reviewer') && data.user) {
  await supabase
    .from('students')
    .insert([{ id: data.user.id }] satisfies StudentsInsert[])
    .throwOnError()
}

  return { success: true, redirectTo: getDashboardByRole(role) }
}

function formatError(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Incorrect email or password. Please try again.'
    case 'Email not confirmed':
      return 'Please verify your email before logging in.'
    case 'User already registered':
      return 'An account with this email already exists.'
    case 'Password should be at least 6 characters.':
      return 'Password must be at least 6 characters.'
    case 'Email rate limit exceeded':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'Token has expired or is invalid':
      return 'Your verification code has expired. Please request a new one.'
    default:
      return error.message ?? 'Something went wrong. Please try again.'
  }
}