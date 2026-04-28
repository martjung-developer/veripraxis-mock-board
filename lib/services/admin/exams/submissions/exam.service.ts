// lib/services/admin/exams/submissions/exam.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Supabase calls for exam metadata used in the submissions/grading flow.
// All `as any` and unsafe casts have been removed now that database.ts
// correctly types grading_mode, allowed_programs, and allowed_year_levels
// on the exams table.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type { GradingMode }    from '@/lib/types/database'
import type { ServiceResult }  from '@/lib/types/admin/exams/submissions/submission.types'
import type { ExamInfo }       from '@/lib/types/admin/exams/submissions/exam.types'
export { validateExamAccess } from '@/lib/services/admin/exams/submissions/submission.service'

type PublicSchema = Database['public']
type ExamsRow     = PublicSchema['Tables']['exams']['Row']
type ExamsUpdate  = PublicSchema['Tables']['exams']['Update']
type DB           = SupabaseClient<Database>

function ok<T>(data: T): ServiceResult<T>             { return { data, error: null } }
function err<T = void>(msg: string): ServiceResult<T> { return { data: null, error: msg } }

// ── getExamAccessConstraints ──────────────────────────────────────────────────
export async function getExamAccessConstraints(
  supabase: DB,
  examId:   string,
): Promise<ServiceResult<{ allowed_programs: string[] | null; allowed_year_levels: number[] | null }>> {
  const { data, error } = await supabase
    .from('exams')
    .select('allowed_programs,allowed_year_levels')
    .eq('id', examId)
    .single<Pick<ExamsRow, 'allowed_programs' | 'allowed_year_levels'>>()

  if (error || !data) {return err(error?.message ?? 'Exam not found')}

  const exam = data

  return ok({
    allowed_programs:    exam.allowed_programs    ?? null,
    allowed_year_levels: exam.allowed_year_levels ?? null,
  })
}

// ── getExamInfo ───────────────────────────────────────────────────────────────
// Fetches passing_score, total_points, and grading_mode.
// grading_mode is now correctly typed as GradingMode in database.ts,
// so no unsafe cast or `as typeof data & { grading_mode? }` is needed.

export async function getExamInfo(
  supabase: DB,
  examId:   string,
): Promise<ServiceResult<ExamInfo>> {
  const { data, error } = await supabase
    .from('exams')
    .select('passing_score,total_points,grading_mode')
    .eq('id', examId)
    .single<Pick<ExamsRow, 'passing_score' | 'total_points' | 'grading_mode'>>()

  if (error || !data) {return err(error?.message ?? 'Exam not found')}

  const exam = data
  const mode: GradingMode = exam.grading_mode ?? 'auto'

  return ok<ExamInfo>({
    passing_score: exam.passing_score,
    total_points:  exam.total_points,
    grading_mode:  mode,
  })
}

// ── updateGradingMode ─────────────────────────────────────────────────────────
// Uses the Database-derived Update type — no `as Record<string, unknown>` needed.

export async function updateGradingMode(
  supabase: DB,
  examId:   string,
  mode:     GradingMode,
): Promise<ServiceResult> {
  const { error } = await supabase
    .from('exams')
    .update({ grading_mode: mode } satisfies ExamsUpdate)
    .eq('id', examId)

  return error ? err(error.message) : ok(undefined)
}