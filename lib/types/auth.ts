// lib/types/auth.ts

export type UserRole = 'student' | 'admin' | 'faculty'

export interface Profile {
  id:         string
  email:      string
  full_name:  string | null
  role:       UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface StudentProfile extends Profile {
  student_id:  string | null
  school:      string | null
  year_level:  number | null
  target_exam: string | null
  program_id:  string | null
  school_id:   string | null
}

export interface AuthUser {
  id:      string
  email:   string | undefined
  profile: Profile | null
}

// ── Role helpers ─────────────────────────────────────────

// ✅ Treat faculty as admin (since you said they are the same)
export const isStudent = (role: UserRole) => role === 'student'
export const isFaculty = (role: UserRole) => role === 'faculty'
export const isAdmin   = (role: UserRole) => role === 'admin' || role === 'faculty'

// Permissions
export const canTakeExams = (role: UserRole) =>
  role === 'student'

export const canManageContent = (role: UserRole) =>
  role === 'admin' || role === 'faculty'

// ✅ FIXED: Correct dashboard routing
export function getDashboardByRole(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'faculty': // 🔥 both go to admin dashboard
      return '/admin/dashboard'

    case 'student':
      return '/student/dashboard'

    default:
      return '/login'
  }
}

// ── Signup roles (UI only) ───────────────────────────────

// Keep faculty (so existing system doesn’t break)
export type SignupRole = Extract<UserRole, 'student' | 'faculty'>

export const SIGNUP_ROLES: {
  value: SignupRole
  label: string
  description: string
}[] = [
  {
    value: 'student',
    label: 'Student',
    description: 'Taking mock board exams to prepare for PRC licensure',
  },
  {
    value: 'faculty',
    label: 'Admin',
    description: 'Managing question banks and review materials',
  },
]