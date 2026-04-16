// lib/types/admin/students/[examId]/exam.types.ts
import type { Database, ExamType } from '@/lib/types/database'

// ── Raw DB row aliases ────────────────────────────────────────────────────────
type ExamAssignmentRow = Database['public']['Tables']['exam_assignments']['Row']
type ExamRow           = Database['public']['Tables']['exams']['Row']

// ── Supabase join shape ───────────────────────────────────────────────────────
export type JoinedExamForAssignment = Pick<ExamRow, 'title' | 'exam_type'>

export type AssignedExamRow = Pick<
  ExamAssignmentRow,
  'id' | 'exam_id' | 'is_active' | 'assigned_at' | 'deadline'
> & {
  exams: JoinedExamForAssignment | JoinedExamForAssignment[] | null
}

// ── App-level domain type ─────────────────────────────────────────────────────
export interface AssignedExam {
  id:          string
  exam_id:     string
  exam_title:  string
  exam_type:   ExamType
  is_active:   boolean
  assigned_at: string
  deadline:    string | null
}