// lib/types/admin/exams/answer-key/answerKey.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All domain types for the Admin Answer Key feature.
// Derived from Database where possible — zero `any`, zero unsafe casts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Database } from '@/lib/types/database'
import type { QuestionType, QuestionOption } from '@/lib/types/database'
export type { QuestionType, QuestionOption } from '@/lib/types/database'

// ── Supabase row aliases ──────────────────────────────────────────────────────

export type QuestionRow  = Database['public']['Tables']['questions']['Row']
export type QuestionUpdate = Database['public']['Tables']['questions']['Update']
export type ExamRow      = Database['public']['Tables']['exams']['Row']

// ── Safe DB shape returned by Supabase select ─────────────────────────────────
// We use `unknown` for `options` because Supabase types jsonb as `Json | null`.
// We validate and narrow it before use via `parseOptions()`.

export interface QuestionRaw {
  id:             string
  question_text:  string
  question_type:  string          // narrowed to QuestionType after validation
  points:         number
  order_number:   number | null
  options:        unknown         // jsonb — validated via parseOptions()
  correct_answer: string | null
  explanation:    string | null
}

// ── Domain types ──────────────────────────────────────────────────────────────

export interface ExamMeta {
  title:        string
  total_points: number
  exam_type:    string
}

/**
 * One entry in the answer-key editor.
 * `override` is the local pending edit — null means "use stored correct_answer".
 * `originalCorrectAnswer` and `originalExplanation` are frozen snapshots used
 * for accurate dirty detection (no fragile boolean comparisons).
 */
export interface AnswerKeyEntry {
  question_id:            string
  question_text:          string
  question_type:          QuestionType
  points:                 number
  order_number:           number | null
  options:                QuestionOption[] | null
  correct_answer:         string | null   // persisted value
  override:               string | null   // local unsaved edit
  explanation:            string | null   // current (possibly unsaved) rubric text
  // ── Snapshot for dirty detection ───────────────────────────────────────────
  originalCorrectAnswer:  string | null   // value at last successful fetch/save
  originalExplanation:    string | null   // value at last successful fetch/save
}

// ── Derived / computed helpers ────────────────────────────────────────────────

/** Returns the answer that will be used: override (if set) else stored. */
export function effectiveAnswer(entry: AnswerKeyEntry): string {
  return entry.override !== null ? entry.override : (entry.correct_answer ?? '')
}

/**
 * An entry is dirty if:
 *  - it has a pending override that differs from the persisted correct_answer, OR
 *  - its explanation differs from the snapshot taken at load/save time.
 */
export function isEntryDirty(entry: AnswerKeyEntry): boolean {
  const answerChanged =
    entry.override !== null &&
    entry.override !== (entry.correct_answer ?? '')

  const explanationChanged =
    (entry.explanation ?? null) !== entry.originalExplanation

  return answerChanged || explanationChanged
}

// ── Service-layer contracts ───────────────────────────────────────────────────

export interface SavePayload {
  question_id:    string
  correct_answer: string | null
  explanation:    string | null
}

export interface ServiceResult<T = void> {
  data:  T | null
  error: string | null
}

// ── UI state ──────────────────────────────────────────────────────────────────

export type ToastState = {
  message: string
  type:    'success' | 'error'
} | null

// ── Constants ─────────────────────────────────────────────────────────────────

export const AUTO_TYPES:   QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']
export const MANUAL_TYPES: QuestionType[] = ['short_answer', 'essay', 'matching']

export const GROUP_ORDER: QuestionType[] = [
  'multiple_choice', 'true_false', 'fill_blank',
  'short_answer', 'matching', 'essay',
]

export type TypeColor = 'blue' | 'green' | 'rose' | 'amber' | 'violet' | 'teal'

export interface TypeMeta {
  label: string
  color: TypeColor
}

export const TYPE_META: Record<QuestionType, TypeMeta> = {
  multiple_choice: { label: 'Multiple Choice', color: 'blue'   },
  true_false:      { label: 'True / False',    color: 'green'  },
  short_answer:    { label: 'Short Answer',    color: 'amber'  },
  essay:           { label: 'Essay',           color: 'violet' },
  matching:        { label: 'Matching',        color: 'teal'   },
  fill_blank:      { label: 'Fill in Blank',   color: 'rose'   },
}