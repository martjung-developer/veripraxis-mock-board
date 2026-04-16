// lib/hooks/admin/exams/submissions/useGrading.ts
'use client'
import { useState, useCallback, useMemo } from 'react'
import { createClient }             from '@/lib/supabase/client'
import * as ExamService             from '@/lib/services/admin/exams/submissions/exam.service'
import * as SubmissionService       from '@/lib/services/admin/exams/submissions/submission.service'
import { gradeAnswer, sumPoints, computeScore } from '@/lib/utils/admin/submissions/grading'
import { AUTO_TYPES }               from '@/lib/utils/admin/submissions/constants'
import type { GradingMode, Submission } from '@/lib/types/admin/exams/submissions/submission.types'
import type { AnswerDetail }        from '@/lib/types/admin/exams/submissions/answer.types'
import type { ExamInfo, PreviewScore } from '@/lib/types/admin/exams/submissions/exam.types'

export interface UseGradingReturn {
  gradingMode:       GradingMode
  savingMode:        boolean
  gradingSubmission: boolean
  handleModeChange:  (mode: GradingMode, onLoadKey: () => Promise<void>, onShowKey: (v: boolean) => void, keyLoaded: boolean) => Promise<void>
  gradeSubmission:   (
    target: Submission,
    answers: AnswerDetail[],
    keyMap: Record<string, string | null>,
    examInfo: ExamInfo,
    onAnswersUpdate: (a: AnswerDetail[]) => void,
    onSubmissionUpdate: (patch: Partial<Submission>) => void,
    onClose: () => void,
  ) => Promise<void>
  handleAnswerCorrectToggle: (id: string, isCorrect: boolean, answers: AnswerDetail[], setAnswers: (a: AnswerDetail[]) => void) => void
  handlePointsChange:        (id: string, pts: number, answers: AnswerDetail[], setAnswers: (a: AnswerDetail[]) => void) => void
  handleFeedbackChange:      (id: string, fb: string, answers: AnswerDetail[], setAnswers: (a: AnswerDetail[]) => void) => void
  previewScore:      (answers: AnswerDetail[], examInfo: ExamInfo | null) => PreviewScore | null
  setGradingMode:    (m: GradingMode) => void
}

export function useGrading(examId: string): UseGradingReturn {
  const supabase = useMemo(() => createClient(), [])

  const [gradingMode,       setGradingMode]       = useState<GradingMode>('auto')
  const [savingMode,        setSavingMode]        = useState(false)
  const [gradingSubmission, setGradingSubmission] = useState(false)

  const handleModeChange = useCallback(async (
    mode: GradingMode,
    onLoadKey: () => Promise<void>,
    onShowKey: (v: boolean) => void,
    keyLoaded: boolean,
  ) => {
    setSavingMode(true)
    setGradingMode(mode)
    await ExamService.updateGradingMode(supabase, examId, mode)
    if (mode === 'manual' && !keyLoaded) {
      await onLoadKey()
      onShowKey(true)
    }
    setSavingMode(false)
  }, [supabase, examId])

  const gradeSubmission = useCallback(async (
    target: Submission,
    answers: AnswerDetail[],
    keyMap: Record<string, string | null>,
    examInfo: ExamInfo,
    onAnswersUpdate: (a: AnswerDetail[]) => void,
    onSubmissionUpdate: (patch: Partial<Submission>) => void,
    onClose: () => void,
  ) => {
    setGradingSubmission(true)

    const gradedAnswers = answers.map(ans => {
      if (!ans.question) return ans
      if (ans.is_correct === null && AUTO_TYPES.includes(ans.question.question_type)) {
        const key = gradingMode === 'manual'
          ? (keyMap[ans.question_id] ?? ans.question.correct_answer)
          : ans.question.correct_answer
        const result = gradeAnswer(ans.answer_text, key, ans.question.question_type, ans.question.points)
        return { ...ans, ...result }
      }
      return ans
    })

    const earned = sumPoints(gradedAnswers.map(a => a.points_earned))
    const { percentage, passed } = computeScore(earned, examInfo.total_points, examInfo.passing_score)

    for (const a of gradedAnswers) {
      await SubmissionService.updateAnswer(supabase, a.id, {
        is_correct:    a.is_correct,
        points_earned: a.points_earned,
        feedback:      a.feedback || null,
      })
    }

    await SubmissionService.updateSubmission(supabase, target.id, {
      score: earned, percentage, passed, status: 'reviewed',
    })

    onAnswersUpdate(gradedAnswers)
    onSubmissionUpdate({ score: earned, percentage, passed, status: 'reviewed' })
    setGradingSubmission(false)
    onClose()
  }, [supabase, gradingMode])

  const handleAnswerCorrectToggle = useCallback((
    id: string, isCorrect: boolean,
    answers: AnswerDetail[], setAnswers: (a: AnswerDetail[]) => void,
  ) => {
    setAnswers(answers.map(a => {
      if (a.id !== id) return a
      return { ...a, is_correct: isCorrect, points_earned: isCorrect ? (a.question?.points ?? 0) : 0 }
    }))
  }, [])

  const handlePointsChange = useCallback((
    id: string, pts: number,
    answers: AnswerDetail[], setAnswers: (a: AnswerDetail[]) => void,
  ) => {
    setAnswers(answers.map(a => a.id === id ? { ...a, points_earned: pts } : a))
  }, [])

  const handleFeedbackChange = useCallback((
    id: string, fb: string,
    answers: AnswerDetail[], setAnswers: (a: AnswerDetail[]) => void,
  ) => {
    setAnswers(answers.map(a => a.id === id ? { ...a, feedback: fb } : a))
  }, [])

  const previewScore = useCallback((
    answers: AnswerDetail[], examInfo: ExamInfo | null,
  ): PreviewScore | null => {
    if (!examInfo || answers.length === 0) return null
    const earned = sumPoints(answers.map(a => a.points_earned))
    const pct = examInfo.total_points > 0 ? (earned / examInfo.total_points) * 100 : 0
    return { earned, pct, passed: pct >= examInfo.passing_score }
  }, [])

  return {
    gradingMode, savingMode, gradingSubmission,
    handleModeChange, gradeSubmission,
    handleAnswerCorrectToggle, handlePointsChange, handleFeedbackChange,
    previewScore, setGradingMode,
  }
}