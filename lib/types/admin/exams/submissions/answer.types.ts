// lib/types/admin/exams/submissions/answer.types.ts
import type { QuestionType, QuestionOption } from '@/lib/types/database'

// ── Normalised answer shape used throughout UI ────────────────────────────────
export interface QuestionContext {
  question_text:  string
  question_type:  QuestionType
  points:         number
  options:        QuestionOption[] | null
  correct_answer: string | null
  explanation:    string | null
  order_number:   number | null
}

export interface AnswerDetail {
  id:            string
  question_id:   string
  answer_text:   string | null
  is_correct:    boolean | null
  points_earned: number | null
  feedback:      string
  question:      QuestionContext | null
}

// ── Raw Supabase join shape ───────────────────────────────────────────────────
// `questions` can arrive as object or array — we handle both in the mapper.
export interface AnswerRaw {
  id:            string
  question_id:   string | null
  answer_text:   string | null
  is_correct:    boolean | null
  points_earned: number | null
  feedback:      string | null
  questions:
    | {
        question_text:  string
        question_type:  string
        points:         number
        options:        unknown     // jsonb — narrowed via parseOptions()
        correct_answer: string | null
        explanation:    string | null
        order_number:   number | null
      }
    | null
}

// ── Answer key entry (per question, used in manual grading) ───────────────────
export interface AnswerKeyEntry {
  question_id:    string
  correct_answer: string | null
  question_text:  string
  question_type:  QuestionType
  order_number:   number | null
}

// ── Grading result (local computation, not persisted directly) ────────────────
export interface GradeResult {
  is_correct:    boolean | null   // null for manual-grade types
  points_earned: number
}

// ── Answer stats derived in the modal ────────────────────────────────────────
export interface AnswerStats {
  correct:   number
  incorrect: number
  pending:   number
  total:     number
}