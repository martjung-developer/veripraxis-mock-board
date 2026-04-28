// lib/utils/auth/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure utility functions for auth — no side effects, no Supabase calls.
// ─────────────────────────────────────────────────────────────────────────────

import type { UserRole, ProgramCode, YearLevel } from '@/lib/types/auth/'
import { PROGRAMS, YEAR_LEVEL_OPTIONS, detectRole } from '@/lib/types/auth/'

// ── ID normalisation ──────────────────────────────────────────────────────────

export function normaliseId(raw: string): string {
  return raw.trim().toUpperCase()
}

// ── Role detection ────────────────────────────────────────────────────────────

export function getRoleFromId(rawId: string): UserRole | null {
  return detectRole(normaliseId(rawId))
}

// ── Student ID validation ─────────────────────────────────────────────────────

export function validateStudentIdInput(id: string): string | null {
  const norm = normaliseId(id)
  if (!norm) {return 'Student ID is required.'}
  if (!/^STU-\d{9}$/.test(norm)) {return 'Format: STU-YYYYNNNNN  (e.g. STU-202400123)'}
  return null
}

// ── Phone validation (optional field) ────────────────────────────────────────
// Only validates format when a non-empty value is provided.
// PH mobile: 09XXXXXXXXX (11 digits) or +639XXXXXXXXX (12 digits with country code)

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) {return null}   // optional — skip validation when empty
  if (!/^(\+?63|0)9\d{9}$/.test(trimmed)) {
    return 'Enter a valid PH mobile number: 09XXXXXXXXX or +639XXXXXXXXX'
  }
  return null
}

// ── Full name validation ──────────────────────────────────────────────────────

export function validateFullName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed)          {return 'Full name is required.'}
  if (trimmed.length < 2) {return 'Full name must be at least 2 characters.'}
  // Must contain at least two words (first + last name)
  if (!/\S+\s+\S+/.test(trimmed)) {return 'Please enter your first and last name.'}
  return null
}

// ── Email validation ──────────────────────────────────────────────────────────

export function validateEmail(email: string): string | null {
  if (!email.trim()) {return 'Email is required.'}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {return 'Enter a valid email address.'}
  return null
}

// ── Year level validation ─────────────────────────────────────────────────────

export function validateYearLevel(level: YearLevel | null): string | null {
  if (level === null) {return 'Please select your year level.'}
  return null
}

// ── Password strength ─────────────────────────────────────────────────────────

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

export function getPasswordStrength(pw: string): PasswordStrength | null {
  if (!pw) {return null}
  if (pw.length < 6)  {return 'weak'}
  if (pw.length < 10) {return 'fair'}
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) {return 'strong'}
  return 'good'
}

// ── Program helpers ───────────────────────────────────────────────────────────

export function isProgramCode(value: string): value is ProgramCode {
  return PROGRAMS.some((p) => p.value === value)
}

export function getProgramLabel(code: ProgramCode): string {
  return PROGRAMS.find((p) => p.value === code)?.label ?? code
}

// ── Year level helpers ────────────────────────────────────────────────────────

export function getYearLabel(level: YearLevel | null): string {
  if (level === null) {return '—'}
  return YEAR_LEVEL_OPTIONS.find((y) => y.value === level)?.label ?? String(level)
}

// ── OTP formatting ────────────────────────────────────────────────────────────

export function formatOtpDisplay(code: string[]): string {
  return code.join('')
}

// ── Error extraction ──────────────────────────────────────────────────────────

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {return err.message}
  if (typeof err === 'string') {return err}
  return 'An unexpected error occurred.'
}