// lib/types/admin/exams/submissions/exam.types.ts
import type { GradingMode } from './submission.types'

// ── Exam info needed by the submissions page ──────────────────────────────────
export interface ExamInfo {
  passing_score: number
  total_points:  number
  grading_mode:  GradingMode
}

// ── Preview score shown in the modal footer ───────────────────────────────────
export interface PreviewScore {
  earned: number
  pct:    number
  passed: boolean
}