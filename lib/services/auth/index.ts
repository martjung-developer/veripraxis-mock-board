// lib/services/auth/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Client-side auth service — wraps API calls and Supabase auth methods.
// All functions return typed result objects; they never throw.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }         from '@/lib/supabase/client'
import { normaliseId }          from '@/lib/utils/auth/index'
import { ROLE_DASHBOARDS }      from '@/lib/types/auth/index'
import type {
  AuthResult,
  ResolveUserResult,
  SendOtpResult,
  VerifyOtpResult,
  ProgramCode,
  YearLevel,
} from '@/lib/types/auth/index'

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
      error: error.message.includes('Invalid login credentials')
        ? 'Incorrect password.'
        : error.message,
    }
  }

  return { success: true, redirectTo: ROLE_DASHBOARDS[resolved.role] }
}

// ── signUpStudent ─────────────────────────────────────────────────────────────
// Creates a Supabase Auth user (student only).
// Passes full_name and year_level in user_metadata so the DB trigger
// can write them to `profiles.full_name` and `students.year_level`.

export async function signUpStudent(
  studentId:   string,
  fullName:    string,
  email:       string,
  password:    string,
  programCode: ProgramCode,
  yearLevel:   YearLevel,
): Promise<AuthResult> {
  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // These values are read by the Supabase `handle_new_user` trigger
        // and written into `profiles` and `students` tables.
        student_id:   normaliseId(studentId),
        full_name:    fullName.trim(),
        role:         'student',
        program_code: programCode,
        year_level:   yearLevel,
      },
    },
  })

  if (error) return { success: false, error: error.message }

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('verify_email', email)
  }

  return { success: true, redirectTo: '/verify-email' }
}

// ── signInWithGoogle ──────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider:  'google',
    options:   { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, redirectTo: '/auth/callback' }
}

// ── signInWithFacebook ────────────────────────────────────────────────────────

export async function signInWithFacebook(): Promise<AuthResult> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes:     'email,public_profile',
    },
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
    return { sent: false, error: 'Network error.' }
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
    return { verified: false, error: 'Network error.' }
  }
}

// ── signOut ───────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}