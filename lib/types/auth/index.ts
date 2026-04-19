// lib/types/auth/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central auth type definitions.
// Signup is student-only. Faculty/admin are created out-of-band.
// ─────────────────────────────────────────────────────────────────────────────

// ── Roles ─────────────────────────────────────────────────────────────────────
export type UserRole = 'student' | 'faculty' | 'admin'

// ── ID prefixes ───────────────────────────────────────────────────────────────
export type StudentId = `STU-${string}`
export type FacultyId = `FAC-${string}`
export type AdminId   = `ADM-${string}`
export type AnyUserId = StudentId | FacultyId | AdminId

// ── Year level ────────────────────────────────────────────────────────────────
// 1–5 (some programs are 5 years, e.g. BSArch).
export type YearLevel = 1 | 2 | 3 | 4 | 5

export const YEAR_LEVEL_OPTIONS: { value: YearLevel; label: string }[] = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
  { value: 5, label: '5th Year' },
]

// ── Programs (9 supported) ────────────────────────────────────────────────────
export const PROGRAMS = [
  { value: 'BSPsych',   label: 'BS Psychology'                      },
  { value: 'BSID',      label: 'BS Interior Design'                  },
  { value: 'BLIS',      label: 'BS Library and Information Science'  },
  { value: 'BSArch',    label: 'BS Architecture'                     },
  { value: 'BSEd-MATH', label: 'BSEd – Mathematics'                  },
  { value: 'BSEd-SCI',  label: 'BSEd – Science'                      },
  { value: 'BSEd-ENG',  label: 'BSEd – English'                      },
  { value: 'BEEd',      label: 'Bachelor of Elementary Education'     },
  { value: 'BSEd-FIL',  label: 'BSEd – Filipino'                     },
] as const

export type ProgramCode = typeof PROGRAMS[number]['value']

// ── Signup steps (student only) ───────────────────────────────────────────────
// Step order: id → credentials → program → otp
// 'credentials' now includes full_name.
// 'program' now includes year_level alongside program selection.
export type SignupStep = 'id' | 'credentials' | 'program' | 'otp'

export interface SignupState {
  step:        SignupStep
  studentId:   string
  fullName:    string          // ← NEW: collected on credentials step
  email:       string
  password:    string
  programCode: ProgramCode | ''
  yearLevel:   YearLevel | null  // ← NEW: collected on program step
}

export const INITIAL_SIGNUP_STATE: SignupState = {
  step:        'id',
  studentId:   '',
  fullName:    '',
  email:       '',
  password:    '',
  programCode: '',
  yearLevel:   null,
}

// ── Login form ────────────────────────────────────────────────────────────────
export interface LoginForm {
  userId:   string   // any of student/faculty/admin ID
  password: string
}

// ── API response shapes ───────────────────────────────────────────────────────
export interface AuthSuccess {
  success:    true
  redirectTo: string
}

export interface AuthFailure {
  success: false
  error:   string
}

export type AuthResult = AuthSuccess | AuthFailure

// resolve-user-by-id response
export interface ResolveUserSuccess {
  found: true
  email: string
  role:  UserRole
}
export interface ResolveUserFailure {
  found: false
  error: string
}
export type ResolveUserResult = ResolveUserSuccess | ResolveUserFailure

// send-otp response
export interface SendOtpSuccess  { sent: true }
export interface SendOtpFailure  { sent: false; error: string }
export type SendOtpResult = SendOtpSuccess | SendOtpFailure

// verify-otp response
export interface VerifyOtpSuccess { verified: true;  redirectTo: string }
export interface VerifyOtpFailure { verified: false; error: string }
export type VerifyOtpResult = VerifyOtpSuccess | VerifyOtpFailure

// ── ID regex patterns ─────────────────────────────────────────────────────────
const STUDENT_ID_RE = /^STU-\d{4}\d{5}$/   // STU-YYYYNNNNN
const FACULTY_ID_RE = /^FAC-[A-Z0-9]{6,}$/
const ADMIN_ID_RE   = /^ADM-[A-Z0-9]{6,}$/

export function detectRole(id: string): UserRole | null {
  if (STUDENT_ID_RE.test(id)) return 'student'
  if (FACULTY_ID_RE.test(id)) return 'faculty'
  if (ADMIN_ID_RE.test(id))   return 'admin'
  return null
}

export function validateStudentId(id: string): string | null {
  if (!id.trim())                     return 'Student ID is required.'
  if (!STUDENT_ID_RE.test(id.trim())) return 'Format must be STU-YYYYNNNNN (e.g. STU-202400123).'
  return null
}

// ── Role → dashboard ──────────────────────────────────────────────────────────
export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  student: '/student/dashboard',
  faculty: '/admin/dashboard',
  admin:   '/admin/dashboard',
}