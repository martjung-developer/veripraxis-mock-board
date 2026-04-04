// app/(dashboard)/admin/exams/[examId]/results/page.tsx

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BarChart2, ArrowLeft, Download, Search, X, Filter,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Award, Users, TrendingUp
} from 'lucide-react'
import s from './results.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Result {
  id: string
  student: { id: string; full_name: string; email: string; student_id: string | null }
  score: number
  percentage: number
  passed: boolean
  submitted_at: string
  time_spent_seconds: number
}

// ── Dummy data ────────────────────────────────────────────────────────────────
const NAMES = [
  'Maria Santos', 'Juan dela Cruz', 'Ana Reyes', 'Carlo Mendoza', 'Liza Villanueva',
  'Ramon Garcia', 'Rosa Cruz', 'Miguel Torres', 'Elena Bautista', 'Jose Ramos',
  'Carla Pascual', 'Paolo Dela Rosa', 'Diana Castillo', 'Renzo Aquino', 'Sophia Navarro',
  'Ivan Mercado', 'Fatima Yusof', 'Benedict Orozco', 'Stella Manalo', 'Gio Hernandez',
]

function generateDummyResults(examId: string): Result[] {
  return NAMES.map((name, i) => {
    const pct = Math.floor(45 + Math.random() * 55)
    return {
      id: `res-${examId}-${i + 1}`,
      student: {
        id: `stu-${i + 1}`,
        full_name: name,
        email: name.toLowerCase().replace(/ /g, '.') + '@school.edu.ph',
        student_id: `2024-${String(1001 + i).padStart(5, '0')}`,
      },
      score: Math.floor(pct),
      percentage: pct,
      passed: pct >= 75,
      submitted_at: new Date(Date.now() - i * 3600000 * 6).toISOString(),
      time_spent_seconds: Math.floor(2000 + Math.random() * 3600),
    }
  }).sort((a, b) => b.percentage - a.percentage)
}

