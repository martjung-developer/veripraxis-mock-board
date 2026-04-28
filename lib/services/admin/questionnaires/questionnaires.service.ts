// lib/services/admin/questionnaires/questionnaires.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES FROM PREVIOUS VERSION:
//   + fetchQuestions selects `scenario` column
//   + DisplayQuestion.scenario populated from DB row
//   + insertQuestion / updateQuestion / bulkInsertQuestions pass scenario
//   + asMutationPayload workaround retained (Supabase generated type issue)
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, QuestionType, QuestionOption } from '@/lib/types/database'
import type {
  DisplayQuestion,
  ProgramOption,
  ExamOption,
  QuestionInsertPayload,
} from '@/lib/types/admin/questionnaires/questionnaires'
import { parseDifficulty } from '@/lib/utils/admin/questionnaires/questionnaires.utils'

type TypedClient = SupabaseClient<Database>

// Supabase currently infers mutation payloads as `never` in this workspace.
// Keep runtime payloads unchanged while satisfying the generated typings.
function asMutationPayload<T>(payload: T): never {
  return payload as unknown as never
}

// ── Safe option unwrap ────────────────────────────────────────────────────────

function toOptions(raw: unknown): QuestionOption[] | null {
  if (!Array.isArray(raw)) { return null }
  const filtered = raw.filter(
    (item): item is QuestionOption =>
      typeof item === 'object' &&
      item !== null &&
      'label' in item &&
      'text'  in item &&
      typeof (item as Record<string, unknown>)['label'] === 'string' &&
      typeof (item as Record<string, unknown>)['text']  === 'string',
  )
  return filtered.length > 0 ? filtered : null
}

// ── Programs ──────────────────────────────────────────────────────────────────

export async function fetchPrograms(client: TypedClient): Promise<ProgramOption[]> {
  const { data, error } = await client
    .from('programs')
    .select('id, code, name')
    .order('code') as {
      data:  Array<{ id: string; code: string; name: string }> | null
      error: unknown
    }

  if (error !== null) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
  return (data ?? []).map((p) => ({ id: p.id, code: p.code, name: p.name }))
}

// ── Exams ─────────────────────────────────────────────────────────────────────

export async function fetchExams(client: TypedClient): Promise<ExamOption[]> {
  const { data, error } = await client
    .from('exams')
    .select('id, title, program_id, category_id')
    .order('title') as {
      data: Array<{
        id: string; title: string
        program_id: string | null; category_id: string | null
      }> | null
      error: unknown
    }

  if (error !== null) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
  return (data ?? []).map((e) => ({
    id:          e.id,
    title:       e.title,
    program_id:  e.program_id,
    category_id: e.category_id,
  }))
}

// ── Questions ─────────────────────────────────────────────────────────────────

interface RawQuestionRow {
  id:             string
  question_text:  string
  question_type:  string
  points:         number
  options:        unknown
  correct_answer: string | null
  explanation:    string | null
  scenario:       string | null   // NEW
  order_number:   number | null
  exam_id:        string | null
  created_by:     string | null
  created_at:     string
  exams: {
    title:           string
    program_id:      string | null
    exam_categories: { name: string } | null
  } | null
}

export async function fetchQuestions(client: TypedClient): Promise<DisplayQuestion[]> {
  const { data, error } = await client
    .from('questions')
    .select(`
      id, question_text, question_type, points, options,
      correct_answer, explanation, scenario, order_number,
      exam_id, created_by, created_at,
      exams ( title, program_id, exam_categories ( name ) )
    `)
    .order('created_at', { ascending: false }) as {
      data:  RawQuestionRow[] | null
      error: unknown
    }

  if (error !== null) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }

  return (data ?? []).map((row): DisplayQuestion => {
    const exam = Array.isArray(row.exams) ? row.exams[0] : row.exams
    const cat  = exam && !Array.isArray(exam.exam_categories)
      ? exam.exam_categories
      : null

    return {
      id:             row.id,
      question_text:  row.question_text,
      question_type:  row.question_type as QuestionType,
      points:         row.points,
      options:        toOptions(row.options),
      correct_answer: row.correct_answer,
      explanation:    row.explanation,
      scenario:       row.scenario,       // NEW
      order_number:   row.order_number,
      exam_id:        row.exam_id,
      created_by:     row.created_by,
      created_at:     row.created_at,
      categoryName:   cat?.name      ?? 'Uncategorized',
      examTitle:      exam?.title     ?? null,
      examProgramId:  exam?.program_id ?? null,
      difficulty:     parseDifficulty(row.explanation),
    }
  })
}

// ── Insert / Update / Delete ──────────────────────────────────────────────────

export async function insertQuestion(
  client:  TypedClient,
  payload: QuestionInsertPayload,
): Promise<void> {
  const { error } = await client
    .from('questions')
    .insert(asMutationPayload([payload]))

  if (error !== null) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
}

export async function updateQuestion(
  client:  TypedClient,
  id:      string,
  payload: QuestionInsertPayload,
): Promise<void> {
  const { error } = await client
    .from('questions')
    .update(asMutationPayload(payload as Record<string, unknown>))
    .eq('id', id)

  if (error !== null) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
}

export async function deleteQuestion(
  client: TypedClient,
  id:     string,
): Promise<void> {
  const { error } = await client
    .from('questions')
    .delete()
    .eq('id', id)

  if (error !== null) { throw new Error(error.message) }
}

export async function bulkInsertQuestions(
  client:   TypedClient,
  payloads: QuestionInsertPayload[],
): Promise<void> {
  const { error } = await client
    .from('questions')
    .insert(asMutationPayload(payloads))

  if (error !== null) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error')
  }
}