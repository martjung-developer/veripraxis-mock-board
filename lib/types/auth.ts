// lib/types/auth.ts
import type { UserRole } from './database'
export type { UserRole }

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

// ── Role helpers ──────────────────────────────────────────────────────────────

export const isStudent        = (role: UserRole) => role === 'student'
export const isFaculty        = (role: UserRole) => role === 'faculty'
export const isAdmin          = (role: UserRole) => role === 'admin'
export const canTakeExams     = (role: UserRole) => role === 'student' || role === 'faculty'
export const canManageContent = (role: UserRole) => role === 'faculty' || role === 'admin'

export function getDashboardByRole(role: UserRole): string {
  switch (role) {
    case 'admin':   return '/faculty/dashboard' 
    case 'faculty': return '/faculty/dashboard'
    case 'student': return '/student/dashboard'
  }
}

// Signup form shows only Student and Faculty
export type SignupRole = Extract<UserRole, 'student' | 'faculty'>

export const SIGNUP_ROLES: { value: SignupRole; label: string; description: string }[] = [
  {
    value:       'student',
    label:       'Student',
    description: 'Taking mock board exams to prepare for PRC licensure',
  },
  {
    value:       'faculty',
    label:       'Faculty',
    description: 'Managing question banks and review materials',
  },
]