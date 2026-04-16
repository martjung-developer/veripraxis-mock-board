// lib/types/admin/students/[examId]/submission.types.ts
import type { Database, ExamType, SubmissionStatus } from '@/lib/types/database'

// ── Raw DB row aliases ────────────────────────────────────────────────────────
type SubmissionRow = Database['public']['Tables']['submissions']['Row']
type ExamRow       = Database['public']['Tables']['exams']['Row']

// ── Supabase join shape ───────────────────────────────────────────────────────
export type JoinedExamForSubmission = Pick<ExamRow, 'title' | 'exam_type'>

export type SubmissionRaw = Pick<
  SubmissionRow,
  'id' | 'status' | 'percentage' | 'passed' | 'submitted_at'
> & {
  exams: JoinedExamForSubmission | JoinedExamForSubmission[] | null
}

// ── App-level domain type ─────────────────────────────────────────────────────
export interface Submission {
  id:           string
  exam_title:   string
  exam_type:    ExamType
  status:       SubmissionStatus
  percentage:   number | null
  passed:       boolean | null
  submitted_at: string | null
}