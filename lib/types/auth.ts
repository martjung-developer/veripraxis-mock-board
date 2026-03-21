// lib/types/auth.ts
//
// Role clarification:
//   DB role 'student'  → regular student taking exams
//   DB role 'reviewer' → faculty member; manages question bank,
//                        also takes exams like a student
//   DB role 'admin'    → platform administrator
//
// 'faculty' is NOT a DB role — faculty are stored as 'reviewer' in profiles.
// Use isFaculty() helper to check if a reviewer has faculty-level permissions.

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

// Profile + student-specific fields (for students AND reviewers)
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

/** Student taking mock exams */
export const isStudent  = (role: UserRole) => role === 'student'

/** Faculty member — stored as 'reviewer', manages question bank */
export const isFaculty  = (role: UserRole) => role === 'reviewer'

/** Platform admin */
export const isAdmin    = (role: UserRole) => role === 'admin'

/** Both students and reviewers can take exams */
export const canTakeExams = (role: UserRole) => role === 'student' || role === 'reviewer'

/** Only reviewers (faculty) and admins can manage questions/exams */
export const canManageContent = (role: UserRole) => role === 'reviewer' || role === 'admin'

/** Dashboard route per role */
export function getDashboardByRole(role: UserRole): string {
  switch (role) {
    case 'admin':    return '/admin'
    case 'reviewer': return '/faculty'   // faculty dashboard
    case 'student':  return '/dashboard' // student dashboard
  }
}

// Signup form only shows these two options
export type SignupRole = Extract<UserRole, 'student' | 'reviewer'>

export const SIGNUP_ROLES: { value: SignupRole; label: string; description: string }[] = [
  {
    value:       'student',
    label:       'Student',
    description: 'Taking mock board exams to prepare for PRC licensure',
  },
  {
    value:       'reviewer',
    label:       'Faculty',
    description: 'Managing question banks and review materials',
  },
]