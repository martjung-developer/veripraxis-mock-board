// lib/services/student/mock-exams/mockExams.service.ts

import { createClient } from '@/lib/supabase/client'
import type { ExamAttempt, AnswerMap, Question } from '@/lib/types/student/mock-exams/mock-exams'

interface SubmissionRow {
  id: string
  exam_id: string
  student_id: string
  status: string
  started_at: string
  submitted_at?: string | null
  time_spent_seconds?: number | null
}

interface AnswerRow {
  submission_id: string
  question_id: string
  answer_text: string | null
}

// ── Helpers ─────────────────────────────────────────

function getSupabase() {
  return createClient()
}

// ── List Page ───────────────────────────────────────

export async function fetchAssignedExamIds(
  userId: string,
  programId: string | null,
): Promise<Set<string>> {
  const supabase = getSupabase()

  const orFilter = programId
    ? `student_id.eq.${userId},program_id.eq.${programId}`
    : `student_id.eq.${userId}`

  const { data, error } = await supabase
    .from('exam_assignments')
    .select('exam_id')
    .eq('is_active', true)
    .or(orFilter)

  if (error) throw new Error('Could not load exam assignments.')

  return new Set(
    (data ?? [])
      .map((a: { exam_id: string | null }) => a.exam_id)
      .filter((id): id is string => id !== null),
  )
}

export async function fetchPublishedMockExams() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('exams')
    .select(`
      id,
      title,
      duration_minutes,
      is_published,
      exam_type,
      exam_categories ( id, name, icon ),
      programs ( id, code, name )
    `)
    .eq('is_published', true)
    .eq('exam_type', 'mock')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Could not load exams.')
  return data ?? []
}

export async function fetchQuestionCounts(
  examIds: string[],
): Promise<Record<string, number>> {
  if (!examIds.length) return {}

  const supabase = getSupabase()
  const { data } = await supabase
    .from('questions')
    .select('exam_id')
    .in('exam_id', examIds)

  const map: Record<string, number> = {}

  ;(data ?? []).forEach((q: { exam_id: string | null }) => {
    if (q.exam_id) {
      map[q.exam_id] = (map[q.exam_id] ?? 0) + 1
    }
  })

  return map
}

export async function fetchStudentSubmissionStatuses(
  userId: string,
  examIds: string[],
): Promise<Record<string, { status: string; submissionId: string }>> {
  if (!examIds.length) return {}

  const supabase = getSupabase()

  // ✅ FIX 2: Remove generic <SubmissionRow>
  const { data } = await supabase
    .from('submissions')
    .select('id, exam_id, status')
    .eq('student_id', userId)
    .in('exam_id', examIds)
    .order('created_at', { ascending: false })

  const map: Record<string, { status: string; submissionId: string }> = {}

  ;(data ?? []).forEach((s: any) => {
    if (!map[s.exam_id]) {
      map[s.exam_id] = {
        status: s.status,
        submissionId: s.id,
      }
    }
  })

  return map
}

// ── Exam Session ───────────────────────────────────

export async function fetchExamById(examId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('exams')
    .select('id, title, duration_minutes, passing_score, total_points')
    .eq('id', examId)
    .eq('is_published', true)
    .single()

  if (error || !data) throw new Error('Exam not found or unavailable.')
  return data
}

export async function fetchQuestions(examId: string): Promise<Question[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('questions')
    .select(
      'id, question_text, question_type, points, options, correct_answer, explanation, order_number',
    )
    .eq('exam_id', examId)
    .order('order_number', { ascending: true })

  if (error || !data?.length)
    throw new Error('No questions found for this exam.')

  return data.map((q: any) => ({
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type,
    points: q.points,
    options: Array.isArray(q.options) ? q.options : null,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    order_number: q.order_number,
  }))
}

export async function checkSubmittedExam(
  userId: string,
  examId: string,
): Promise<string | null> {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('submissions')
    .select('id')
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .eq('status', 'submitted')
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}

// ── Submission / Answers ───────────────────────────────────

export async function fetchOrCreateSubmission(
  userId: string,
  examId: string,
): Promise<{ submissionId: string; startedAt: string; isResume: boolean }> {
  const supabase = getSupabase()

  const { data: inProg } = await supabase
    .from('submissions')
    .select('id, started_at')
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inProg) {
    return {
      submissionId: inProg.id,
      startedAt: inProg.started_at,
      isResume: true,
    }
  }

  const now = new Date().toISOString()

  const { data: newSub, error } = await supabase
    .from('submissions')
    .insert({
      exam_id: examId,
      student_id: userId,
      started_at: now,
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (error || !newSub) throw new Error('Could not start exam session.')

  return {
    submissionId: newSub.id,
    startedAt: now,
    isResume: false,
  }
}

export async function fetchSavedAnswers(
  submissionId: string,
): Promise<{ question_id: string; answer_text: string }[]> {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('answers')
    .select('question_id, answer_text')
    .eq('submission_id', submissionId)

  return (data ?? []).filter(
    (a: any) => a.question_id && a.answer_text,
  )
}

export async function fetchExamAttempts(
  userId: string,
  examId: string,
): Promise<ExamAttempt[]> {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('submissions')
    .select('id, exam_id, student_id, status, started_at, submitted_at, time_spent_seconds')
    .eq('student_id', userId)
    .eq('exam_id', examId)
    .order('created_at', { ascending: false })

  return (data ?? []) as ExamAttempt[]
}

export async function saveAnswer(
  submissionId: string,
  questionId: string,
  answer: string,
): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from('answers')
    .upsert(
      {
        submission_id: submissionId,
        question_id: questionId,
        answer_text: answer,
      },
      { onConflict: 'submission_id,question_id' },
    )
}

export async function submitExam(
  submissionId: string,
  startedAt: string,
  answers: AnswerMap,
  questions: Question[],
): Promise<void> {
  const supabase = getSupabase()

  const timeSpent = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / 1000,
  )

  const answerRows = questions.map((q) => ({
    submission_id: submissionId,
    question_id: q.id,
    answer_text: answers[q.id] ?? null,
  }))

  await supabase
    .from('answers')
    .upsert(answerRows, {
      onConflict: 'submission_id,question_id',
    })

  await supabase
    .from('submissions')
    .update({
      submitted_at: new Date().toISOString(),
      time_spent_seconds: timeSpent,
      status: 'submitted',
    })
    .eq('id', submissionId)
}

export async function createNewSubmission(
  userId: string,
  examId: string,
): Promise<{ submissionId: string; startedAt: string }> {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      exam_id: examId,
      student_id: userId,
      started_at: now,
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('Could not create new submission.')

  return {
    submissionId: data.id,
    startedAt: now,
  }
}