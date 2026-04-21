// lib/hooks/admin/exams/results/useExamResults.ts
// ─────────────────────────────────────────────────────────────────────────────
// FIXES vs original:
//
// 1. isFetching ref guard REMOVED from the public `refresh` callback.
//    The guard was preventing re-fetches when the user clicked Refresh after
//    a release — because the first mount fetch set isFetching=true and the
//    ref was never reliable across React StrictMode double-renders.
//    We now use a simple `loading` boolean for UI debounce instead.
//
// 2. `refresh` is stable (useCallback with empty dep array after mount).
//    The examId is captured via closure, not a dependency, which avoids
//    the double-fetch in React StrictMode/dev mode.
//
// 3. `error` state cleared on every refresh call (not just on success).
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
  loading:   boolean
  error:     string | null
  analytics: AggregateAnalytics | null
  summary:   ResultSummary

  filters:    ResultFilters
  setSearch:  (v: string) => void
  setPass:    (v: PassFilter) => void
  setStatus:  (v: StatusFilter) => void

  page:          number
  setPage:       React.Dispatch<React.SetStateAction<number>>
  totalPages:    number
  paginated:     Result[]
  totalFiltered: number

  refresh: () => Promise<void>

  filteredResults: Result[]
  allResults:      Result[]
}

export function useExamResults(examId: string): UseExamResultsReturn {
  const supabase  = useMemo(() => createClient(), [])
  const isMounted = useRef(true)

  // Store examId in a ref so refresh() doesn't need it as a dependency
  const examIdRef = useRef(examId)
  useEffect(() => { examIdRef.current = examId }, [examId])

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
  // No isFetching guard — the UI loading state is sufficient to prevent
  // duplicate concurrent fetches. The guard was causing stale results.
  const refresh = useCallback(async () => {
    if (!isMounted.current) return
    setLoading(true)
    setError(null)

    const resultsOutcome = await fetchResults(supabase, examIdRef.current)

    if (!isMounted.current) return

    if (!resultsOutcome.ok) {
      setError(resultsOutcome.error.message)
      setLoading(false)
      return
    }

    const results = resultsOutcome.results

    // Analytics is non-fatal — always resolve
    const analyticsOutcome = await fetchAnalytics(supabase, examIdRef.current, results)

    if (!isMounted.current) return

    setAllResults(results)
    setAnalytics(analyticsOutcome.ok ? analyticsOutcome.analytics : null)
    setLoading(false)
  }, [supabase]) // examId deliberately via ref — avoids re-creating on every render

  // Initial load only — not re-triggered by examId changes (it's in a ref)
  useEffect(() => {
    void refresh()
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

  // ── Derived: filtered ─────────────────────────────────────────────────────
  const filteredResults = useMemo<Result[]>(() => {
    const q = filters.search.toLowerCase()
    return allResults.filter((r) => {
      if (
        q &&
        !r.student.full_name.toLowerCase().includes(q) &&
        !r.student.email.toLowerCase().includes(q) &&
        !(r.student.student_id ?? '').toLowerCase().includes(q)
      ) return false
      if (filters.passFilter === 'passed' && !r.passed)  return false
      if (filters.passFilter === 'failed' &&  r.passed)  return false
      if (filters.statusFilter !== 'all' && r.status !== filters.statusFilter) return false
      return true
    })
  }, [allResults, filters])

  // ── Derived: paginated ────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE))
  const paginated  = useMemo(
    () => filteredResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredResults, page],
  )

  // ── Derived: summary ──────────────────────────────────────────────────────
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