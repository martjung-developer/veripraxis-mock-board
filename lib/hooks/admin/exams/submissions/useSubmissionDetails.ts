// lib/hooks/admin/exams/submissions/useSubmissionDetails.ts
'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient }             from '@/lib/supabase/client'
import * as SubmissionService       from '@/lib/services/admin/exams/submissions/submission.service'
import { mapAnswer }                from '@/lib/utils/admin/submissions/mappers'
import type { Submission }          from '@/lib/types/admin/exams/submissions/submission.types'
import type {
  AnswerDetail,
  AnswerStats,
}                                   from '@/lib/types/admin/exams/submissions/answer.types'

export interface UseSubmissionDetailsReturn {
  viewTarget:     Submission | null
  answers:        AnswerDetail[]
  answersLoading: boolean
  answerStats:    AnswerStats
  openModal:      (sub: Submission) => Promise<void>
  closeModal:     () => void
  setAnswers:     React.Dispatch<React.SetStateAction<AnswerDetail[]>>
}

export function useSubmissionDetails(): UseSubmissionDetailsReturn {
  const supabase = useMemo(() => createClient(), [])

  const [viewTarget,     setViewTarget]     = useState<Submission | null>(null)
  const [answers,        setAnswers]        = useState<AnswerDetail[]>([])
  const [answersLoading, setAnswersLoading] = useState(false)

  const openModal = useCallback(async (sub: Submission) => {
    setViewTarget(sub)
    setAnswers([])
    setAnswersLoading(true)

    const result = await SubmissionService.getSubmissionAnswers(supabase, sub.id)

    if (result.data) {
      const mapped = result.data
        .map(mapAnswer)
        .sort((a, b) => (a.question?.order_number ?? 999) - (b.question?.order_number ?? 999))
      setAnswers(mapped)
    }

    setAnswersLoading(false)
  }, [supabase])

  const closeModal = useCallback(() => {
    setViewTarget(null)
    setAnswers([])
  }, [])

  const answerStats = useMemo<AnswerStats>(() => ({
    correct:   answers.filter(a => a.is_correct === true).length,
    incorrect: answers.filter(a => a.is_correct === false).length,
    pending:   answers.filter(a => a.is_correct === null).length,
    total:     answers.length,
  }), [answers])

  return {
    viewTarget, answers, answersLoading, answerStats,
    openModal, closeModal, setAnswers,
  }
}