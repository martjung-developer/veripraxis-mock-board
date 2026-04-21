// lib/services/auth/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Client-side auth service — wraps Supabase Auth SDK calls and our API routes.
// EMAIL-ONLY FLOW: no OTP is triggered from any function here.
// All functions return typed AuthResult objects and never throw.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }    from '@/lib/supabase/client'
import { normaliseId }     from '@/lib/utils/auth/'
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
/**
 * Maps a STU- / FAC- / ADM- ID to the linked email via the server-side API.
 * The API uses the service role key — this client call never exposes it.
 */
export async function resolveUserById(rawId: string): Promise<ResolveUserResult> {
  try {
    const res = await fetch('/api/auth/resolve-user-by-id', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: normaliseId(rawId) }),
    })
    return (await res.json()) as ResolveUserResult
  } catch {
    return { found: false, error: 'Network error. Please try again.' }
  }
}

// ── signInWithId ──────────────────────────────────────────────────────────────
/**
 * Resolve a role-prefixed ID to its email, then call signInWithPassword.
 */
export async function signInWithId(rawId: string, password: string): Promise<AuthResult> {
  const normalizedId = normaliseId(rawId)

  console.log('[signInWithId]', {
    input: rawId,
    normalized: normalizedId,
  })

  const resolved = await resolveUserById(normalizedId)

  if (!resolved.found) {
    console.log('[resolveUserById FAILED]', resolved)
    return { success: false, error: resolved.error }
  }

  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolved.email,
    password,
  })

  if (error || !data.user) {
    const msg = error?.message ?? ''
    return {
      success: false,
      error: msg.toLowerCase().includes('invalid login credentials')
        ? 'Incorrect password.'
        : (msg || 'Sign-in failed.'),
    }
  }

  return {
    success: true,
    redirectTo: ROLE_DASHBOARDS[resolved.role],
  }
}

// ── signUpStudent ─────────────────────────────────────────────────────────────
/**
 * Create a new student account.
 *
 * EMAIL-ONLY FLOW:
 *   1. supabase.auth.signUp — creates the auth.users row.
 *      Supabase sends its built-in confirmation email automatically.
 *   2. POST /api/auth/create-profile — writes profiles + students rows
 *      using the anon-key server client (reading the session cookie).
 *   3. Returns redirect to /signup-success so the user knows to check email.
 *
 * NO OTP is generated or sent from this function.
 */
export async function signUpStudent(
  studentId:   string,
  fullName:    string,
  email:       string,
  password:    string,
  programCode: ProgramCode,
  yearLevel:   YearLevel,
  phone?:      string,
): Promise<AuthResult> {
  const supabase = createClient()

  // 1. Create auth user — Supabase sends its own confirmation email.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        student_id:   normaliseId(studentId),
        full_name:    fullName.trim(),
        role:         'student' as const,
        program_code: programCode,
        year_level:   yearLevel,
        phone:        phone?.trim() ?? '',
      },
      // Let Supabase send its own confirmation link — no custom OTP.
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
    },
  })

  if (error)      return { success: false, error: error.message }
  if (!data.user) return { success: false, error: 'Account creation failed. Please try again.' }

  // 2. Write profiles + students rows via the create-profile API route.
  //    This runs server-side with the anon client that reads the session cookie,
  //    so RLS policies are respected without exposing the service role key.
  try {
    const res = await fetch('/api/auth/create-profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        studentId:   normaliseId(studentId),
        fullName:    fullName.trim(),
        programCode,
        yearLevel:   String(yearLevel),
        phone:       phone?.trim() ?? '',
      }),
    })

    const result = (await res.json()) as { success: boolean; error?: string }

    if (!result.success) {
      // Non-fatal: the auth user was created. Log and continue.
      // The DB trigger (handle_new_user) may still write the rows.
      console.warn('[signUpStudent] create-profile warning:', result.error)
    }
  } catch (err) {
    // Network failure — non-fatal, same reasoning as above.
    console.warn('[signUpStudent] create-profile network error:', err)
  }

  // 3. Redirect to a static success page — user needs to confirm their email.
  return { success: true, redirectTo: '/signup-success' }
}

// ── signInWithGoogle ──────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options:  {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : '/auth/callback',
    },
  })
  if (error) return { success: false, error: error.message }
  // OAuth flow triggers a full redirect — this line is rarely reached.
  return { success: true, redirectTo: '/auth/callback' }
}

// ── signInWithFacebook ────────────────────────────────────────────────────────

export async function signInWithFacebook(): Promise<AuthResult> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options:  {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : '/auth/callback',
    },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, redirectTo: '/auth/callback' }
}

// ── signOut ───────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}

// ── sendOtp / verifyOtp ───────────────────────────────────────────────────────
// Kept for future use. NOT called anywhere in the current email-only flow.

export async function sendOtp(email: string): Promise<SendOtpResult> {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })
    return (await res.json()) as SendOtpResult
  } catch {
    return { sent: false, error: 'Network error. Please try again.' }
  }
}

export async function verifyOtp(email: string, token: string): Promise<VerifyOtpResult> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, token }),
    })
    return (await res.json()) as VerifyOtpResult
  } catch {
    return { verified: false, error: 'Network error. Please try again.' }
  }
}