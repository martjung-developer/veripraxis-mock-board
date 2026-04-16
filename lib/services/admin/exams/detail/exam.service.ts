// lib/services/admin/exams/detail/exam.service.ts
// All Supabase data-fetching and mutation logic for the Exam Detail page.
// No UI, no state — pure async functions with typed inputs and return values.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type {
  ExamDetailRaw,
  ExamStats,
  CategoryOption,
  ProgramOption,
  ExamUpdate,
  EditForm,
} from '@/lib/types/admin/exams/detail/exam.types'
import { computeAvgScore } from '@/lib/utils/admin/exams/detail/mappers'

type DB = SupabaseClient<Database>

// ── Error helper ─────────────────────────────────────────────────────────────

function extractMessage(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>)['message'] === 'string'
  ) {
    return (err as Record<string, unknown>)['message'] as string
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred.'
}

// ── getExamById ──────────────────────────────────────────────────────────────
// Fetches the exam row + its category and program relations.
// Returns the raw joined shape; mapping to ExamDetail happens in the mapper.

export async function getExamById(
  db:     DB,
  examId: string,
): Promise<ExamDetailRaw> {
  const { data, error } = await db
    .from('exams')
    .select(`
      id, title, description,
      duration_minutes, total_points, passing_score,
      is_published, exam_type, created_at, updated_at,
      exam_categories ( id, name, icon ),
      programs ( id, code, name )
    `)
    .eq('id', examId)
    .single()

  if (error || !data) {
    throw new Error(error ? extractMessage(error) : 'Exam not found.')
  }

  // We assert here at the single service boundary where we know the shape
  // from the .select() string. All downstream code uses ExamDetailRaw.
  return data as unknown as ExamDetailRaw
}

// ── getCategories ────────────────────────────────────────────────────────────

export async function getCategories(db: DB): Promise<CategoryOption[]> {
  const { data, error } = await db
    .from('exam_categories')
    .select('id, name')
    .order('name')

  if (error) throw new Error(extractMessage(error))

  return (data ?? []) as CategoryOption[]
}

// ── getPrograms ──────────────────────────────────────────────────────────────

export async function getPrograms(db: DB): Promise<ProgramOption[]> {
  const { data, error } = await db
    .from('programs')
    .select('id, code, name')
    .order('code')

  if (error) throw new Error(extractMessage(error))

  return (data ?? []) as ProgramOption[]
}

// ── getExamStats ─────────────────────────────────────────────────────────────
// Fetches question count, active assignment count, submission count,
// and computes average score — all in parallel.

export async function getExamStats(db: DB, examId: string): Promise<ExamStats> {
  const [qRes, aRes, subRes, scoreRes] = await Promise.all([
    db
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId),
    db
      .from('exam_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId)
      .eq('is_active', true),
    db
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId),
    db
      .from('submissions')
      .select('percentage')
      .eq('exam_id', examId)
      .eq('status', 'graded')
      .not('percentage', 'is', null),
  ])

  if (qRes.error)     throw new Error(extractMessage(qRes.error))
  if (aRes.error)     throw new Error(extractMessage(aRes.error))
  if (subRes.error)   throw new Error(extractMessage(subRes.error))
  if (scoreRes.error) throw new Error(extractMessage(scoreRes.error))

  const percentages = (scoreRes.data ?? []).map(
    (r: { percentage: number | null }) => r.percentage,
  )

  return {
    question_count:   qRes.count   ?? 0,
    assigned_count:   aRes.count   ?? 0,
    submission_count: subRes.count ?? 0,
    avg_score:        computeAvgScore(percentages),
  }
}

// ── buildUpdatePayload ────────────────────────────────────────────────────────
// Converts raw form strings into a typed Supabase update payload.

export function buildUpdatePayload(form: EditForm): ExamUpdate {
  return {
    title:            form.title.trim(),
    description:      form.description.trim() || null,
    category_id:      form.category_id        || null,
    program_id:       form.program_id         || null,
    exam_type:        form.exam_type,
    duration_minutes: Number(form.duration_minutes),
    total_points:     Number(form.total_points),
    passing_score:    Number(form.passing_score),
    is_published:     form.is_published,
    updated_at:       new Date().toISOString(),
  }
}

// ── updateExam ───────────────────────────────────────────────────────────────

export async function updateExam(
  db:      DB,
  examId:  string,
  payload: ExamUpdate,
): Promise<void> {
  const { error } = await db.from('exams').update(payload).eq('id', examId)
  if (error) throw new Error(extractMessage(error))
}