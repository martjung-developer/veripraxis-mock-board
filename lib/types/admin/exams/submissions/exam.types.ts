// lib/types/admin/exams/submissions/exam.types.ts
import type { GradingMode } from '@/lib/types/admin/exams/submissions/submission.types'
 
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