// lib/services/admin/exams/submissions/exam.service.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type { ServiceResult }  from '@/lib/types/admin/exams/submissions/submission.types'
import type { ExamInfo }       from '@/lib/types/admin/exams/submissions/exam.types'
import type { GradingMode }    from '@/lib/types/admin/exams/submissions/submission.types'

type DB = SupabaseClient<Database>

function ok<T>(data: T): ServiceResult<T>          { return { data, error: null } }
function err<T = void>(msg: string): ServiceResult<T> { return { data: null, error: msg } }

export async function getExamInfo(
  supabase: DB,
  examId:   string,
): Promise<ServiceResult<ExamInfo>> {
  const { data, error } = await supabase
    .from('exams')
    .select('passing_score, total_points, grading_mode')
    .eq('id', examId)
    .single()

  if (error || !data) return err(error?.message ?? 'Exam not found')

  // grading_mode is a non-standard column added via migration — it may be absent
  // on older schemas. We cast via a record check so we don't get a TS error on
  // the generated `exams` Row type that doesn't include it yet.
  const row = data as typeof data & { grading_mode?: string | null }
  const mode: GradingMode =
    row.grading_mode === 'manual' ? 'manual' : 'auto'

  return ok<ExamInfo>({
    passing_score: data.passing_score,
    total_points:  data.total_points,
    grading_mode:  mode,
  })
}

export async function updateGradingMode(
  supabase: DB,
  examId:   string,
  mode:     GradingMode,
): Promise<ServiceResult> {
  // grading_mode column requires migration:
  // ALTER TABLE exams ADD COLUMN IF NOT EXISTS grading_mode text NOT NULL DEFAULT 'auto'
  //   CHECK (grading_mode IN ('auto','manual'));
  const { error } = await supabase
    .from('exams')
    .update({ grading_mode: mode } as Record<string, unknown>)
    .eq('id', examId)
  return error ? err(error.message) : ok(undefined)
}