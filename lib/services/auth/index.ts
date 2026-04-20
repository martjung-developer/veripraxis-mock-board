// lib/services/auth/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Client-side auth service — wraps API calls and Supabase auth methods.
// All functions return typed result objects; they never throw.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }    from '@/lib/supabase/client'
import { normaliseId }     from '@/lib/utils/auth'
import { ROLE_DASHBOARDS } from '@/lib/types/auth/'
import type {
  AuthResult,
  ResolveUserResult,
  SendOtpResult,
  VerifyOtpResult,
  ProgramCode,
  YearLevel,
} from '@/lib/types/auth/'

// ── resolveUserById ───────────────────────────────────────────────────────────

export async function resolveUserById(rawId: string): Promise<ResolveUserResult> {
  try {
    const res = await fetch('/api/auth/resolve-user-by-id', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: normaliseId(rawId) }),
    })
    return await res.json() as ResolveUserResult
  } catch {
    return { found: false, error: 'Network error. Please try again.' }
  }
}

// ── signInWithId ──────────────────────────────────────────────────────────────

export async function signInWithId(rawId: string, password: string): Promise<AuthResult> {
  const resolved = await resolveUserById(rawId)
  if (!resolved.found) return { success: false, error: resolved.error }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email:    resolved.email,
    password,
  })

  if (error) {
    return {
      success: false,
      error:   error.message.includes('Invalid login credentials')
        ? 'Incorrect password.'
        : error.message,
    }
  }

  return { success: true, redirectTo: ROLE_DASHBOARDS[resolved.role] }
}

// ── signUpStudent ─────────────────────────────────────────────────────────────
/**
 * Create a new student account via Supabase Auth.
 *
 * Flow:
 *   1. supabase.auth.signUp  — creates auth.users row (unconfirmed)
 *   2. students upsert       — safety net if the DB trigger hasn't run yet
 *   3. sessionStorage        — persists email for the OTP verification page
 *
 * The user_metadata fields (full_name, year_level, etc.) are read by the
 * `handle_new_user` DB trigger, which writes them into `profiles` and `students`.
 */
export async function signUpStudent(
  studentId:   string,
  fullName:    string,
  email:       string,
  password:    string,
  programCode: ProgramCode,
  yearLevel:   YearLevel,
): Promise<AuthResult> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        student_id:   normaliseId(studentId),
        full_name:    fullName.trim(),
        role:         'student',
        program_code: programCode,
        year_level:   yearLevel,
      },
    },
  })

  if (error)      return { success: false, error: error.message }
  if (!data.user) return { success: false, error: 'Account creation failed. Please try again.' }

  // Safety-net upsert — no-op if the DB trigger already created the row.
  // Typed correctly against the generated schema; no `as any` needed.
  const { error: studentErr } = await supabase
    .from('students')
    .upsert(
      {
        id:         data.user.id,
        student_id: normaliseId(studentId),
        year_level: yearLevel,
        program_id: null,
      },
      { onConflict: 'id' },
    )

  if (studentErr) {
    // Non-fatal — the DB trigger may have already written the row.
    // Log and continue to OTP verification rather than blocking the user.
    console.warn('[signUpStudent] students upsert warning:', studentErr.message)
  }

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('verify_email', email)
  }

  return { success: true, redirectTo: '/verify-email' }
}

// ── signInWithGoogle ──────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options:  { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, redirectTo: '/auth/callback' }
}

// ── signInWithFacebook ────────────────────────────────────────────────────────

export async function signInWithFacebook(): Promise<AuthResult> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options:  { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, redirectTo: '/auth/callback' }
}

// ── sendOtp ───────────────────────────────────────────────────────────────────

export async function sendOtp(email: string): Promise<SendOtpResult> {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })
    return await res.json() as SendOtpResult
  } catch {
    return { sent: false, error: 'Network error. Please try again.' }
  }
}

// ── verifyOtp ─────────────────────────────────────────────────────────────────

export async function verifyOtp(email: string, token: string): Promise<VerifyOtpResult> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, token }),
    })
    return await res.json() as VerifyOtpResult
  } catch {
    return { verified: false, error: 'Network error. Please try again.' }
  }
}

// ── signOut ───────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}