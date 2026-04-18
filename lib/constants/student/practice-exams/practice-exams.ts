// lib/constants/student/practice-exams/practice-exams.ts

export const PRACTICE_AUTO_SAVE_DEBOUNCE_MS = 1_200

export const PRACTICE_STATUS = {
  IN_PROGRESS: 'in_progress',
  SUBMITTED:   'submitted',   // used on completion — compatible with admin pages
} as const

// Question types that can be auto-graded
export const AUTO_GRADE_TYPES = new Set([
  'multiple_choice',
  'true_false',
  'fill_blank',
] as const)