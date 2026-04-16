// lib/types/admin/exams/results/results.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All domain shapes for the exam results feature.
// Every field is derived from Database['public']['Tables'][...]['Row'].
// No `any`, no `unknown`, no manual casts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Database } from '@/lib/types/database'

// ── DB row aliases ────────────────────────────────────────────────────────────
type SubmissionRow = Database['public']['Tables']['submissions']['Row']
type ProfileRow    = Database['public']['Tables']['profiles']['Row']
type StudentRow    = Database['public']['Tables']['students']['Row']
type AnalyticsRow  = Database['public']['Tables']['analytics']['Row']

// ── ResultStatus — narrower than SubmissionStatus ────────────────────────────
// The results page is read-only and only shows reviewed/released submissions.
// Note: 'reviewed' and 'released' are app-level statuses not yet in the DB
// enum (which currently only has 'in_progress' | 'submitted' | 'graded').
// They are stored as plain strings in the status column.
// See database.ts SubmissionStatus for the full story.
export type ResultStatus = 'reviewed' | 'released'

// ── Raw Supabase join shapes ──────────────────────────────────────────────────
// Supabase returns FK-joined rows as `T | T[] | null`.
// We model both sides to narrow safely in transformers — no `as unknown`.

export type RawProfileJoin =
  | Pick<ProfileRow, 'id' | 'full_name' | 'email'>
  | Pick<ProfileRow, 'id' | 'full_name' | 'email'>[]
  | null

export type RawStudentJoin =
  | Pick<StudentRow, 'student_id'>
  | Pick<StudentRow, 'student_id'>[]
  | null

// The exact shape returned by the submission join query
export interface RawResultRow {
  id:                 string
  student_id:         SubmissionRow['student_id']           // string | null
  score:              SubmissionRow['score']                 // number | null
  percentage:         SubmissionRow['percentage']            // number | null
  passed:             SubmissionRow['passed']                // boolean | null
  submitted_at:       SubmissionRow['submitted_at']          // string | null
  time_spent_seconds: SubmissionRow['time_spent_seconds']    // number | null
  status:             string                                 // stored as string in DB
  profiles:           RawProfileJoin
  students:           RawStudentJoin
}

// ── Application-level Result (post-transform) ─────────────────────────────────
export interface StudentSummary {
  id:         string
  full_name:  string
  email:      string
  student_id: string | null
}

export interface Result {
  id:                 string
  student:            StudentSummary
  score:              number
  percentage:         number
  passed:             boolean
  submitted_at:       string
  time_spent_seconds: number
  status:             ResultStatus
}

// ── Aggregate Analytics ───────────────────────────────────────────────────────
// Subset of analytics Row columns we actually use.
export type AggregateAnalytics = Pick<
  AnalyticsRow,
  'total_attempts' | 'average_score' | 'highest_score' | 'lowest_score' | 'last_attempt_at'
>

// ── Filter state ──────────────────────────────────────────────────────────────
export type PassFilter   = 'all' | 'passed' | 'failed'
export type StatusFilter = ResultStatus | 'all'

export interface ResultFilters {
  search:       string
  passFilter:   PassFilter
  statusFilter: StatusFilter
}

export const INITIAL_FILTERS: ResultFilters = {
  search:       '',
  passFilter:   'all',
  statusFilter: 'all',
}

// ── Derived summary counts (computed from results array) ──────────────────────
export interface ResultSummary {
  total:    number
  passing:  number
  failing:  number
  passRate: number
  released: number
  reviewed: number
}

// ── Typed application error ───────────────────────────────────────────────────
export type ResultsErrorCode =
  | 'FETCH_SUBMISSIONS_FAILED'
  | 'FETCH_ANALYTICS_FAILED'

export interface ResultsError {
  code:    ResultsErrorCode
  message: string
}