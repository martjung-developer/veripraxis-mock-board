// lib/services/admin/exams/questions/questions.service.ts
//
// Pure Supabase I/O — no React, no state, no UI logic.
// Every method returns a typed ServiceResult.

import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/types/database'
import type {
  Question,
  QuestionInsert,
  QuestionRow,
  QuestionUpdate,
  ServiceResult,
} from '@/lib/types/admin/exams/questions/questions.types'
import { parseQuestionRow } from '@/lib/utils/admin/questions/helpers'

// ── Column selection ───────────────────────────────────────────────────────
// Kept as a constant so it stays in sync if columns are added later.
const QUESTION_COLUMNS = [
  'id',
  'exam_id',
  'question_text',
  'question_type',
  'points',
  'order_number',
  'options',
  'correct_answer',
  'explanation',
  'created_at',
].join(', ')

// ── Fetch ──────────────────────────────────────────────────────────────────

export async function fetchQuestionsByExamId(
  examId: string,
): Promise<ServiceResult<Question[]>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('questions')
    .select(QUESTION_COLUMNS)
    .eq('exam_id', examId)
    .order('order_number', { ascending: true, nullsFirst: false })

  if (error) {
    return { data: null, error: error.message }
  }

  // Parse each raw DB row into the strongly-typed Question shape.
  const questions: Question[] = (data as QuestionRow[]).map(parseQuestionRow)

  return { data: questions, error: null }
}

// ── Create ─────────────────────────────────────────────────────────────────

export interface CreateQuestionPayload {
  examId:        string
  question_text: string
  question_type: Question['question_type']
  points:        number
  options:       Question['options']
  correct_answer: string | null
  explanation:   string | null
  order_number:  number
}

export async function createQuestion(
  payload: CreateQuestionPayload,
): Promise<ServiceResult<Question>> {
  const supabase = createClient()

  const insert: QuestionInsert = {
    exam_id:        payload.examId,
    question_text:  payload.question_text,
    question_type:  payload.question_type,
    points:         payload.points,
    options:        payload.options as Json | null,
    correct_answer: payload.correct_answer,
    explanation:    payload.explanation,
    order_number:   payload.order_number,
  }

  const { data, error } = await supabase
    .from('questions')
    .insert(insert)
    .select(QUESTION_COLUMNS)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Insert returned no data.' }
  }

  return { data: parseQuestionRow(data as QuestionRow), error: null }
}

// ── Update ─────────────────────────────────────────────────────────────────

export interface UpdateQuestionPayload {
  id:            string
  question_text: string
  question_type: Question['question_type']
  points:        number
  options:       Question['options']
  correct_answer: string | null
  explanation:   string | null
}

export async function updateQuestion(
  payload: UpdateQuestionPayload,
): Promise<ServiceResult<void>> {
  const supabase = createClient()

  const patch: QuestionUpdate = {
    question_text:  payload.question_text,
    question_type:  payload.question_type,
    points:         payload.points,
    options:        payload.options as Json | null,
    correct_answer: payload.correct_answer,
    explanation:    payload.explanation,
  }

  const { error } = await supabase
    .from('questions')
    .update(patch)
    .eq('id', payload.id)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

// ── Delete ─────────────────────────────────────────────────────────────────

export async function deleteQuestion(id: string): Promise<ServiceResult<void>> {
  const supabase = createClient()

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}