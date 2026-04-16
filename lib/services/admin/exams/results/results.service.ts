// lib/services/admin/exams/results/results.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// All Supabase I/O for the exam results feature.
// Rules:
//  • Every query uses .returns<T>() for compile-time safety.
//  • Transformers live here — they own raw → domain mapping.
//  • Returns domain types + typed errors, never raw rows.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type {
  Result,
  RawResultRow,
  AggregateAnalytics,
  ResultStatus,
  ResultsError,
} from '@/lib/types/admin/exams/results/results.types'
import {
  unwrapProfile,
  unwrapStudent,
  computeAnalyticsFromResults,
} from '@/lib/utils/admin/results/results.utils'

type DB = SupabaseClient<Database>

// Columns we select from analytics
type AnalyticsProjection = Pick<
  Database['public']['Tables']['analytics']['Row'],
  'total_attempts' | 'average_score' | 'highest_score' | 'lowest_score' | 'last_attempt_at'
>

// ── toResultStatus ────────────────────────────────────────────────────────────
// The DB stores status as a plain string (the SubmissionStatus enum doesn't
// include 'reviewed'/'released' yet). This coerces safely.
function toResultStatus(raw: string): ResultStatus {
  if (raw === 'reviewed' || raw === 'released') return raw
  // Defensive: if an unexpected status slips through, treat as reviewed
  return 'reviewed'
}

// ── toResult ──────────────────────────────────────────────────────────────────
function toResult(row: RawResultRow): Result | null {
  // Both percentage and submitted_at must be present to be a valid result
  if (row.percentage == null || row.submitted_at == null) return null

  const profile = unwrapProfile(row.profiles)
  const student = unwrapStudent(row.students)

  return {
    id: row.id,
    student: {
      id:         profile?.id         ?? row.student_id ?? '',
      full_name:  profile?.full_name  ?? 'Unknown Student',
      email:      profile?.email      ?? '',
      student_id: student?.student_id ?? null,
    },
    score:              row.score              ?? 0,
    percentage:         row.percentage,
    passed:             row.passed             ?? false,
    submitted_at:       row.submitted_at,
    time_spent_seconds: row.time_spent_seconds ?? 0,
    status:             toResultStatus(row.status),
  }
}

// ── fetchResults ──────────────────────────────────────────────────────────────

export interface FetchResultsSuccess {
  ok:      true
  results: Result[]
}
export interface FetchResultsFailure {
  ok:    false
  error: ResultsError
}
export type FetchResultsOutcome = FetchResultsSuccess | FetchResultsFailure

export async function fetchResults(
  supabase: DB,
  examId:   string,
): Promise<FetchResultsOutcome> {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id, student_id, score, percentage, passed,
      submitted_at, time_spent_seconds, status,
      profiles:student_id ( id, full_name, email ),
      students:student_id ( student_id )
    `)
    .eq('exam_id', examId)
    .in('status', ['reviewed', 'released'])
    .not('percentage', 'is', null)
    .order('percentage', { ascending: false })
    .returns<RawResultRow[]>()

  if (error) {
    return {
      ok:    false,
      error: { code: 'FETCH_SUBMISSIONS_FAILED', message: error.message },
    }
  }

  const results = (data ?? [])
    .map(toResult)
    .filter((r): r is Result => r !== null)

  return { ok: true, results }
}

// ── fetchAnalytics ────────────────────────────────────────────────────────────
// Tries the analytics table first; falls back to computing from results.

export interface FetchAnalyticsSuccess {
  ok:        true
  analytics: AggregateAnalytics | null
  source:    'table' | 'computed'
}
export interface FetchAnalyticsFailure {
  ok:    false
  error: ResultsError
}
export type FetchAnalyticsOutcome = FetchAnalyticsSuccess | FetchAnalyticsFailure

export async function fetchAnalytics(
  supabase:        DB,
  examId:          string,
  fallbackResults: Result[],
): Promise<FetchAnalyticsOutcome> {
  const { data, error } = await supabase
    .from('analytics')
    .select('total_attempts, average_score, highest_score, lowest_score, last_attempt_at')
    .eq('exam_id', examId)
    .is('student_id', null)
    .maybeSingle()
    .returns<AnalyticsProjection | null>()

  if (error) {
    // Non-fatal: fall back to computing from the results we already have
    return {
      ok:        true,
      analytics: computeAnalyticsFromResults(fallbackResults),
      source:    'computed',
    }
  }

  if (data) {
    return { ok: true, analytics: data, source: 'table' }
  }

  return {
    ok:        true,
    analytics: computeAnalyticsFromResults(fallbackResults),
    source:    'computed',
  }
}