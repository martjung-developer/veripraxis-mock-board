// lib/hooks/admin/exams/results/useExamResults.ts
// ─────────────────────────────────────────────────────────────────────────────
// Owns:
//  • Supabase fetching (via service layer)
//  • Filter + pagination state (memoised — no refetch on filter change)
//  • Summary computation (memoised)
//  • Stable refresh callback
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchResults, fetchAnalytics } from '@/lib/services/admin/exams/results/results.service'
import { computeSummary } from '@/lib/utils/admin/results/results.utils'
import { INITIAL_FILTERS } from '@/lib/types/admin/exams/results/results.types'
import type {
  Result,
  AggregateAnalytics,
  ResultFilters,
  ResultSummary,
  PassFilter,
  StatusFilter,
} from '@/lib/types/admin/exams/results/results.types'

const PAGE_SIZE = 10

export interface UseExamResultsReturn {
  // Data
  loading:   boolean
  error:     string | null
  analytics: AggregateAnalytics | null
  summary:   ResultSummary

  // Filters
  filters:    ResultFilters
  setSearch:  (v: string) => void
  setPass:    (v: PassFilter) => void
  setStatus:  (v: StatusFilter) => void

  // Pagination
  page:          number
  setPage:       React.Dispatch<React.SetStateAction<number>>
  totalPages:    number
  paginated:     Result[]
  totalFiltered: number

  // Actions
  refresh: () => Promise<void>

  // All results (for CSV export — exports current filter, not current page)
  filteredResults: Result[]
  allResults:      Result[]
}

export function useExamResults(examId: string): UseExamResultsReturn {
  const supabase   = useMemo(() => createClient(), [])
  const isMounted  = useRef(true)
  const isFetching = useRef(false)

  const [allResults, setAllResults] = useState<Result[]>([])
  const [analytics,  setAnalytics]  = useState<AggregateAnalytics | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [filters,    setFilters]    = useState<ResultFilters>(INITIAL_FILTERS)
  const [page,       setPage]       = useState(1)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (isFetching.current) return
    isFetching.current = true
    if (isMounted.current) { setLoading(true); setError(null) }

    const resultsOutcome = await fetchResults(supabase, examId)

    if (!resultsOutcome.ok) {
      if (isMounted.current) {
        setError(resultsOutcome.error.message)
        setLoading(false)
      }
      isFetching.current = false
      return
    }

    const results = resultsOutcome.results

    // Fetch analytics in parallel with no blocking — result is non-fatal
    const analyticsOutcome = await fetchAnalytics(supabase, examId, results)

    if (isMounted.current) {
      setAllResults(results)
      setAnalytics(analyticsOutcome.ok ? analyticsOutcome.analytics : null)
      setLoading(false)
    }

    isFetching.current = false
  }, [supabase, examId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ── Filter helpers ────────────────────────────────────────────────────────
  const setSearch = useCallback((v: string) => {
    setFilters((f) => ({ ...f, search: v }))
    setPage(1)
  }, [])

  const setPass = useCallback((v: PassFilter) => {
    setFilters((f) => ({ ...f, passFilter: v }))
    setPage(1)
  }, [])

  const setStatus = useCallback((v: StatusFilter) => {
    setFilters((f) => ({ ...f, statusFilter: v }))
    setPage(1)
  }, [])

  // ── Derived: filtered (memoised) ──────────────────────────────────────────
  const filteredResults = useMemo<Result[]>(() => {
    const q = filters.search.toLowerCase()
    return allResults.filter((r) => {
      if (
        q &&
        !r.student.full_name.toLowerCase().includes(q) &&
        !r.student.email.toLowerCase().includes(q) &&
        !(r.student.student_id ?? '').toLowerCase().includes(q)
      ) return false
      if (filters.passFilter === 'passed' && !r.passed)   return false
      if (filters.passFilter === 'failed' && r.passed)    return false
      if (filters.statusFilter !== 'all' && r.status !== filters.statusFilter) return false
      return true
    })
  }, [allResults, filters])

  // ── Derived: paginated (memoised) ─────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE))
  const paginated  = useMemo(
    () => filteredResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredResults, page],
  )

  // ── Derived: summary (memoised) ───────────────────────────────────────────
  const summary = useMemo(() => computeSummary(allResults), [allResults])

  return {
    loading, error, analytics, summary,
    filters, setSearch, setPass, setStatus,
    page, setPage, totalPages, paginated,
    totalFiltered: filteredResults.length,
    refresh,
    filteredResults,
    allResults,
  }
}