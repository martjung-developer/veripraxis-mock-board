// lib/types/admin/exams/create/exam.types.ts
// All form-level and UI-level types for the Create Exam page.
// Uses Supabase-generated Database types as the source of truth.

import type { Database } from '@/lib/types/database'
import type { ExamType } from '@/lib/types/database'

// ── Supabase Row Aliases ────────────────────────────────────────────────────

export type ExamInsert    = Database['public']['Tables']['exams']['Insert']
export type CategoryRow   = Database['public']['Tables']['exam_categories']['Row']

// ── UI projection: only what we display in the category dropdown ────────────
// Pick ensures we stay in sync with the generated schema.

export type CategoryOption = Pick<CategoryRow, 'id' | 'name'>

// ── Form State ──────────────────────────────────────────────────────────────
// All fields are strings in the form (controlled inputs).
// Numeric values are parsed before the Supabase insert.

export interface ExamFormData {
  title:            string
  description:      string
  category_id:      string
  exam_type:        ExamType
  duration_minutes: string   // string → parsed to number on submit
  total_points:     string   // string → parsed to number on submit
  passing_score:    string   // string → parsed to number on submit
  is_published:     boolean
}

// ── Validation Errors ───────────────────────────────────────────────────────
// All keys are optional — only errored fields are present.

export type ExamFormErrors = Partial<Record<keyof ExamFormData, string>>

// ── Hook Return Shape ───────────────────────────────────────────────────────

export interface UseCreateExamReturn {
  form:        ExamFormData
  errors:      ExamFormErrors
  submitting:  boolean
  success:     boolean
  submitError: string | null
  setField:    <K extends keyof ExamFormData>(field: K, value: ExamFormData[K]) => void
  submit:      (e: React.FormEvent) => Promise<void>
}

export interface UseExamCategoriesReturn {
  categories:  CategoryOption[]
  catLoading:  boolean
}