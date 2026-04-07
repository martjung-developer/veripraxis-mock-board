// app/(dashboard)/admin/exams/[examId]/results/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BarChart2, ArrowLeft, Download, Search, X, Filter,
  ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Award, Users, TrendingUp, Clock, AlertCircle, RefreshCw,
  Activity, CheckSquare, MinusCircle, Eye,
} from 'lucide-react'
import s from './results.module.css'
import { createClient } from '@/lib/supabase/client'
import type { QuestionType } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────
// Grading status: all questions graded vs. some needing manual review
type GradingStatus = 'complete' | 'needs_review' | 'ungraded'

interface Result {
  id: string
  student: { id: string; full_name: string; email: string; student_id: string | null }
  score: number
  percentage: number
  passed: boolean
  submitted_at: string
  time_spent_seconds: number
  grading_status: GradingStatus
  pending_count: number
}

interface AggregateAnalytics {
  total_attempts:   number
  average_score:    number | null
  highest_score:    number | null
  lowest_score:     number | null
  last_attempt_at:  string | null
}

type ResultRaw = {
  id: string
  student_id: string | null
  score: number | null
  percentage: number | null
  passed: boolean | null
  submitted_at: string | null
  time_spent_seconds: number | null
  profiles: { id: string; full_name: string | null; email: string } | { id: string; full_name: string | null; email: string }[] | null
  students: { student_id: string | null } | { student_id: string | null }[] | null
}

// A slim answer row just to determine grading status
type AnswerStatusRaw = {
  submission_id: string
  is_correct: boolean | null
  questions: { question_type: string } | null
}

// ── AUTO-GRADE TYPES ──────────────────────────────────────────────────────────
// These types are automatically graded; others need manual review
const AUTO_GRADE_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']

