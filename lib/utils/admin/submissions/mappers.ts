// lib/utils/submissions/mappers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions mapping raw Supabase rows → normalised UI types.
// Zero React, zero Supabase client calls.
// ─────────────────────────────────────────────────────────────────────────────

import type { QuestionType }  from '@/lib/types/database'
import type {
  Submission,
  SubmissionRaw,
  SubmissionStatus,
} from '@/lib/types/admin/exams/submissions/submission.types'
import type {
  AnswerDetail,
  AnswerKeyEntry,
  AnswerRaw,
} from '@/lib/types/admin/exams/submissions/answer.types'
import { parseOptions }    from '@/lib/utils/admin/answer-key/parseOptions'
import { VALID_STATUSES }  from './constants'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Supabase joined queries can return the related side as an object OR an array
 * depending on how the relationship cardinality was detected.
 * This helper normalises both cases to a single value or null.
 */
export function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (v === null || v === undefined) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function isValidStatus(s: string): s is SubmissionStatus {
  return VALID_STATUSES.includes(s as SubmissionStatus)
}

const VALID_QUESTION_TYPES = new Set<string>([
  'multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank',
])
function isQuestionType(s: string): s is QuestionType {
  return VALID_QUESTION_TYPES.has(s)
}

// ── Submission mapper ─────────────────────────────────────────────────────────

export function mapSubmission(row: SubmissionRaw): Submission {
  const profile = unwrap(row.profiles)
  const student = unwrap(row.students)
  const status: SubmissionStatus = isValidStatus(row.status)
    ? row.status
    : 'in_progress'

  return {
    id:                 row.id,
    student: {
      id:         profile?.id        ?? row.student_id ?? '',
      full_name:  profile?.full_name ?? 'Unknown Student',
      email:      profile?.email     ?? '',
      student_id: student?.student_id ?? null,
    },
    started_at:         row.started_at,
    submitted_at:       row.submitted_at,
    time_spent_seconds: row.time_spent_seconds,
    status,
    score:      row.score,
    percentage: row.percentage,
    passed:     row.passed,
  }
}

// ── Answer mapper ─────────────────────────────────────────────────────────────

export function mapAnswer(row: AnswerRaw): AnswerDetail {
  const q = row.questions

  return {
    id:            row.id,
    question_id:   row.question_id ?? '',
    answer_text:   row.answer_text,
    is_correct:    row.is_correct,
    points_earned: row.points_earned,
    feedback:      row.feedback ?? '',
    question: q && isQuestionType(q.question_type)
      ? {
          question_text:  q.question_text,
          question_type:  q.question_type,
          points:         q.points,
          options:        parseOptions(q.options),
          correct_answer: q.correct_answer,
          explanation:    q.explanation,
          order_number:   q.order_number,
        }
      : null,
  }
}

// ── Answer key mapper ─────────────────────────────────────────────────────────

export interface AnswerKeyRaw {
  id:             string
  correct_answer: string | null
  question_text:  string
  question_type:  string
  order_number:   number | null
}

export function mapAnswerKeyEntry(row: AnswerKeyRaw): AnswerKeyEntry | null {
  if (!isQuestionType(row.question_type)) return null
  return {
    question_id:    row.id,
    correct_answer: row.correct_answer,
    question_text:  row.question_text,
    question_type:  row.question_type,
    order_number:   row.order_number,
  }
}