// lib/hooks/admin/exams/submissions/useBulkGrading.ts
'use client'
import { useState, useCallback, useMemo } from 'react'
import { createClient }          from '@/lib/supabase/client'
import * as SubmissionService    from '@/lib/services/admin/exams/submissions/submission.service'
import { gradeAnswer, sumPoints, computeScore } from '@/lib/utils/admin/submissions/grading'
import { AUTO_TYPES }            from '@/lib/utils/admin/submissions/constants'
import type { Submission, GradingMode } from '@/lib/types/admin/exams/submissions/submission.types'
import type { ExamInfo }         from '@/lib/types/admin/exams/submissions/exam.types'
import type { QuestionType }     from '@/lib/types/database'

interface BulkAnsRaw {
  id:          string
  question_id: string | null
  answer_text: string | null
  questions: {
    question_type:  string
    points:         number
    correct_answer: string | null
  } | null
}

export interface UseBulkGradingReturn {
  bulkGrading:  boolean
  bulkProgress: { done: number; total: number } | null
  bulkGradeAll: (
    submissions:  Submission[],
    examInfo:     ExamInfo,
    gradingMode:  GradingMode,
    keyMap:       Record<string, string | null>,
    onUpdate:     (id: string, patch: Partial<Submission>) => void,
  ) => Promise<void>
}

export function useBulkGrading(): UseBulkGradingReturn {
  const supabase = useMemo(() => createClient(), [])
  const [bulkGrading,  setBulkGrading]  = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  const bulkGradeAll = useCallback(async (
    submissions: Submission[],
    examInfo:    ExamInfo,
    gradingMode: GradingMode,
    keyMap:      Record<string, string | null>,
    onUpdate:    (id: string, patch: Partial<Submission>) => void,
  ) => {
    const gradeable = submissions.filter(s => ['submitted', 'graded'].includes(s.status))
    if (!gradeable.length) return

    setBulkGrading(true)
    setBulkProgress({ done: 0, total: gradeable.length })

    for (let i = 0; i < gradeable.length; i++) {
      const sub = gradeable[i]
      const { data: ansData } = await supabase
        .from('answers')
        .select('id, question_id, answer_text, questions:question_id ( question_type, points, correct_answer )')
        .eq('submission_id', sub.id)

      if (!ansData) { setBulkProgress({ done: i + 1, total: gradeable.length }); continue }

      let totalEarned = 0
      for (const row of ansData as unknown as BulkAnsRaw[]) {
        const q = row.questions
        if (!q) continue
        const isValidType = ['multiple_choice','true_false','short_answer','essay','matching','fill_blank'].includes(q.question_type)
        if (!isValidType) continue
        const qType = q.question_type as QuestionType
        const key = gradingMode === 'manual'
          ? (keyMap[row.question_id ?? ''] ?? q.correct_answer)
          : q.correct_answer
        const { is_correct, points_earned } = gradeAnswer(row.answer_text, key, qType, q.points)
        totalEarned += points_earned
        await SubmissionService.updateAnswer(supabase, row.id, { is_correct, points_earned })
      }

      const { percentage, passed } = computeScore(totalEarned, examInfo.total_points, examInfo.passing_score)
      await SubmissionService.updateSubmission(supabase, sub.id, {
        score: totalEarned, percentage, passed, status: 'reviewed',
      })
      onUpdate(sub.id, { score: totalEarned, percentage, passed, status: 'reviewed' })
      setBulkProgress({ done: i + 1, total: gradeable.length })
    }

    setBulkGrading(false)
    setBulkProgress(null)
  }, [supabase])

  return { bulkGrading, bulkProgress, bulkGradeAll }
}

// ── useReleaseResults ─────────────────────────────────────────────────────────

export interface UseReleaseResultsReturn {
  releasing:      boolean
  releaseResults: (
    submissions: Submission[],
    onUpdate:    (id: string, patch: Partial<Submission>) => void,
  ) => Promise<void>
}

export function useReleaseResults(): UseReleaseResultsReturn {
  const supabase = useMemo(() => createClient(), [])
  const [releasing, setReleasing] = useState(false)

  const releaseResults = useCallback(async (
    submissions: Submission[],
    onUpdate:    (id: string, patch: Partial<Submission>) => void,
  ) => {
    const reviewed = submissions.filter(s => s.status === 'reviewed')
    if (!reviewed.length) return

    setReleasing(true)
    const now = new Date().toISOString()
    for (const sub of reviewed) {
      await supabase
        .from('submissions')
        .update({ status: 'released', released_at: now })
        .eq('id', sub.id)
      onUpdate(sub.id, { status: 'released' })
    }
    setReleasing(false)
  }, [supabase])

  return { releasing, releaseResults }
}