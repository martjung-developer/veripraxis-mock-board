// lib/utils/auth/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure utility functions for the auth system.
// All functions are safe to import in both client and server contexts.
// ─────────────────────────────────────────────────────────────────────────────

import type { UserRole, YearLevel } from '@/lib/types/auth/'
import { YEAR_LEVEL_OPTIONS } from '@/lib/types/auth/'

// ── ID normalisation ──────────────────────────────────────────────────────────

/**
 * Normalise a raw ID input: trim whitespace and uppercase the prefix.
 * e.g.  " stu-202400123 " → "STU-202400123"
 */
export function normaliseId(raw: string): string {
  return raw.trim().replace(/^(stu|fac|adm)-/i, (_, prefix: string) => `${prefix.toUpperCase()}-`)
}

/**
 * Derive the user role from a normalised ID prefix.
 * Returns null if the prefix is unrecognised.
 */
export function getRoleFromId(rawId: string): UserRole | null {
  const id = normaliseId(rawId)
  if (id.startsWith('STU-')) return 'student'
  if (id.startsWith('FAC-')) return 'faculty'
  if (id.startsWith('ADM-')) return 'admin'
  return null
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a student ID input.
 * Returns an error string, or null if valid.
 */
export function validateStudentIdInput(raw: string): string | null {
  const id = normaliseId(raw)
  if (!id) return 'Student ID is required.'
  if (!/^STU-\d{9}$/.test(id)) {
    return 'Invalid Student ID. Expected format: STU-YYYYNNNNN (e.g. STU-202400123).'
  }
  return null
}

/**
 * Validate a full name — must be at least two words.
 * Returns an error string, or null if valid.
 */
export function validateFullName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed)            return 'Full name is required.'
  if (trimmed.length < 2)  return 'Full name must be at least 2 characters.'
  if (!/\S+\s+\S+/.test(trimmed)) return 'Please enter your first and last name.'
  return null
}

/**
 * Validate an email address.
 * Returns an error string, or null if valid.
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Please enter a valid email address.'
  }
  return null
}

/**
 * Validate a year level selection.
 * Returns an error string, or null if valid.
 */
export function validateYearLevel(level: YearLevel | null): string | null {
  if (level === null) return 'Please select your year level.'
  return null
}

// ── Password strength ─────────────────────────────────────────────────────────

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | null

/**
 * Return a strength label for a password, or null if the password is empty.
 *
 * Scoring (cumulative):
 *   +1  length ≥ 8
 *   +1  contains a number
 *   +1  contains a special character
 *   +1  length ≥ 12
 *
 *   0   → null (empty)
 *   1   → 'weak'
 *   2   → 'fair'
 *   3   → 'good'
 *   4   → 'strong'
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return null

  let score = 0
  if (password.length >= 8)           score++
  if (/\d/.test(password))            score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (password.length >= 12)          score++

  const levels: PasswordStrength[] = [null, 'weak', 'fair', 'good', 'strong']
  return levels[score] ?? 'weak'
}

// ── Year level helpers ────────────────────────────────────────────────────────

/**
 * Return the display label for a year level, or '—' if null.
 */
export function getYearLabel(level: YearLevel | null): string {
  if (level === null) return '—'
  return YEAR_LEVEL_OPTIONS.find((y) => y.value === level)?.label ?? String(level)
}

// ── OTP formatting ────────────────────────────────────────────────────────────

/**
 * Join a split OTP code array into a single string for submission.
 */
export function formatOtpDisplay(code: string[]): string {
  return code.join('')
}

// ── Error message extraction ──────────────────────────────────────────────────

/**
 * Safely extract a human-readable message from any thrown value.
 * Handles Error instances, plain strings, and opaque objects.
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string' && err.trim()) return err
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  ) {
    return (err as Record<string, unknown>).message as string
  }
  return 'An unexpected error occurred. Please try again.'
}