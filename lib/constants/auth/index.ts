// lib/constants/auth/index.ts

export const AUTH_ERRORS = {
  ID_NOT_FOUND:    'No account found for this ID. Check your student/faculty/admin ID.',
  WRONG_PASSWORD:  'Incorrect password.',
  ACCOUNT_DISABLED:'This account has been deactivated. Contact your administrator.',
  OTP_EXPIRED:     'Verification code has expired. Please request a new one.',
  OTP_INVALID:     'Invalid verification code.',
  NETWORK:         'Network error. Please try again.',
  UNKNOWN:         'An unexpected error occurred.',
} as const

export type AuthErrorKey = keyof typeof AUTH_ERRORS

// Redirect destinations after login
export const POST_LOGIN: Record<string, string> = {
  student: '/student/dashboard',
  faculty: '/admin/dashboard',
  admin:   '/admin/dashboard',
}

// OTP expiry in seconds
export const OTP_EXPIRY_SECONDS = 600   // 10 minutes
export const OTP_RESEND_COOLDOWN = 60   // 1 minute
export const OTP_LENGTH = 6