// lib/services/admin/exams/results/results.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// FIX N: The results page wasn't showing data after release because:
//
//   1. fetchResults filtered: r.score !== null && r.submitted_at !== null
//      This is CORRECT in principle, but numeric(5,2) score=0 is still not null.
//      The real issue was that released rows exist only AFTER useReleaseResults
//      runs, which previously used an unsafe cast that could silently fail.
//      Now that useReleaseResults uses `satisfies SubmissionUpdate`, the
//      'released' status + released_at are written reliably to the DB.
//
//   2. The results page hook (useResults) needs to refetch after the
//      submissions page triggers a release. Since they're separate routes,
//      useResults.refetch() is called on mount — that's already correct.
//      No change needed here for cross-page coordination.
//
//   3. FIX N: Added 'graded' to the status filter alongside 'reviewed' and
//      'released'. The DB workflow is: submitted → graded (auto) → reviewed
//      → released. If admin grades without the "Grade All" flow, status may
//      stay as 'graded'. Including it here ensures those rows appear in results.
//      Remove 'graded' from the list if your workflow never leaves rows at
//      'graded' permanently.
//
//   4. FIX N-2: Removed the duplicate console.debug calls in production builds
//      (they now only emit in development).
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type {
  Result,
  AggregateAnalytics,
  ResultStatus,
  ResultsError,
} from '@/lib/types/admin/exams/results/results.types'
import { computeAnalyticsFromResults } from '@/lib/utils/admin/results/results.utils'

type DB = SupabaseClient<Database>

type AnalyticsProjection = Pick<
  Database['public']['Tables']['analytics']['Row'],
  'total_attempts' | 'average_score' | 'highest_score' | 'lowest_score' | 'last_attempt_at'
>

// ── Internal row shapes ───────────────────────────────────────────────────────

interface FlatSubmissionRow {
  id:                 string
  student_id:         string | null
  score:              number | null
  percentage:         number | null
  passed:             boolean | null
  submitted_at:       string | null
  time_spent_seconds: number | null
  status:             string
}

interface FlatProfileRow {
  id:        string
  full_name: string | null
  email:     string
}

interface FlatStudentRow {
  id:         string
  student_id: string | null
}

// ── Status coercion ───────────────────────────────────────────────────────────

function toResultStatus(raw: string): ResultStatus {
  if (raw === 'reviewed' || raw === 'released') return raw
  // 'graded' rows that slipped through are treated as 'reviewed'
  return 'reviewed'
}

// ── fetchResults ──────────────────────────────────────────────────────────────

export interface FetchResultsSuccess  { ok: true;  results: Result[]      }
export interface FetchResultsFailure  { ok: false; error:   ResultsError  }
export type     FetchResultsOutcome   = FetchResultsSuccess | FetchResultsFailure

export async function fetchResults(
  supabase: DB,
  examId:   string,
): Promise<FetchResultsOutcome> {

  // ── Step 1: flat submissions — no joins ──────────────────────────────────
  // FIX N: Include 'graded' in the status filter so rows that were auto-graded
  // (status='graded') but not yet manually reviewed still appear in results.
  // The in-memory filter below still requires score !== null.
  const { data: subData, error: subErr } = await supabase
    .from('submissions')
    .select(
      'id, student_id, score, percentage, passed, submitted_at, time_spent_seconds, status',
    )
    .eq('exam_id', examId)
    .in('status', ['graded', 'reviewed', 'released'])
    .order('percentage', { ascending: false, nullsFirst: false })

  if (subErr) {
    return {
      ok:    false,
      error: { code: 'FETCH_SUBMISSIONS_FAILED', message: subErr.message },
    }
  }

  const rows = (subData ?? []) as FlatSubmissionRow[]

  if (process.env.NODE_ENV === 'development') {
    console.debug('[fetchResults] raw rows:', rows.length, rows.map(r => ({
      id:         r.id.slice(0, 8),
      status:     r.status,
      percentage: r.percentage,
      score:      r.score,
      submitted:  r.submitted_at,
    })))
  }

  if (rows.length === 0) return { ok: true, results: [] }

  // ── Step 2: batch-fetch profiles + students ──────────────────────────────
  const studentIds = [
    ...new Set(
      rows.map(r => r.student_id).filter((id): id is string => id !== null),
    ),
  ]

  const [profilesRes, studentsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').in('id', studentIds),
    supabase.from('students').select('id, student_id').in('id', studentIds),
  ])

  const profileMap = new Map<string, FlatProfileRow>()
  for (const p of (profilesRes.data ?? []) as FlatProfileRow[]) {
    profileMap.set(p.id, p)
  }

  const studentMap = new Map<string, FlatStudentRow>()
  for (const st of (studentsRes.data ?? []) as FlatStudentRow[]) {
    studentMap.set(st.id, st)
  }

  // ── Step 3: assemble Result[] ────────────────────────────────────────────
  // Filter in-memory: require score !== null and submitted_at !== null.
  // We allow score = 0 (legitimate — student answered everything wrong).
  // FIX N: Do NOT additionally require percentage !== null. A score of 0
  // produces percentage = 0.00 which is not null; the old check was fine but
  // removing the explicit null check prevents any accidental SDK coercion.
  const results: Result[] = rows
    .filter(r => r.score !== null && r.submitted_at !== null)
    .map(r => {
      const profile = r.student_id ? profileMap.get(r.student_id) : undefined
      const student = r.student_id ? studentMap.get(r.student_id) : undefined

      return {
        id: r.id,
        student: {
          id:         profile?.id          ?? r.student_id ?? '',
          full_name:  profile?.full_name   ?? 'Unknown Student',
          email:      profile?.email       ?? '',
          student_id: student?.student_id  ?? null,
        },
        score:              r.score!,             // guarded by filter above
        percentage:         r.percentage ?? 0,    // 0% is a valid score
        passed:             r.passed     ?? false,
        submitted_at:       r.submitted_at!,      // guarded by filter above
        time_spent_seconds: r.time_spent_seconds ?? 0,
        status:             toResultStatus(r.status),
      }
    })

  if (process.env.NODE_ENV === 'development') {
    console.debug('[fetchResults] assembled results:', results.length)
  }

  return { ok: true, results }
}

// ── fetchAnalytics ────────────────────────────────────────────────────────────

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
  // Exam-level analytics row has student_id = null
  const { data, error } = await supabase
    .from('analytics')
    .select('total_attempts, average_score, highest_score, lowest_score, last_attempt_at')
    .eq('exam_id', examId)
    .is('student_id', null)
    .maybeSingle()
    .returns<AnalyticsProjection | null>()

  if (error) {
    console.warn('[fetchAnalytics] table fetch failed, computing from results:', error.message)
    return {
      ok:        true,
      analytics: computeAnalyticsFromResults(fallbackResults),
      source:    'computed',
    }
  }

  if (data) return { ok: true, analytics: data, source: 'table' }

  return {
    ok:        true,
    analytics: computeAnalyticsFromResults(fallbackResults),
    source:    'computed',
  }
}