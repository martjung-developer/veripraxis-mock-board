// app/(dashboard)/student/progress/page.tsx
//
// Thin orchestration layer — no Supabase calls, no business logic.
// All data fetching lives in useProgress(); all UI state is filter + loading.

'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, Clock, BarChart2 } from 'lucide-react'

import { useProgress }       from '@/lib/hooks/student/progress/useProgress'
import { sliceTimeline }     from '@/lib/utils/student/progress/buildTimeline'
import type { FilterRange }  from '@/lib/types/student/progress/progress.types'
import { BAR_COLORS, STUDY_DIST } from '@/lib/types/student/progress/progress.types'

import { ProgressHeader }    from '@/components/dashboard/student/progress/ProgressHeader'
import { StatCards }         from '@/components/dashboard/student/progress/StatCards'
import { LineChart }         from '@/components/dashboard/student/progress/LineChart'
import { DonutChart }        from '@/components/dashboard/student/progress/DonutChart'
import { RecentExamsTable }  from '@/components/dashboard/student/progress/RecentExamsTable'
import {
  SkeletonStatGrid,
  SkeletonChart,
  SkeletonBarList,
  SkeletonTable,
  SkeletonDonut,
} from '@/components/dashboard/student/progress/ProgressSkeleton'

import styles from './progress.module.css'

// ── Animation helpers (display-only, kept in page) ────────────────────────────

function animatedBarDuration(pct: number): string {
  return `${(0.7 + Math.min(pct / 100, 1) * 0.5).toFixed(2)}s cubic-bezier(0.16, 1, 0.3, 1)`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { metrics, loading, error, refetch } = useProgress()
  const [filter, setFilter] = useState<FilterRange>('30d')

  // Slice timeline to the selected date range
  const visibleTimeline = useMemo(
    () => metrics ? sliceTimeline(metrics.scoreTimeline, filter) : [],
    [metrics, filter],
  )

  const isEmpty = !loading && metrics && !metrics.hasData

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Header + filter pills */}
      <ProgressHeader
        loading={loading}
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={refetch}
      />

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Pending submissions notice */}
      {!loading && metrics && metrics.pendingCount > 0 && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #fde68a',
          borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '0.5rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}>
          <Clock size={15} color="#d97706" style={{ flexShrink: 0 }} aria-hidden />
          <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0 }}>
            <strong>{metrics.pendingCount}</strong>{' '}
            submission{metrics.pendingCount > 1 ? 's' : ''} pending faculty review — scores will appear once released.
          </p>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className={styles.emptyState}>
          <BarChart2 size={40} strokeWidth={1.4} color="#cbd5e1" aria-hidden />
          <p className={styles.emptyTitle}>No exam data yet</p>
          <p className={styles.emptyText}>
            Take your first mock exam and your progress will appear here.
          </p>
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      {loading
        ? <SkeletonStatGrid />
        : metrics && <StatCards metrics={metrics} />}

      {/* ── Charts row (only when not empty) ────────────────────────────── */}
      {!isEmpty && (
        <div className={styles.row2}>
          {/* Performance over time */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Performance Over Time</span>
              <span className={styles.cardHint}>score % (released exams)</span>
            </div>
            <div className={styles.lineWrap}>
              {loading
                ? <SkeletonChart />
                : <LineChart data={visibleTimeline} />}
            </div>
          </div>

          {/* Scores by subject */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Scores by Subject</span>
              <span className={styles.cardHint}>avg %</span>
            </div>
            {loading ? (
              <SkeletonBarList />
            ) : metrics?.categoryAverages.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                No subject data yet.
              </p>
            ) : (
              <div className={styles.barList}>
                {(metrics?.categoryAverages ?? []).map((item, idx) => (
                  <div key={item.label} className={styles.barRow}>
                    <div className={styles.barLabelWrap}>
                      <span
                        className={styles.barDot}
                        style={{ background: BAR_COLORS[idx % BAR_COLORS.length] }}
                      />
                      <span className={styles.barLabel}>{item.label}</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width:      `${item.score}%`,
                          background: BAR_COLORS[idx % BAR_COLORS.length],
                          transition: `width ${animatedBarDuration(item.score)}`,
                        }}
                      />
                    </div>
                    <span
                      className={styles.barValue}
                      style={{ color: BAR_COLORS[idx % BAR_COLORS.length] }}
                    >
                      {item.score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recent exams + study distribution ───────────────────────────── */}
      {!isEmpty && (
        <div className={styles.row2wide}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Recent Exams</span>
              <span className={styles.cardHint}>last 5 attempts</span>
            </div>
            {loading
              ? <SkeletonTable />
              : <RecentExamsTable items={metrics?.recentItems ?? []} />}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Study Distribution</span>
            </div>
            {loading
              ? <SkeletonDonut />
              : <DonutChart slices={STUDY_DIST} />}
          </div>
        </div>
      )}

    </div>
  )
}