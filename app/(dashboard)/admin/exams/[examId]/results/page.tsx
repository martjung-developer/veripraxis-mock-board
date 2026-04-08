// app/(dashboard)/admin/exams/[examId]/results/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BarChart2, ArrowLeft, Download, Search, X, Filter,
  ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Award, Users, TrendingUp, Clock, AlertCircle, RefreshCw,
  Activity, CheckSquare, Send,
} from 'lucide-react'
import s from './results.module.css'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
// Results page shows submissions with status 'reviewed' OR 'released'
type ResultStatus = 'reviewed' | 'released'

interface Result {
  id: string
  student: { id: string; full_name: string; email: string; student_id: string | null }
  score: number
  percentage: number
  passed: boolean
  submitted_at: string
  time_spent_seconds: number
  status: ResultStatus
}

interface AggregateAnalytics {
  total_attempts:  number
  average_score:   number | null
  highest_score:   number | null
  lowest_score:    number | null
  last_attempt_at: string | null
}

type ResultRaw = {
  id: string
  student_id: string | null
  score: number | null
  percentage: number | null
  passed: boolean | null
  submitted_at: string | null
  time_spent_seconds: number | null
  status: string
  profiles: { id: string; full_name: string | null; email: string } | { id: string; full_name: string | null; email: string }[] | null
  students: { student_id: string | null } | { student_id: string | null }[] | null
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  return `${m}m ${secs % 60}s`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PAGE_SIZE = 10

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(results: Result[]) {
  const headers = ['Rank', 'Name', 'Email', 'Student ID', 'Score', 'Percentage', 'Pass/Fail', 'Status', 'Time', 'Submitted']
  const rows = results.map((r, i) => [
    i + 1,
    r.student.full_name,
    r.student.email,
    r.student.student_id ?? '',
    r.score,
    `${r.percentage.toFixed(1)}%`,
    r.passed ? 'PASSED' : 'FAILED',
    r.status.charAt(0).toUpperCase() + r.status.slice(1),
    fmtTime(r.time_spent_seconds),
    new Date(r.submitted_at).toLocaleString('en-PH'),
  ])
  const csv  = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'exam-results.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { examId } = useParams<{ examId: string }>()
  const supabase = createClient()

  const [results,       setResults]       = useState<Result[]>([])
  const [analytics,     setAnalytics]     = useState<AggregateAnalytics | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [passFilter,    setPassFilter]    = useState<'all' | 'passed' | 'failed'>('all')
  const [statusFilter,  setStatusFilter]  = useState<ResultStatus | 'all'>('all')
  const [page,          setPage]          = useState(1)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Fetch submissions with status 'reviewed' OR 'released', ranked by percentage desc
    const { data, error: fetchErr } = await supabase
      .from('submissions')
      .select(`
        id, student_id, score, percentage, passed,
        submitted_at, time_spent_seconds, status,
        profiles:student_id ( id, full_name, email ),
        students:student_id ( student_id )
      `)
      .eq('exam_id', examId)
      .in('status', ['reviewed', 'released'])
      .not('percentage', 'is', null)
      .order('percentage', { ascending: false })

    if (fetchErr) { setError('Could not load results.'); setLoading(false); return }

    const rows = (data ?? []) as unknown as ResultRaw[]
    const mapped: Result[] = rows
      .filter(r => r.percentage != null && r.submitted_at != null)
      .map(r => {
        const profile = unwrap(r.profiles)
        const student = unwrap(r.students)
        return {
          id:          r.id,
          student: {
            id:         profile?.id        ?? r.student_id ?? '',
            full_name:  profile?.full_name ?? 'Unknown Student',
            email:      profile?.email     ?? '',
            student_id: student?.student_id ?? null,
          },
          score:              r.score      ?? 0,
          percentage:         r.percentage ?? 0,
          passed:             r.passed     ?? false,
          submitted_at:       r.submitted_at!,
          time_spent_seconds: r.time_spent_seconds ?? 0,
          status:             (r.status as ResultStatus),
        }
      })

    setResults(mapped)

    // Try analytics table first, fall back to computing from data
    const { data: analyticsRows } = await supabase
      .from('analytics')
      .select('total_attempts, average_score, highest_score, lowest_score, last_attempt_at')
      .eq('exam_id', examId)
      .is('student_id', null)
      .maybeSingle()

    if (analyticsRows) {
      setAnalytics(analyticsRows as AggregateAnalytics)
    } else {
      const pcts = mapped.map(r => r.percentage)
      setAnalytics(
        pcts.length > 0
          ? {
              total_attempts:  pcts.length,
              average_score:   pcts.reduce((a, b) => a + b, 0) / pcts.length,
              highest_score:   Math.max(...pcts),
              lowest_score:    Math.min(...pcts),
              last_attempt_at: mapped[0]?.submitted_at ?? null,
            }
          : null
      )
    }

    setLoading(false)
  }, [examId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => results.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || r.student.full_name.toLowerCase().includes(q)
      || r.student.email.toLowerCase().includes(q)
      || (r.student.student_id ?? '').toLowerCase().includes(q)
    const matchPass   = passFilter   === 'all' || (passFilter   === 'passed' ? r.passed : !r.passed)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchPass && matchStatus
  }), [results, search, passFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const passing    = results.filter(r => r.passed).length
  const failing    = results.length - passing
  const passRate   = results.length ? Math.round((passing / results.length) * 100) : 0
  const released   = results.filter(r => r.status === 'released').length
  const reviewed   = results.filter(r => r.status === 'reviewed').length

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  function rankBadge(rank: number) {
    if (rank === 1) return <span className={`${s.rankBadge} ${s.rankGold}`}>🥇</span>
    if (rank === 2) return <span className={`${s.rankBadge} ${s.rankSilver}`}>🥈</span>
    if (rank === 3) return <span className={`${s.rankBadge} ${s.rankBronze}`}>🥉</span>
    return <span className={`${s.rankBadge} ${s.rankDefault}`}>{rank}</span>
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><BarChart2 size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Results</h1>
              <p className={s.headingSub}>Read-only · Reviewed &amp; Released submissions</p>
            </div>
          </div>
          <div className={s.headerActions}>
            <button className={s.btnSecondary} onClick={fetchData} disabled={loading}>
              <RefreshCw size={13} className={loading ? s.spinner : ''} /> Refresh
            </button>
            <button
              className={s.btnExport}
              onClick={() => exportCSV(results)}
              disabled={loading || !results.length}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className={s.errorBanner}>
          <AlertCircle size={14} />{error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} /></button>
        </div>
      )}

      {/* Read-only notice */}
      <div className={s.readOnlyNotice}>
        <CheckSquare size={13} />
        <span>
          This page shows <strong>reviewed</strong> and <strong>released</strong> results only.
          To grade submissions, go to the <Link href={`/admin/exams/${examId}/submissions`} className={s.readOnlyLink}>Submissions</Link> page.
        </span>
        {reviewed > 0 && (
          <span className={s.pendingReleaseTag}>
            ⏳ {reviewed} reviewed, not yet released
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className={s.summaryGrid}>
        {[
          { icon: Users,       color: 'blue',   value: loading ? '—' : results.length,    label: 'Total Results' },
          { icon: CheckCircle, color: 'green',  value: loading ? '—' : passing,           label: 'Passed' },
          { icon: XCircle,     color: 'danger', value: loading ? '—' : failing,           label: 'Failed' },
          {
            icon: TrendingUp, color: 'amber',
            value: loading ? '—' : (analytics?.average_score != null ? `${analytics.average_score.toFixed(1)}%` : '—'),
            label: 'Avg Score',
          },
          {
            icon: Award, color: 'violet',
            value: loading ? '—' : (analytics?.highest_score != null ? `${analytics.highest_score.toFixed(1)}%` : '—'),
            label: 'Highest Score',
          },
          {
            icon: Activity, color: 'green',
            value: loading ? '—' : `${passRate}%`,
            label: 'Pass Rate',
            progress: passRate,
          },
        ].map((card, i) => (
          <div key={i} className={s.summaryCard}>
            <div className={`${s.summaryIcon} ${s[`summaryIcon_${card.color}`]}`}>
              <card.icon size={16} />
            </div>
            <div className={s.summaryValue}>{card.value}</div>
            <div className={s.summaryLabel}>{card.label}</div>
            {card.progress != null && (
              <div className={s.progressBar}>
                <div className={s.progressFill} style={{ width: `${card.progress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Release / Reviewed counts */}
      <div className={s.statusPills}>
        <div className={`${s.statusPill} ${s.statusPillReviewed}`}>
          <CheckSquare size={12} /> {reviewed} Reviewed
        </div>
        <div className={`${s.statusPill} ${s.statusPillReleased}`}>
          <Send size={12} /> {released} Released
        </div>
        {analytics?.last_attempt_at && (
          <div className={s.analyticsNote}>
            <Clock size={11} />
            Last attempt: {fmtDate(analytics.last_attempt_at)}
            {analytics.lowest_score != null && <> · Lowest: {analytics.lowest_score.toFixed(1)}%</>}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Search by name, email, or student ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && <button className={s.searchClear} onClick={() => { setSearch(''); setPage(1) }}><X size={13} /></button>}
        </div>
        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={passFilter}
            onChange={e => { setPassFilter(e.target.value as 'all' | 'passed' | 'failed'); setPage(1) }}>
            <option value="all">All Results</option>
            <option value="passed">Passed Only</option>
            <option value="failed">Failed Only</option>
          </select>
        </div>
        <div className={s.filterGroup}>
          <CheckSquare size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as ResultStatus | 'all'); setPage(1) }}>
            <option value="all">All Status</option>
            <option value="reviewed">Reviewed</option>
            <option value="released">Released</option>
          </select>
        </div>
        <p className={s.resultCount}><strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Student ID</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Pass/Fail</th>
                <th>Status</th>
                <th>Time</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className={s.skeletonRow}>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 28 }} /></td>
                    <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelAvatar}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 100, marginTop: 5 }} /></div></div></td>
                    {[70, 55, 70, 70, 80, 60, 50].map((w, j) => <td key={j}><div className={`${s.skeleton} ${s.skelText}`} style={{ width: w }} /></td>)}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><BarChart2 size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No results yet</p>
                    <p className={s.emptySub}>
                      Grade submissions first, then release results from the{' '}
                      <Link href={`/admin/exams/${examId}/submissions`} className={s.readOnlyLink}>Submissions</Link> page.
                    </p>
                  </div>
                </td></tr>
              ) : paginated.map((r, i) => {
                const rank = (page - 1) * PAGE_SIZE + i + 1
                return (
                  <tr key={r.id} className={`${s.tableRow} ${r.status === 'released' ? s.tableRowReleased : ''}`}>
                    <td>{rankBadge(rank)}</td>
                    <td>
                      <div className={s.studentCell}>
                        <div className={s.avatar}><span className={s.avatarInitials}>{initials(r.student.full_name)}</span></div>
                        <div>
                          <div className={s.studentName}>{r.student.full_name}</div>
                          <div className={s.studentEmail}>{r.student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={s.idChip}>{r.student.student_id ?? '—'}</span></td>
                    <td><span className={s.scoreRaw}>{r.score} pts</span></td>
                    <td>
                      <div className={s.percentCell}>
                        <span className={s.percentValue}>{r.percentage.toFixed(1)}%</span>
                        <div className={s.miniBar}>
                          <div
                            className={`${s.miniBarFill} ${r.passed ? s.miniBarPass : s.miniBarFail}`}
                            style={{ width: `${Math.min(r.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      {r.passed
                        ? <span className={s.badgePass}><CheckCircle size={11} /> Passed</span>
                        : <span className={s.badgeFail}><XCircle size={11} /> Failed</span>}
                    </td>
                    <td>
                      {r.status === 'released'
                        ? <span className={s.statusReleased}><Send size={11} /> Released</span>
                        : <span className={s.statusReviewed}><CheckSquare size={11} /> Reviewed</span>}
                    </td>
                    <td><span className={s.timeCell}>{fmtTime(r.time_spent_seconds)}</span></td>
                    <td><span className={s.dateCell}>{fmtDate(r.submitted_at)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className={s.pagination}>
            <span className={s.pageInfo}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} results
            </span>
            <div className={s.pageButtons}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} className={`${s.pageBtn} ${page === n ? s.pageBtnActive : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}