const PAGE_SIZE = 10

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(results: Result[]) {
  const headers = ['Rank', 'Student Name', 'Email', 'Student ID', 'Score', 'Percentage', 'Status', 'Time Spent', 'Submitted At']
  const rows = results.map((r, i) => [
    i + 1,
    r.student.full_name,
    r.student.email,
    r.student.student_id ?? '',
    r.score,
    `${r.percentage}%`,
    r.passed ? 'PASSED' : 'FAILED',
    fmtTime(r.time_spent_seconds),
    new Date(r.submitted_at).toLocaleString('en-PH'),
  ])
  const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'exam-results.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { examId } = useParams<{ examId: string }>()
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [passFilter, setPassFilter] = useState<'all' | 'passed' | 'failed'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => { setResults(generateDummyResults(examId)); setLoading(false) }, 700)
    return () => clearTimeout(t)
  }, [examId])

  const filtered = results.filter(r => {
    const matchSearch = !search || r.student.full_name.toLowerCase().includes(search.toLowerCase()) || r.student.email.toLowerCase().includes(search.toLowerCase())
    const matchPass = passFilter === 'all' || (passFilter === 'passed' ? r.passed : !r.passed)
    return matchSearch && matchPass
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Aggregate stats
  const passing = results.filter(r => r.passed).length
  const failing = results.length - passing
  const avgPct = results.length ? (results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(1) : '—'
  const highScore = results.length ? Math.max(...results.map(r => r.percentage)) : null
  const passRate = results.length ? Math.round((passing / results.length) * 100) : 0

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

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
              <p className={s.headingSub}>Graded exam results and performance overview</p>
            </div>
          </div>
          <button className={s.btnExport} onClick={() => exportCSV(results)} disabled={loading || !results.length}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={s.summaryGrid}>
        <div className={s.summaryCard}>
          <div className={`${s.summaryIcon} ${s.summaryIcon_blue}`}><Users size={16} /></div>
          <div className={s.summaryValue}>{results.length}</div>
          <div className={s.summaryLabel}>Total Graded</div>
        </div>
        <div className={s.summaryCard}>
          <div className={`${s.summaryIcon} ${s.summaryIcon_green}`}><CheckCircle size={16} /></div>
          <div className={s.summaryValue}>{passing}</div>
          <div className={s.summaryLabel}>Passed</div>
        </div>
        <div className={s.summaryCard}>
          <div className={`${s.summaryIcon} ${s.summaryIcon_danger}`}><XCircle size={16} /></div>
          <div className={s.summaryValue}>{failing}</div>
          <div className={s.summaryLabel}>Failed</div>
        </div>
        <div className={s.summaryCard}>
          <div className={`${s.summaryIcon} ${s.summaryIcon_amber}`}><TrendingUp size={16} /></div>
          <div className={s.summaryValue}>{avgPct}%</div>
          <div className={s.summaryLabel}>Avg Score</div>
        </div>
        <div className={s.summaryCard}>
          <div className={`${s.summaryIcon} ${s.summaryIcon_violet}`}><Award size={16} /></div>
          <div className={s.summaryValue}>{highScore != null ? `${highScore}%` : '—'}</div>
          <div className={s.summaryLabel}>Highest Score</div>
        </div>
        <div className={s.summaryCard}>
          <div className={`${s.summaryIcon} ${s.summaryIcon_green}`}><CheckCircle size={16} /></div>
          <div className={s.summaryValue}>{passRate}%</div>
          <div className={s.summaryLabel}>Pass Rate</div>
          <div className={s.progressBar}>
            <div className={s.progressFill} style={{ width: `${passRate}%` }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input className={s.searchInput} placeholder="Search by name or email…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {search && <button className={s.searchClear} onClick={() => { setSearch(''); setPage(1) }}><X size={13} /></button>}
        </div>
        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={passFilter}
            onChange={e => { setPassFilter(e.target.value as any); setPage(1) }}>
            <option value="all">All Results</option>
            <option value="passed">Passed Only</option>
            <option value="failed">Failed Only</option>
          </select>
        </div>
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
                <th>Status</th>
                <th>Time</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className={s.skeletonRow}>
                  <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 24 }} /></td>
                  <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelAvatar}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 100, marginTop: 5 }} /></div></div></td>
                  {[70,55,60,70,50,60].map((w,j) => <td key={j}><div className={`${s.skeleton} ${s.skelText}`} style={{ width: w }} /></td>)}
                </tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><BarChart2 size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No results found</p>
                    <p className={s.emptySub}>Graded submissions will appear here.</p>
                  </div>
                </td></tr>
              ) : paginated.map((r, i) => {
                const rank = (page - 1) * PAGE_SIZE + i + 1
                return (
                  <tr key={r.id} className={s.tableRow}>
                    <td>
                      <span className={`${s.rankBadge} ${rank === 1 ? s.rankGold : rank === 2 ? s.rankSilver : rank === 3 ? s.rankBronze : s.rankDefault}`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </span>
                    </td>
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
                        <span className={s.percentValue}>{r.percentage}%</span>
                        <div className={s.miniBar}>
                          <div className={`${s.miniBarFill} ${r.passed ? s.miniBarPass : s.miniBarFail}`} style={{ width: `${r.percentage}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      {r.passed
                        ? <span className={s.badgePass}><CheckCircle size={11} /> Passed</span>
                        : <span className={s.badgeFail}><XCircle size={11} /> Failed</span>}
                    </td>
                    <td><span className={s.timeCell}>{fmtTime(r.time_spent_seconds)}</span></td>
                    <td><span className={s.dateCell}>{fmt(r.submitted_at)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className={s.pagination}>
            <span className={s.pageInfo}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} results</span>
            <div className={s.pageButtons}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n =>
                <button key={n} className={`${s.pageBtn} ${page === n ? s.pageBtnActive : ''}`} onClick={() => setPage(n)}>{n}</button>
              )}
              <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}