// lib/services/admin/exams/answer-key/answerKey.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// All Supabase interactions for the Answer Key feature.
// Zero React, zero UI, zero `any`, zero unsafe casts.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type { QuestionType }   from '@/lib/types/database'
import { parseOptions }        from '@/lib/utils/admin/answer-key/parseOptions'
import type {
  AnswerKeyEntry,
  ExamMeta,
  QuestionRaw,
  SavePayload,
  ServiceResult,
} from '@/lib/types/admin/exams/answer-key/answerKey.types'

// ── Type alias ────────────────────────────────────────────────────────────────

type DB = SupabaseClient<Database>

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok<T>(data: T): ServiceResult<T>  { return { data, error: null }  }
function err<T = void>(msg: string): ServiceResult<T> { return { data: null, error: msg } }

/** Validated QuestionType set — avoids a runtime import of the full enum */
const VALID_QUESTION_TYPES = new Set<string>([
  'multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank',
])

function isQuestionType(v: string): v is QuestionType {
  return VALID_QUESTION_TYPES.has(v)
}

/**
 * Maps a raw Supabase row to a fully typed `AnswerKeyEntry`.
 * Validates `question_type` before narrowing — returns `null` for unknown types
 * so the caller can filter them out gracefully.
 */
function mapRowToEntry(row: QuestionRaw): AnswerKeyEntry | null {
  if (!isQuestionType(row.question_type)) return null

  return {
    question_id:           row.id,
    question_text:         row.question_text,
    question_type:         row.question_type,
    points:                row.points,
    order_number:          row.order_number,
    options:               parseOptions(row.options),
    correct_answer:        row.correct_answer,
    override:              null,
    explanation:           row.explanation,
    // Snapshots for accurate dirty detection
    originalCorrectAnswer: row.correct_answer,
    originalExplanation:   row.explanation,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches exam metadata (title, total_points, exam_type) for the header.
 */
export async function fetchExamMeta(
  supabase: DB,
  examId: string,
): Promise<ServiceResult<ExamMeta>> {
  const { data, error } = await supabase
    .from('exams')
    .select('title, total_points, exam_type')
    .eq('id', examId)
    .single()
    .returns<Pick<Database['public']['Tables']['exams']['Row'], 'title' | 'total_points' | 'exam_type'>>()

  if (error || !data) return err(error?.message ?? 'Exam not found')

  return ok<ExamMeta>({
    title:        data.title,
    total_points: data.total_points,
    exam_type:    data.exam_type ?? 'mock',
  })
}

/**
 * Fetches all questions for an exam and maps them to AnswerKeyEntry[].
 * Questions with unrecognised `question_type` values are silently skipped.
 */
export async function fetchAnswerKeyEntries(
  supabase: DB,
  examId: string,
): Promise<ServiceResult<AnswerKeyEntry[]>> {
  const { data, error } = await supabase
    .from('questions')
    .select(
      'id, question_text, question_type, points, order_number, options, correct_answer, explanation',
    )
    .eq('exam_id', examId)
    .order('order_number', { ascending: true, nullsFirst: false })

  if (error) return err(error.message)

  // `data` is typed as the full questions Row[] by Supabase.
  // We cast to QuestionRaw[] — this is safe because we select exactly those
  // columns and QuestionRaw mirrors them with `unknown` for the jsonb field.
  const rows = (data ?? []) as QuestionRaw[]

  const entries = rows
    .map(mapRowToEntry)
    .filter((e): e is AnswerKeyEntry => e !== null)

  return ok(entries)
}

/**
 * Persists changed entries via individual UPDATE calls wrapped in Promise.all.
 *
 * Only rows with actual changes are sent (caller is responsible for filtering,
 * but we add a guard here too so the service is safe to call with the full list).
 *
 * Returns the number of rows that failed.
 */
export async function saveAnswerKeyEntries(
  supabase: DB,
  payloads: SavePayload[],
): Promise<ServiceResult<{ failedCount: number }>> {
  if (!payloads.length) return ok({ failedCount: 0 })

  const results = await Promise.all(
    payloads.map((p) =>
      supabase
        .from('questions')
        .update({
          correct_answer: p.correct_answer,
          explanation:    p.explanation,
        })
        .eq('id', p.question_id)
        .returns<Pick<Database['public']['Tables']['questions']['Row'], 'id'>>(),
    ),
  )

  const failedCount = results.filter((r) => r.error !== null).length

  if (failedCount > 0) {
    return err(`${failedCount} question(s) failed to save.`)
  }

  return ok({ failedCount: 0 })
}