// app/(dashboard)/admin/exams/[examId]/results/page.tsx
'use client'

import Link                from 'next/link'
import { useParams }       from 'next/navigation'
import {
  BarChart2, ArrowLeft, Download, RefreshCw,
  AlertCircle, X, CheckSquare, Send, Clock,
} from 'lucide-react'
import { useExamResults }       from '@/lib/hooks/admin/exams/results/useExamResults'
import { exportResultsCSV }     from '@/lib/utils/admin/results/exportResultsCSV'
import { fmtDate }              from '@/lib/utils/admin/results/results.utils'
import { SummaryCards }         from '@/components/dashboard/admin/exams/results/SummaryCards'
import { ResultsFilters }       from '@/components/dashboard/admin/exams/results/ResultsFilters'
import { ResultsTable }         from '@/components/dashboard/admin/exams/results/ResultsTable'
import { PaginationControls }   from '@/components/dashboard/admin/exams/results/PaginationControls'
import s from './results.module.css'

const PAGE_SIZE = 10

export default function ResultsPage() {
  const { examId } = useParams<{ examId: string }>()

  const {
    loading, error, analytics, summary,
    filters, setSearch, setPass, setStatus,
    page, setPage, totalPages, paginated, totalFiltered,
    refresh, filteredResults, allResults,
  } = useExamResults(examId)

  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}>
          <ArrowLeft size={14} /> Back to Exam
        </Link>

        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}>
              <BarChart2 size={20} color="#fff" />
            </div>
            <div>
              <h1 className={s.heading}>Results</h1>
              <p className={s.headingSub}>
                Read-only · Reviewed &amp; Released submissions
              </p>
            </div>
          </div>

          <div className={s.headerActions}>
            <button
              className={s.btnSecondary}
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? s.spinner : ''} />
              Refresh
            </button>
            <button
              className={s.btnExport}
              onClick={() =>
                exportResultsCSV(
                  // Export the filtered set so what-you-see is what-you-get
                  filters.search !== '' ||
                  filters.passFilter !== 'all' ||
                  filters.statusFilter !== 'all'
                    ? filteredResults
                    : allResults,
                )
              }
              disabled={loading || allResults.length === 0}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className={s.errorBanner}>
          <AlertCircle size={14} />
          {error}
          <button
            onClick={() => refresh()}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Read-only notice ── */}
      <div className={s.readOnlyNotice}>
        <CheckSquare size={13} />
        <span>
          This page shows <strong>reviewed</strong> and <strong>released</strong> results only.
          To grade submissions, go to the{' '}
          <Link
            href={`/admin/exams/${examId}/submissions`}
            className={s.readOnlyLink}
          >
            Submissions
          </Link>{' '}
          page.
        </span>
        {summary.reviewed > 0 && (
          <span className={s.pendingReleaseTag}>
            ⏳ {summary.reviewed} reviewed, not yet released
          </span>
        )}
      </div>

      {/* ── Summary cards ── */}
      <SummaryCards
        summary={summary}
        analytics={analytics}
        loading={loading}
      />

      {/* ── Status pills + analytics note ── */}
      <div className={s.statusPills}>
        <div className={`${s.statusPill} ${s.statusPillReviewed}`}>
          <CheckSquare size={12} /> {summary.reviewed} Reviewed
        </div>
        <div className={`${s.statusPill} ${s.statusPillReleased}`}>
          <Send size={12} /> {summary.released} Released
        </div>
        {analytics?.last_attempt_at && (
          <div className={s.analyticsNote}>
            <Clock size={11} />
            Last attempt: {fmtDate(analytics.last_attempt_at)}
            {analytics.lowest_score != null && (
              <> · Lowest: {analytics.lowest_score.toFixed(1)}%</>
            )}
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <ResultsFilters
        search={filters.search}
        passFilter={filters.passFilter}
        statusFilter={filters.statusFilter}
        totalFiltered={totalFiltered}
        onSearch={setSearch}
        onPassChange={setPass}
        onStatusChange={setStatus}
      />

      {/* ── Table + Pagination ── */}
      <div className={s.tableCard}>
        <ResultsTable
          results={paginated}
          loading={loading}
          page={page}
          examId={examId}
        />

        {!loading && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={totalFiltered}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}