function isManualType(type: string): boolean {
  return !AUTO_GRADE_TYPES.includes(type as QuestionType)
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
  const headers = ['Rank', 'Name', 'Email', 'Student ID', 'Score', 'Percentage', 'Status', 'Grading', 'Time', 'Submitted']
  const rows = results.map((r, i) => [
    i + 1, r.student.full_name, r.student.email, r.student.student_id ?? '',
    r.score, `${r.percentage.toFixed(1)}%`, r.passed ? 'PASSED' : 'FAILED',
    r.grading_status === 'complete' ? 'Complete' : r.grading_status === 'needs_review' ? 'Needs Review' : 'Ungraded',
    fmtTime(r.time_spent_seconds), new Date(r.submitted_at).toLocaleString('en-PH'),
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

  const [results,    setResults]    = useState<Result[]>([])
  const [analytics,  setAnalytics]  = useState<AggregateAnalytics | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [passFilter, setPassFilter] = useState<'all' | 'passed' | 'failed'>('all')
  const [gradingFilter, setGradingFilter] = useState<GradingStatus | 'all'>('all')
  const [page,       setPage]       = useState(1)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // 1. Fetch graded submissions ranked by percentage desc
    const { data, error: fetchErr } = await supabase
      .from('submissions')
      .select(`
        id, student_id, score, percentage, passed,
        submitted_at, time_spent_seconds,
        profiles:student_id ( id, full_name, email ),
        students:student_id ( student_id )
      `)
      .eq('exam_id', examId)
      .eq('status', 'graded')
      .not('percentage', 'is', null)
      .order('percentage', { ascending: false })

    if (fetchErr) { setError('Could not load results.'); setLoading(false); return }

    const rows = (data ?? []) as unknown as ResultRaw[]

    // 2. Fetch answer grading status for all these submissions to determine grading_status
    const submissionIds = rows.map(r => r.id)
    let answerStatuses: AnswerStatusRaw[] = []

    if (submissionIds.length > 0) {
      const { data: ansData } = await supabase
        .from('answers')
        .select('submission_id, is_correct, questions:question_id ( question_type )')
        .in('submission_id', submissionIds)

      answerStatuses = (ansData ?? []) as unknown as AnswerStatusRaw[]
    }

    // Group answer statuses by submission_id
    const answersBySubmission: Record<string, AnswerStatusRaw[]> = {}
    for (const a of answerStatuses) {
      if (!answersBySubmission[a.submission_id]) answersBySubmission[a.submission_id] = []
      answersBySubmission[a.submission_id].push(a)
    }

    const mapped: Result[] = rows
      .filter(r => r.percentage != null && r.submitted_at != null)
      .map(r => {
        const profile = unwrap(r.profiles)
        const student = unwrap(r.students)

        // Determine grading status for this submission
        const subAnswers = answersBySubmission[r.id] ?? []
        const pendingAnswers = subAnswers.filter(a => {
          const qType = a.questions?.question_type ?? ''
          // Manual types that haven't been graded yet
          return isManualType(qType) && a.is_correct === null
        })

        let grading_status: GradingStatus = 'complete'
        if (subAnswers.length === 0) {
          grading_status = 'ungraded'
        } else if (pendingAnswers.length > 0) {
          grading_status = 'needs_review'
        }

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
          grading_status,
          pending_count:      pendingAnswers.length,
        }
      })

    setResults(mapped)

    // 3. Try analytics table for aggregated data
    const { data: analyticsRows } = await supabase
      .from('analytics')
      .select('total_attempts, average_score, highest_score, lowest_score, last_attempt_at')
      .eq('exam_id', examId)
      .is('student_id', null)
      .maybeSingle()

    if (analyticsRows) {
      setAnalytics(analyticsRows as AggregateAnalytics)
    } else {
      const percentages = mapped.map(r => r.percentage)
      setAnalytics(
        percentages.length > 0
          ? {
              total_attempts:  percentages.length,
              average_score:   percentages.reduce((a, b) => a + b, 0) / percentages.length,
              highest_score:   Math.max(...percentages),
              lowest_score:    Math.min(...percentages),
              last_attempt_at: mapped[0]?.submitted_at ?? null,
            }
          : null
      )
    }

    setLoading(false)
  }, [examId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => results.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || r.student.full_name.toLowerCase().includes(q)
      || r.student.email.toLowerCase().includes(q)
      || (r.student.student_id ?? '').toLowerCase().includes(q)
    const matchPass    = passFilter === 'all'    || (passFilter === 'passed' ? r.passed : !r.passed)
    const matchGrading = gradingFilter === 'all' || r.grading_status === gradingFilter
    return matchSearch && matchPass && matchGrading
  }), [results, search, passFilter, gradingFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const passing      = results.filter(r => r.passed).length
  const failing      = results.length - passing
  const passRate     = results.length ? Math.round((passing / results.length) * 100) : 0
  const needsReview  = results.filter(r => r.grading_status === 'needs_review').length

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // Rank badge
  function rankBadge(rank: number) {
    if (rank === 1) return <span className={`${s.rankBadge} ${s.rankGold}`}>🥇</span>
    if (rank === 2) return <span className={`${s.rankBadge} ${s.rankSilver}`}>🥈</span>
    if (rank === 3) return <span className={`${s.rankBadge} ${s.rankBronze}`}>🥉</span>
    return <span className={`${s.rankBadge} ${s.rankDefault}`}>{rank}</span>
  }

  // Grading status badge
  function gradingBadge(status: GradingStatus, pendingCount: number) {
    if (status === 'complete') return (
      <span className={`${s.gradingBadge} ${s.gradingComplete}`}>
        <CheckSquare size={11} /> Complete
      </span>
    )
    if (status === 'needs_review') return (
      <span className={`${s.gradingBadge} ${s.gradingReview}`}>
        <MinusCircle size={11} /> {pendingCount} Pending
      </span>
    )
    return (
      <span className={`${s.gradingBadge} ${s.gradingUngraded}`}>
        <AlertCircle size={11} /> Ungraded
      </span>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><BarChart2 size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Results</h1>
              <p className={s.headingSub}>Graded exam results and performance overview</p>
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

      {/* ── Auto-grading notice ── */}
      <div className={s.autoGradeNotice}>
        <CheckCircle size={13} />
        <span>
          <strong>Auto-grading active</strong> · Multiple Choice, True/False, and Fill-in-the-Blank are graded automatically.
          Short Answer and Essay require manual review.
        </span>
        {needsReview > 0 && (
          <span className={s.reviewAlert}>⚠ {needsReview} submission{needsReview !== 1 ? 's' : ''} need review</span>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className={s.summaryGrid}>
        {[
          { icon: Users,      color: 'blue',   value: loading ? '—' : (analytics?.total_attempts ?? results.length), label: 'Total Graded' },
          { icon: CheckCircle,color: 'green',  value: loading ? '—' : passing,                                       label: 'Passed' },
          { icon: XCircle,    color: 'danger', value: loading ? '—' : failing,                                       label: 'Failed' },
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

      {/* Last attempt note */}
      {analytics?.last_attempt_at && (
        <div className={s.analyticsNote}>
          <Clock size={12} />
          Last attempt: {fmtDate(analytics.last_attempt_at)}
          {analytics.lowest_score != null && <> · Lowest score: {analytics.lowest_score.toFixed(1)}%</>}
        </div>
      )}

      {/* ── Filters ── */}
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
          <select className={s.filterSelect} value={gradingFilter}
            onChange={e => { setGradingFilter(e.target.value as GradingStatus | 'all'); setPage(1) }}>
            <option value="all">All Grading</option>
            <option value="complete">Complete</option>
            <option value="needs_review">Needs Review</option>
            <option value="ungraded">Ungraded</option>
          </select>
        </div>
        <p className={s.resultCount}>
          <strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Table ── */}
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
                <th>Grading</th>
                <th>Time</th>
                <th>Submitted</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className={s.skeletonRow}>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 28 }} /></td>
                    <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelAvatar}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 100, marginTop: 5 }} /></div></div></td>
                    {[70, 55, 70, 70, 80, 50, 60, 30].map((w, j) => <td key={j}><div className={`${s.skeleton} ${s.skelText}`} style={{ width: w }} /></td>)}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={10}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><BarChart2 size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No results yet</p>
                    <p className={s.emptySub}>Graded submissions will appear here once students complete the exam.</p>
                  </div>
                </td></tr>
              ) : paginated.map((r, i) => {
                const rank = (page - 1) * PAGE_SIZE + i + 1
                return (
                  <tr key={r.id} className={`${s.tableRow} ${r.grading_status === 'needs_review' ? s.tableRowReview : ''}`}>
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
                    <td>{gradingBadge(r.grading_status, r.pending_count)}</td>
                    <td><span className={s.timeCell}>{fmtTime(r.time_spent_seconds)}</span></td>
                    <td><span className={s.dateCell}>{fmtDate(r.submitted_at)}</span></td>
                    <td>
                      <Link
                        href={`/admin/exams/${examId}/submissions/${r.id}`}
                        className={s.actionView}
                        title="View Submission"
                      >
                        <Eye size={13} />
                      </Link>
                    </td>
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