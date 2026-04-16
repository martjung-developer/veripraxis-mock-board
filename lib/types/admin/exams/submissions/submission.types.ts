// lib/types/admin/exams/submissions/submission.types.ts
import type { Database } from '@/lib/types/database'

// ── Supabase row aliases ──────────────────────────────────────────────────────
export type SubmissionRow    = Database['public']['Tables']['submissions']['Row']
export type SubmissionUpdate = Database['public']['Tables']['submissions']['Update']

// ── Domain status ─────────────────────────────────────────────────────────────
// Extends the DB enum with UI-only states 'reviewed' | 'released'
// NOTE: Add these to the DB CHECK constraint + SubmissionStatus enum in database.ts:
//   CHECK (status = ANY (ARRAY['in_progress','submitted','graded','reviewed','released']))
export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded' | 'reviewed' | 'released'

export type GradingMode = 'auto' | 'manual'

// ── Normalised UI shape ───────────────────────────────────────────────────────
export interface StudentInfo {
  id:         string
  full_name:  string
  email:      string
  student_id: string | null
}

export interface Submission {
  id:                 string
  student:            StudentInfo
  started_at:         string
  submitted_at:       string | null
  time_spent_seconds: number | null
  status:             SubmissionStatus
  score:              number | null
  percentage:         number | null
  passed:             boolean | null
}

// ── Raw Supabase join shape ───────────────────────────────────────────────────
// Supabase returns joined rows as object OR array depending on cardinality.
// We capture both via union so we can unwrap safely without casting.
export interface SubmissionRaw {
  id:                 string
  student_id:         string | null
  started_at:         string
  submitted_at:       string | null
  time_spent_seconds: number | null
  status:             string
  score:              number | null
  percentage:         number | null
  passed:             boolean | null
  profiles:
    | { id: string; full_name: string | null; email: string }
    | { id: string; full_name: string | null; email: string }[]
    | null
  students:
    | { student_id: string | null }
    | { student_id: string | null }[]
    | null
}

// ── Service result ────────────────────────────────────────────────────────────
export interface ServiceResult<T = void> {
  data:  T | null
  error: string | null
}

// ── Typed error ───────────────────────────────────────────────────────────────
export type AppError =
  | { kind: 'network';    message: string }
  | { kind: 'not_found';  message: string }
  | { kind: 'permission'; message: string }
  | { kind: 'unknown';    message: string }

export function toAppError(err: unknown): AppError {
  if (err instanceof Error) return { kind: 'unknown', message: err.message }
  return { kind: 'unknown', message: String(err) }
}