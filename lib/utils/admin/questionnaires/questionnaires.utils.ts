// lib/utils/admin/questionnaires/questionnaires.utils.ts
import type { DifficultyLevel, RawRow, ImportRow } from '@/lib/types/admin/questionnaires/questionnaires'
import { VALID_TYPES, VALID_DIFF, TEMPLATE_HEADERS } from '@/lib/constants/admin/questionnaires/questionnaires.constants'

// ── Difficulty encoding / decoding ────────────────────────────────────────────

export function parseDifficulty(raw: string | null): DifficultyLevel {
  if (!raw) { return 'medium' }
  const lower = raw.toLowerCase()
  if (lower.includes('[easy]')) { return 'easy' }
  if (lower.includes('[hard]')) { return 'hard' }
  return 'medium'
}

export function stripDifficultyTag(raw: string | null): string {
  if (!raw) { return '' }
  return raw.replace(/^\[(easy|medium|hard)\]\s*/i, '').trim()
}

export function encodeDifficulty(diff: DifficultyLevel, explanation: string): string {
  const body = explanation.trim()
  return body ? `[${diff.toUpperCase()}] ${body}` : `[${diff.toUpperCase()}]`
}

// ── Row validation ────────────────────────────────────────────────────────────

export function validateImportRow(raw: RawRow, idx: number): ImportRow {
  const errors: string[] = []

  const question_text  = (raw['question_text']  ?? '').trim()
  const question_type  = (raw['question_type']  ?? '').trim().toLowerCase()
  const points         = Number(raw['points'] ?? 1) || 1
  const difficulty     = (raw['difficulty']     ?? 'medium').trim().toLowerCase()
  const correct_answer = (raw['correct_answer'] ?? '').trim()
  const explanation    = (raw['explanation']    ?? '').trim()
  const option_a       = (raw['option_a']       ?? '').trim()
  const option_b       = (raw['option_b']       ?? '').trim()
  const option_c       = (raw['option_c']       ?? '').trim()
  const option_d       = (raw['option_d']       ?? '').trim()

  if (!question_text) { errors.push('question_text is required') }

  if (!(VALID_TYPES as readonly string[]).includes(question_type)) {
    errors.push(`invalid question_type "${question_type}"`)
  }

  if (!(VALID_DIFF as readonly string[]).includes(difficulty)) {
    errors.push(`invalid difficulty "${difficulty}"`)
  }

  if (question_type === 'multiple_choice') {
    if (!option_a || !option_b) { errors.push('needs at least option_a and option_b') }
    if (!correct_answer)        { errors.push('correct_answer required (A/B/C/D)') }
  }

  if (question_type === 'true_false') {
    const ca = correct_answer.toLowerCase()
    if (ca !== 'true' && ca !== 'false') {
      errors.push('correct_answer must be "true" or "false"')
    }
  }

  return {
    question_text, question_type, points, difficulty,
    correct_answer, explanation,
    option_a, option_b, option_c, option_d,
    _rowIndex: idx + 2,
    _errors:   errors,
    _valid:    errors.length === 0,
  }
}

// ── Template download ─────────────────────────────────────────────────────────

export function downloadTemplate(): void {
  const header = TEMPLATE_HEADERS.join(',')
  const row1   = [
    '"What is 2 + 2?"', 'multiple_choice', '1', 'easy',
    '3', '4', '5', '6', 'B', '"Adding two and two gives four"',
  ].join(',')
  const row2   = [
    '"The Earth is flat."', 'true_false', '1', 'easy',
    '', '', '', '', 'false', '"The Earth is an oblate spheroid"',
  ].join(',')
  const csv  = [header, row1, row2].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = 'questions_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}