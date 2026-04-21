// lib/types/admin/exams/submissions/submission.types.ts

import type { Database } from '@/lib/types/database'

// ── Re-export GradingMode from the canonical source ───────────────────────────
export type { GradingMode } from '@/lib/types/database'

// ── SubmissionStatus ──────────────────────────────────────────────────────────
export type SubmissionStatus = Database['public']['Enums']['submission_status']

// ── Service result wrapper ────────────────────────────────────────────────────
export type ServiceResult<T = void> =
  | { data: T;    error: null   }
  | { data: null; error: string }

export interface RawProfileJoin {
  id:        string
  full_name: string | null
  email:     string
}

export interface RawStudentJoin {
  student_id: string | null   // the TEXT "STU-YYYYNNNNN" code
  year_level: number | null
  profiles:   RawProfileJoin | RawProfileJoin[] | null
}

export interface SubmissionRaw {
  id:                 string
  student_id:         string | null   // UUID FK → students.id
  started_at:         string
  submitted_at:       string | null
  time_spent_seconds: number | null
  status:             string          // narrowed to SubmissionStatus in the mapper
  score:              number | null
  percentage:         number | null
  passed:             boolean | null
  // Supabase returns this as a single object or array — unwrap in the mapper
  students:           RawStudentJoin | RawStudentJoin[] | null
}

// ── UI-facing domain model ────────────────────────────────────────────────────

export interface StudentSummary {
  id:         string          // profiles.id (= students.id = submissions.student_id UUID)
  full_name:  string          // profiles.full_name ?? 'Unknown Student'
  email:      string          // profiles.email
  student_id: string | null   // students.student_id TEXT, e.g. "STU-202400001"
}

export interface Submission {
  id:                 string
  student:            StudentSummary
  started_at:         string
  submitted_at:       string | null
  time_spent_seconds: number | null
  status:             SubmissionStatus
  score:              number | null
  percentage:         number | null
  passed:             boolean | null
}