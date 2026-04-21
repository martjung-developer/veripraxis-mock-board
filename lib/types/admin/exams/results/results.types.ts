// lib/types/admin/exams/results/results.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All domain shapes for the exam results feature.
// RawProfileJoin / RawStudentJoin have been removed — the service layer now
// uses a two-step flat fetch (no FK joins) to avoid the PostgREST ambiguity
// error: "column students_1.full_name does not exist".
// ─────────────────────────────────────────────────────────────────────────────

import type { Database } from '@/lib/types/database'

// ── DB row aliases ────────────────────────────────────────────────────────────
type SubmissionRow = Database['public']['Tables']['submissions']['Row']
type AnalyticsRow  = Database['public']['Tables']['analytics']['Row']

// ── ResultStatus — narrower than SubmissionStatus ────────────────────────────
export type ResultStatus = 'reviewed' | 'released'

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

// ── Derived summary counts ────────────────────────────────────────────────────
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