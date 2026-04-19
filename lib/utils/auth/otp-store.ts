// lib/utils/otp-store.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server-side in-memory OTP store.
// In production, replace with Redis or a DB table for multi-instance support.
// ─────────────────────────────────────────────────────────────────────────────

import { OTP_EXPIRY_SECONDS } from '@/lib/constants/auth'

interface OtpEntry {
  hash:      string   // bcrypt hash of the OTP
  expiresAt: number   // Unix ms
  attempts:  number
}

const MAX_ATTEMPTS = 5

// Module-level map persists across requests in the same Node.js process.
const store = new Map<string, OtpEntry>()

function key(email: string) {
  return email.toLowerCase().trim()
}

export function storeOtp(email: string, hashedOtp: string): void {
  store.set(key(email), {
    hash:      hashedOtp,
    expiresAt: Date.now() + OTP_EXPIRY_SECONDS * 1000,
    attempts:  0,
  })
}

/** Returns 'ok' | 'invalid' | 'expired' | 'too_many_attempts' */
export function consumeOtp(
  email: string,
  match: (hash: string) => boolean,
): 'ok' | 'invalid' | 'expired' | 'too_many_attempts' {
  const entry = store.get(key(email))
  if (!entry) return 'invalid'

  if (Date.now() > entry.expiresAt) {
    store.delete(key(email))
    return 'expired'
  }

  if (entry.attempts >= MAX_ATTEMPTS) return 'too_many_attempts'

  if (!match(entry.hash)) {
    entry.attempts += 1
    return 'invalid'
  }

  store.delete(key(email))
  return 'ok'
}

export function clearOtp(email: string): void {
  store.delete(key(email))
}