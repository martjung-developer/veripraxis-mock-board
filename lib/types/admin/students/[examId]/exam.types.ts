// lib/types/admin/exams/submissions/exam.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// GradingMode is imported from database.ts — the single source of truth.
// Previously this imported from submission.types.ts, which itself re-exported
// from database.ts, creating a potential circular dependency path:
//   exam.types → submission.types → database
// The fix is a direct import, removing the intermediate hop.
// ─────────────────────────────────────────────────────────────────────────────

import type { GradingMode } from '@/lib/types/database'

export type { GradingMode }

// ── Exam metadata needed for grading calculations ─────────────────────────────
export interface ExamInfo {
  passing_score: number
  total_points:  number
  grading_mode:  GradingMode
}

// ── Preview score shown in the submission-detail modal footer ─────────────────
export interface PreviewScore {
  earned: number
  pct:    number
  passed: boolean
}