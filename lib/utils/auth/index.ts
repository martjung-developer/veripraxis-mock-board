// lib/utils/auth/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure utility functions for auth — no side effects, no Supabase calls.
// ─────────────────────────────────────────────────────────────────────────────

import type { UserRole, ProgramCode, YearLevel } from '@/lib/types/auth/index'
import { PROGRAMS, detectRole, YEAR_LEVEL_OPTIONS } from '@/lib/types/auth/index'

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
  if (!norm)                      return 'Student ID is required.'
  if (!/^STU-\d{9}$/.test(norm)) return 'Format: STU-YYYYNNNNN  (e.g. STU-202400123)'
  return null
}

// ── Full name validation ───────────────────────────────────────────────────────

export function validateFullName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed)          return 'Full name is required.'
  if (trimmed.length < 2) return 'Name must be at least 2 characters.'
  if (trimmed.length > 100) return 'Name must be 100 characters or fewer.'
  // At least two words (first + last name)
  if (!/\S+\s+\S+/.test(trimmed)) return 'Please enter your first and last name.'
  return null
}

// ── Year level validation ─────────────────────────────────────────────────────

export function validateYearLevel(level: YearLevel | null): string | null {
  if (!level) return 'Please select your year level.'
  if (![1, 2, 3, 4, 5].includes(level)) return 'Invalid year level.'
  return null
}

// ── Email validation ──────────────────────────────────────────────────────────

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
  return null
}

// ── Password strength ─────────────────────────────────────────────────────────

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

export function getPasswordStrength(pw: string): PasswordStrength | null {
  if (!pw)            return null
  if (pw.length < 6)  return 'weak'
  if (pw.length < 10) return 'fair'
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 'strong'
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
  if (!level) return '—'
  return YEAR_LEVEL_OPTIONS.find((y) => y.value === level)?.label ?? `Year ${level}`
}

export function isYearLevel(value: number): value is YearLevel {
  return [1, 2, 3, 4, 5].includes(value)
}

// ── OTP formatting ────────────────────────────────────────────────────────────

export function formatOtpDisplay(code: string[]): string {
  return code.join('')
}

// ── Error extraction ──────────────────────────────────────────────────────────

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'An unexpected error occurred.'
}