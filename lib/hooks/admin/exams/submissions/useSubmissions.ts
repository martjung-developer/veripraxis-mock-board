// lib/hooks/admin/exams/submissions/useSubmissions.ts
'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { createClient }              from '@/lib/supabase/client'
import * as SubmissionService        from '@/lib/services/admin/exams/submissions/submission.service'
import * as ExamService              from '@/lib/services/admin/exams/submissions/exam.service'
import { mapSubmission }             from '@/lib/utils/admin/submissions/mappers'
import { PAGE_SIZE, GRADEABLE_STATUSES } from '@/lib/utils/admin/submissions/constants'
import type { Submission, SubmissionStatus } from '@/lib/types/admin/exams/submissions/submission.types'
import type { ExamInfo }             from '@/lib/types/admin/exams/submissions/exam.types'

export interface UseSubmissionsReturn {
  submissions:     Submission[]
  examInfo:        ExamInfo | null
  loading:         boolean
  error:           string | null
  // Filters
  search:          string
  statusFilter:    SubmissionStatus | 'all'
  page:            number
  // Derived
  filtered:        Submission[]
  paginated:       Submission[]
  totalPages:      number
  reviewedCount:   number
  gradeableCount:  number
  // Actions
  setSearch:       (v: string)                        => void
  setStatusFilter: (v: SubmissionStatus | 'all')      => void
  setPage:         (v: number)                        => void
  setSubmissions:  React.Dispatch<React.SetStateAction<Submission[]>>
  refetch:         () => Promise<void>
  clearError:      () => void
}

export function useSubmissions(examId: string): UseSubmissionsReturn {
  const supabase = useMemo(() => createClient(), [])

  const [submissions,  setSubmissions]  = useState<Submission[]>([])
  const [examInfo,     setExamInfo]     = useState<ExamInfo | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all')
  const [page,         setPage]         = useState(1)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [examResult, subsResult] = await Promise.all([
      ExamService.getExamInfo(supabase, examId),
      SubmissionService.getSubmissionsByExam(supabase, examId),
    ])

    if (examResult.data) setExamInfo(examResult.data)
    if (subsResult.error) { setError(subsResult.error); setLoading(false); return }

    setSubmissions((subsResult.data ?? []).map(mapSubmission))
    setLoading(false)
  }, [supabase, examId])

  useEffect(() => { void refetch() }, [refetch])

  const filtered = useMemo(() => submissions.filter(sub => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || sub.student.full_name.toLowerCase().includes(q)
      || sub.student.email.toLowerCase().includes(q)
      || (sub.student.student_id ?? '').toLowerCase().includes(q)
    return matchSearch && (statusFilter === 'all' || sub.status === statusFilter)
  }), [submissions, search, statusFilter])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const reviewedCount  = useMemo(() => submissions.filter(s => s.status === 'reviewed').length,  [submissions])
  const gradeableCount = useMemo(() => submissions.filter(s => GRADEABLE_STATUSES.includes(s.status)).length, [submissions])

  return {
    submissions, examInfo, loading, error,
    search, statusFilter, page,
    filtered, paginated, totalPages, reviewedCount, gradeableCount,
    setSearch, setStatusFilter, setPage, setSubmissions,
    refetch, clearError: () => setError(null),
  }
}