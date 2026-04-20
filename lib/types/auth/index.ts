// lib/types/auth/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// All shared types, constants, and config consumed by auth pages, services,
// utilities, and API routes. Single source of truth — import from here only.
// ─────────────────────────────────────────────────────────────────────────────

// ── Roles ─────────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'faculty' | 'admin'

// ── ID types & prefixes ───────────────────────────────────────────────────────
// Student IDs: STU-YYYYNNNNN  (e.g. STU-202400123)
// Faculty IDs: FAC-XXXXXXXX
// Admin IDs:   ADM-XXXXXXXX

export type StudentId = `STU-${string}`
export type FacultyId = `FAC-${string}`
export type AdminId   = `ADM-${string}`
export type AnyUserId = StudentId | FacultyId | AdminId

// ── Role → dashboard path ─────────────────────────────────────────────────────

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  student: '/student/dashboard',
  faculty: '/admin/dashboard',
  admin:   '/admin/dashboard',
}

// ── Programs ──────────────────────────────────────────────────────────────────

export const PROGRAM_CODES = [
  'BSPSYCH',  // Bachelor of Science in Psychology
  'BSEd-MATH', // Bachelor of Secondary Education, major in Mathematics
  'BSEd-SCI', // Bachelor of Secondary Education, major in Science
  'BSEd-ENG', // Bachelor of Secondary Education, major in English
  'BSEd-FIL', // Bachelor of Secondary Education, major in Filipino
  'BEEd',     // Bachelor of Elementary Education
  'BSARCH',  // Bachelor of Science in Architecture
  'BSID',    // Bachelor of Science in Interior Design
  'BLIS',    // Bachelor of Library and Information Science
] as const

export type ProgramCode = typeof PROGRAM_CODES[number]

const PROGRAM_LABELS: Record<ProgramCode, string> = {
  BSPSYCH: 'Bachelor of Science in Psychology',
  'BSEd-MATH': 'Bachelor of Secondary Education, major in Mathematics',
  'BSEd-SCI': 'Bachelor of Secondary Education, major in Science',
  'BSEd-ENG': 'Bachelor of Secondary Education, major in English',
  'BSEd-FIL': 'Bachelor of Secondary Education, major in Filipino',
  BEEd:     'Bachelor of Elementary Education',
  BSARCH:  'Bachelor of Science in Architecture',
  BSID:    'Bachelor of Science in Interior Design',
  BLIS:    'Bachelor of Library and Information Science',
}

export const PROGRAMS: Array<{ value: ProgramCode; label: string }> =
  PROGRAM_CODES.map((code) => ({ value: code, label: PROGRAM_LABELS[code] }))

export function getProgramLabel(code: ProgramCode): string {
  return PROGRAM_LABELS[code]
}

export function isProgramCode(value: unknown): value is ProgramCode {
  return typeof value === 'string' && (PROGRAM_CODES as readonly string[]).includes(value)
}

// ── Year levels ───────────────────────────────────────────────────────────────

export const YEAR_LEVEL_OPTIONS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: '5th' },
] as const

export type YearLevel = typeof YEAR_LEVEL_OPTIONS[number]['value']  // 1 | 2 | 3 | 4 | 5

// ── Signup multi-step state ───────────────────────────────────────────────────

export type SignupStep = 'id' | 'credentials' | 'program' | 'otp'

export interface SignupState {
  step:        SignupStep
  studentId:   string
  fullName:    string
  email:       string
  password:    string
  programCode: ProgramCode | ''
  yearLevel:   YearLevel   | null
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

// ── Student ID validation ─────────────────────────────────────────────────────

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

// ── API result types ──────────────────────────────────────────────────────────

/** Returned by POST /api/auth/resolve-user-by-id */
export interface ResolveUserSuccess { found: true;  email: string; role: UserRole }
export interface ResolveUserFailure { found: false; error: string }
export type ResolveUserResult = ResolveUserSuccess | ResolveUserFailure

/** Returned by POST /api/auth/send-otp */
export interface SendOtpSuccess { sent: true }
export interface SendOtpFailure { sent: false; error: string }
export type SendOtpResult = SendOtpSuccess | SendOtpFailure

/** Returned by POST /api/auth/verify-otp */
export interface VerifyOtpSuccess { verified: true;  redirectTo: string }
export interface VerifyOtpFailure { verified: false; error: string }
export type VerifyOtpResult = VerifyOtpSuccess | VerifyOtpFailure

// ── Service result types (client-side services) ───────────────────────────────

export interface AuthSuccess { success: true;  redirectTo: string }
export interface AuthFailure { success: false; error: string }
export type AuthResult = AuthSuccess | AuthFailure

export interface SignInResult { success: true;  redirectTo: string }
export interface SignInError  { success: false; error: string }
export type AuthServiceResult = SignInResult | SignInError

export interface SignUpResult { success: true }
export interface SignUpError  { success: false; error: string }
export type SignUpServiceResult = SignUpResult | SignUpError