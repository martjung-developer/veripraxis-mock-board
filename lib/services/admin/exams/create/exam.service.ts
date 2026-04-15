// lib/services/admin/exams/create/exam.service.ts
// All Supabase data-fetching and mutation logic for the Create Exam page.
// No UI, no state — pure async functions with typed inputs and return values.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import type { ExamInsert, CategoryOption, ExamFormData } from '@/lib/types/admin/exams/create/exam.types'

type DB = SupabaseClient<Database>

// ── Type Guard ──────────────────────────────────────────────────────────────

function extractMessage(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>)['message'] === 'string'
  ) {
    return (err as Record<string, unknown>)['message'] as string
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred.'
}

// ── fetchCategories ─────────────────────────────────────────────────────────
// Fetches id + name for the category dropdown.

export async function fetchCategories(db: DB): Promise<CategoryOption[]> {
  const { data, error } = await db
    .from('exam_categories')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw new Error(extractMessage(error))

  // Pick<CategoryRow, 'id' | 'name'> — safe cast because .select() matches exactly
  return (data ?? []) as CategoryOption[]
}

// ── buildInsertPayload ──────────────────────────────────────────────────────
// Converts raw form strings into the typed Supabase insert shape.
// Parsing and validation of numeric fields happens here — the form always
// stores strings so controlled inputs stay simple.

export function buildInsertPayload(
  form:   ExamFormData,
  userId: string | null,
): ExamInsert {
  return {
    title:            form.title.trim(),
    description:      form.description.trim() || null,
    category_id:      form.category_id        || null,
    exam_type:        form.exam_type,
    duration_minutes: Number(form.duration_minutes),
    total_points:     Number(form.total_points),
    passing_score:    Number(form.passing_score),
    is_published:     form.is_published,
    created_by:       userId,
  }
}

// ── insertExam ──────────────────────────────────────────────────────────────
// Writes one exam row. Throws on error so the hook can catch and surface it.

export async function insertExam(
  db:      DB,
  payload: ExamInsert,
): Promise<void> {
  const { error } = await db.from('exams').insert(payload)
  if (error) throw new Error(extractMessage(error))
}

// ── getCurrentUserId ────────────────────────────────────────────────────────
// Retrieves the authenticated user ID for created_by.
// Returns null when unauthenticated (handled gracefully by buildInsertPayload).

export async function getCurrentUserId(db: DB): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await db.auth.getUser()

  // Auth errors are non-fatal here — we just omit created_by
  if (error || !user) return null
  return user.id
}