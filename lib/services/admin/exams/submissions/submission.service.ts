// lib/services/admin/exams/submissions/submission.service.ts
// Zero UI, zero React, fully typed Supabase calls.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type { ServiceResult }  from '@/lib/types/admin/exams/submissions/submission.types'
import type { AnswerRaw }      from '@/lib/types/admin/exams/submissions/answer.types'
import type { AnswerKeyRaw }   from '@/lib/utils/admin/submissions/mappers'
import type { SubmissionRaw }  from '@/lib/types/admin/exams/submissions/submission.types'

type DB = SupabaseClient<Database>

function ok<T>(data: T): ServiceResult<T>          { return { data, error: null } }
function err<T = void>(msg: string): ServiceResult<T> { return { data: null, error: msg } }

// ── Submissions ───────────────────────────────────────────────────────────────

export async function getSubmissionsByExam(
  supabase: DB,
  examId:   string,
): Promise<ServiceResult<SubmissionRaw[]>> {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id, student_id,
      started_at, submitted_at, time_spent_seconds,
      status, score, percentage, passed,
      profiles:student_id ( id, full_name, email ),
      students:student_id ( student_id )
    `)
    .eq('exam_id', examId)
    .order('started_at', { ascending: false })

  if (error) return err(error.message)
  // Cast via `unknown` — Supabase infers a complex generic for joined selects
  // that conflicts with our explicit SubmissionRaw shape. The shape is verified
  // by the mapSubmission() function which type-guards each field individually.
  return ok((data ?? []) as unknown as SubmissionRaw[])
}

export async function updateSubmission(
  supabase: DB,
  id:       string,
  patch: {
    score?:      number
    percentage?: number
    passed?:     boolean
    status?:     string
  },
): Promise<ServiceResult> {
  const { error } = await supabase
    .from('submissions')
    .update(patch)
    .eq('id', id)
  return error ? err(error.message) : ok(undefined)
}

// ── Answers ───────────────────────────────────────────────────────────────────

export async function getSubmissionAnswers(
  supabase:     DB,
  submissionId: string,
): Promise<ServiceResult<AnswerRaw[]>> {
  const { data, error } = await supabase
    .from('answers')
    .select(`
      id, question_id, answer_text, is_correct, points_earned, feedback,
      questions:question_id (
        question_text, question_type, points,
        options, correct_answer, explanation, order_number
      )
    `)
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) return err(error.message)
  return ok((data ?? []) as unknown as AnswerRaw[])
}

export async function updateAnswer(
  supabase: DB,
  id:       string,
  patch: {
    is_correct?:    boolean | null
    points_earned?: number | null
    feedback?:      string | null
  },
): Promise<ServiceResult> {
  const { error } = await supabase.from('answers').update(patch).eq('id', id)
  return error ? err(error.message) : ok(undefined)
}

// ── Answer key ────────────────────────────────────────────────────────────────

export async function getAnswerKey(
  supabase: DB,
  examId:   string,
): Promise<ServiceResult<AnswerKeyRaw[]>> {
  const { data, error } = await supabase
    .from('questions')
    .select('id, correct_answer, question_text, question_type, order_number')
    .eq('exam_id', examId)
    .order('order_number', { ascending: true, nullsFirst: false })

  if (error) return err(error.message)
  return ok((data ?? []) as AnswerKeyRaw[])
}