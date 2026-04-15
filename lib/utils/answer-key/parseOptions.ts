// lib/utils/answer-key/parseOptions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Safe parser for the `options` jsonb column on `questions`.
// Replaces every `as unknown as QuestionOption[]` cast in the codebase.
//
// Database.ts addition required:
// The `questions.Row.options` column is typed as `Json | null` in database.ts.
// At runtime the value can arrive as:
//   - null                       → no options
//   - QuestionOption[]           → standard MCQ / matching
//   - string (serialised JSON)   → legacy rows stored as text
// This utility narrows all three cases to `QuestionOption[] | null` safely.
// ─────────────────────────────────────────────────────────────────────────────

import type { QuestionOption } from '@/lib/types/database'

/**
 * Type-guard: checks that `v` has the shape of a `QuestionOption`.
 * Expected: { label: string; text: string }
 */
function isQuestionOption(v: unknown): v is QuestionOption {
  return (
    typeof v === 'object' &&
    v !== null &&
    'label' in v &&
    'text' in v &&
    typeof (v as Record<string, unknown>).label === 'string' &&
    typeof (v as Record<string, unknown>).text  === 'string'
  )
}

/**
 * Safely parses the raw `options` value coming from a Supabase jsonb column.
 *
 * Returns a validated `QuestionOption[]` or `null` when:
 *  - the value is null / undefined
 *  - the value is not an array (after optional JSON parse)
 *  - any element fails the QuestionOption shape check
 */
export function parseOptions(value: unknown): QuestionOption[] | null {
  if (value === null || value === undefined) return null

  // Handle legacy rows where the column was stored as a JSON string
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return null
    }
  }

  if (!Array.isArray(parsed)) return null

  // Validate every element — if any fails, return null to signal bad data
  for (const item of parsed) {
    if (!isQuestionOption(item)) return null
  }

  return parsed as QuestionOption[]
}