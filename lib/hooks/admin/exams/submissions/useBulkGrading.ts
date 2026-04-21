// lib/hooks/admin/exams/submissions/useBulkGrading.ts
// ─────────────────────────────────────────────────────────────────────────────
// FIX F: useReleaseResults now uses `satisfies SubmissionUpdate` instead of
// an unsafe `as Record<string, unknown>` cast. This works because
// database.ts.submissions.Update now includes:
//   status?:      SubmissionStatus   (which includes 'released')
//   released_at?: string | null
//
// FIX G: useBulkGrading.bulkGradeAll graded both 'submitted' AND 'graded'
// rows in the loop, but GRADEABLE_STATUSES in constants was only ['submitted'].
// Both are now ['submitted', 'graded'] — the filter in the loop and the
// constant match exactly, so gradeableCount in useSubmissions is accurate.
// ─────────────────────────────────────────────────────────────────────────────

'use client'
import { useState, useCallback, useMemo } from 'react'
import { createClient }          from '@/lib/supabase/client'
import * as SubmissionService    from '@/lib/services/admin/exams/submissions/submission.service'
import { gradeAnswer, sumPoints, computeScore } from '@/lib/utils/admin/submissions/grading'
import { AUTO_TYPES, GRADEABLE_STATUSES, RELEASABLE_STATUSES } from '@/lib/utils/admin/submissions/constants'
import type {
  Submission,
  GradingMode,
} from '@/lib/types/admin/exams/submissions/submission.types'
import type { ExamInfo }         from '@/lib/types/admin/exams/submissions/exam.types'
import type { QuestionType }     from '@/lib/types/database'
import type { Database }         from '@/lib/types/database'

type SubmissionUpdate = Database['public']['Tables']['submissions']['Update']

// ── BulkAnsRaw ────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// useBulkGrading
// ─────────────────────────────────────────────────────────────────────────────

export interface UseBulkGradingReturn {
  bulkGrading:  boolean
  bulkProgress: { done: number; total: number } | null
  bulkGradeAll: (
    submissions: Submission[],
    examInfo:    ExamInfo,
    gradingMode: GradingMode,
    keyMap:      Record<string, string | null>,
    onUpdate:    (id: string, patch: Partial<Submission>) => void,
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
    // FIX G: Use the same GRADEABLE_STATUSES constant as useSubmissions so
    // the count shown in the panel and the rows actually processed are identical.
    const gradeable = submissions.filter(s => GRADEABLE_STATUSES.includes(s.status))
    if (!gradeable.length) return

    setBulkGrading(true)
    setBulkProgress({ done: 0, total: gradeable.length })

    const VALID_TYPES = new Set<string>([
      'multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank',
    ])

    for (let i = 0; i < gradeable.length; i++) {
      const sub = gradeable[i]

      const { data: ansData } = await supabase
        .from('answers')
        .select(
          'id, question_id, answer_text, ' +
          'questions:question_id ( question_type, points, correct_answer )',
        )
        .eq('submission_id', sub.id)

      if (!ansData) {
        setBulkProgress({ done: i + 1, total: gradeable.length })
        continue
      }

      let totalEarned = 0

      for (const row of ansData as unknown as BulkAnsRaw[]) {
        const q = row.questions
        if (!q || !VALID_TYPES.has(q.question_type)) continue

        const qType = q.question_type as QuestionType
        const key   = gradingMode === 'manual'
          ? (keyMap[row.question_id ?? ''] ?? q.correct_answer)
          : q.correct_answer

        const { is_correct, points_earned } = gradeAnswer(
          row.answer_text, key, qType, q.points,
        )
        totalEarned += points_earned

        await SubmissionService.updateAnswer(supabase, row.id, { is_correct, points_earned })
      }

      const { percentage, passed } = computeScore(
        totalEarned, examInfo.total_points, examInfo.passing_score,
      )

      // FIX G: use satisfies for compile-time type safety
      const patch = {
        score:      totalEarned,
        percentage,
        passed,
        status:     'reviewed',
      } satisfies SubmissionUpdate

      await SubmissionService.updateSubmission(supabase, sub.id, patch)

      onUpdate(sub.id, {
        score:      totalEarned,
        percentage,
        passed,
        status:     'reviewed',
      })
      setBulkProgress({ done: i + 1, total: gradeable.length })
    }

    setBulkGrading(false)
    setBulkProgress(null)
  }, [supabase])

  return { bulkGrading, bulkProgress, bulkGradeAll }
}

// ─────────────────────────────────────────────────────────────────────────────
// useReleaseResults
// ─────────────────────────────────────────────────────────────────────────────

export interface UseReleaseResultsReturn {
  releasing:      boolean
  releaseResults: (
    submissions: Submission[],
    onUpdate:    (id: string, patch: Partial<Submission>) => void,
  ) => Promise<void>
}

export function useReleaseResults(): UseReleaseResultsReturn {
  const supabase  = useMemo(() => createClient(), [])
  const [releasing, setReleasing] = useState(false)

  const releaseResults = useCallback(async (
    submissions: Submission[],
    onUpdate:    (id: string, patch: Partial<Submission>) => void,
  ) => {
    // FIX F-1: Use RELEASABLE_STATUSES constant — only 'reviewed' rows qualify.
    // Previously this was an inline filter that could get out of sync.
    const toRelease = submissions.filter(s => RELEASABLE_STATUSES.includes(s.status))
    if (!toRelease.length) return

    setReleasing(true)
    const now = new Date().toISOString()

    for (const sub of toRelease) {
      // FIX F-2: `satisfies SubmissionUpdate` replaces the old
      // `as Record<string, unknown>` unsafe cast.
      // This works because database.ts now has:
      //   status?:      SubmissionStatus  (which includes 'released')
      //   released_at?: string | null
      const patch = {
        status:      'released',
        released_at: now,
      } satisfies SubmissionUpdate

      const { error } = await supabase
        .from('submissions')
        .update(patch)
        .eq('id', sub.id)

      if (error) {
        console.error('[useReleaseResults] failed to release submission:', sub.id, error.message)
        continue
      }

      onUpdate(sub.id, { status: 'released' })
    }

    setReleasing(false)
  }, [supabase])

  return { releasing, releaseResults }
}