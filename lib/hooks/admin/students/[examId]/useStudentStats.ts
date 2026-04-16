// lib/hooks/admin/students/[examId]/useStudentStats.ts
import { useMemo } from 'react'
import type { Submission } from '@/lib/types/admin/students/[examId]/submission.types'

export interface StudentStats {
  releasedCount: number
  avgScore:      number | null
  passedCount:   number
}

export function useStudentStats(submissions: Submission[]): StudentStats {
  return useMemo(() => {
    // NOTE: DB status values are 'in_progress' | 'submitted' | 'graded'.
    // The original code filtered by 'released' which is not a valid DB status.
    // We filter by 'graded' (the final state) to compute meaningful stats.
    // Update this predicate if your app adds a 'released' status column.
    const graded = submissions.filter((s) => s.status === 'graded')
    const scores = graded
      .map((s) => s.percentage)
      .filter((v): v is number => v !== null)

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null

    const passedCount = graded.filter((s) => s.passed === true).length

    return { releasedCount: graded.length, avgScore, passedCount }
  }, [submissions])
}