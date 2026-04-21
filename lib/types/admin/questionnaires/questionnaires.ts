// lib/types/admin/questionnaires/questionnaires.ts
import type { Database, QuestionType, QuestionOption } from '@/lib/types/database'

// ── Raw DB row types (source of truth) ────────────────────────────────────────
export type ProgramRow  = Database['public']['Tables']['programs']['Row']
export type ExamRow     = Database['public']['Tables']['exams']['Row']
export type QuestionRow = Database['public']['Tables']['questions']['Row']

// ── Narrow picks used across the feature ──────────────────────────────────────
export type ProgramOption = Pick<ProgramRow, 'id' | 'code' | 'name'>
export type ExamOption    = Pick<ExamRow,    'id' | 'title' | 'program_id' | 'category_id'>

// ── Insert payload — derives from DB Insert type, no duplication ───────────────
export type QuestionInsertPayload =
  Required<Pick<
    Database['public']['Tables']['questions']['Insert'],
    | 'question_text'
    | 'question_type'
    | 'points'
    | 'explanation'
  >> &
  Pick<
    Database['public']['Tables']['questions']['Insert'],
    | 'options'
    | 'correct_answer'
    | 'exam_id'
  >

// ── Joined shape returned by fetchQuestions (not in DB, but built from DB) ─────
export interface DisplayQuestion {
  id:             string
  question_text:  string
  question_type:  QuestionType
  points:         number
  options:        QuestionOption[] | null
  correct_answer: string | null
  explanation:    string | null
  order_number:   number | null
  exam_id:        string | null
  created_by:     string | null
  created_at:     string
  // joined fields
  categoryName:   string
  examTitle:      string | null
  examProgramId:  string | null
  // derived
  difficulty:     DifficultyLevel
}

// ── App-level types ────────────────────────────────────────────────────────────
export type DifficultyLevel = 'easy' | 'medium' | 'hard'
export type ViewMode        = 'programs' | 'program-detail'
export type ImportTab       = 'file' | 'link'
export type LinkSource      = 'google_forms' | 'google_drive' | 'custom_url'

export interface FormState {
  question_text:  string
  question_type:  QuestionType
  points:         number
  correct_answer: string
  explanation:    string
  exam_id:        string
  difficulty:     DifficultyLevel
  choices:        QuestionOption[]
  program_id:     string
}

export interface ImportRow {
  question_text:  string
  question_type:  string
  points:         number
  correct_answer: string
  explanation:    string
  difficulty:     string
  option_a:       string
  option_b:       string
  option_c:       string
  option_d:       string
  _rowIndex:      number
  _errors:        string[]
  _valid:         boolean
}

// Raw row shape coming out of every file parser
export type RawRow = Record<string, string>

export interface LinkDetectResult {
  source: LinkSource
  valid:  boolean
  hint:   string
}