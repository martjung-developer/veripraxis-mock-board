// app/(dashboard)/admin/exams/[examId]/submissions/page.tsx

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ClipboardList, ArrowLeft, Search, X, Eye, Pencil,
  Loader2, ChevronLeft, ChevronRight, Filter,
  CheckCircle, Clock, AlertCircle, XCircle
} from 'lucide-react'
import s from './submissions.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type SubmissionStatus = 'in_progress' | 'submitted' | 'graded'

interface Submission {
  id: string
  student: { id: string; full_name: string; email: string }
  started_at: string
  submitted_at: string | null
  time_spent_seconds: number | null
  status: SubmissionStatus
  score: number | null
  percentage: number | null
  passed: boolean | null
}

// ── Dummy data ────────────────────────────────────────────────────────────────
const NAMES = [
  'Maria Santos', 'Juan dela Cruz', 'Ana Reyes', 'Carlo Mendoza', 'Liza Villanueva',
  'Ramon Garcia', 'Rosa Cruz', 'Miguel Torres', 'Elena Bautista', 'Jose Ramos',
  'Carla Pascual', 'Paolo Dela Rosa', 'Diana Castillo', 'Renzo Aquino', 'Sophia Navarro',
  'Ivan Mercado', 'Fatima Yusof', 'Benedict Orozco', 'Stella Manalo', 'Gio Hernandez',
  'Amy Tan', 'Bernard Lim', 'Cecile Ong', 'Dennis Sy', 'Eva Chua',
]

function generateDummySubmissions(examId: string): Submission[] {
  const statuses: SubmissionStatus[] = ['in_progress', 'submitted', 'graded']
  return NAMES.map((name, i) => {
    const status = statuses[i % statuses.length]
    const pct = status === 'graded' ? Math.floor(55 + Math.random() * 45) : null
    return {
      id: `sub-${examId}-${i + 1}`,
      student: {
        id: `stu-${i + 1}`,
        full_name: name,
        email: name.toLowerCase().replace(/ /g, '.') + '@school.edu.ph',
      },
      started_at: new Date(Date.now() - 86400000 * (i + 1)).toISOString(),
      submitted_at: status !== 'in_progress' ? new Date(Date.now() - 86400000 * i - 3600000).toISOString() : null,
      time_spent_seconds: status !== 'in_progress' ? Math.floor(2400 + Math.random() * 3000) : null,
      status,
      score: pct != null ? Math.floor(pct) : null,
      percentage: pct,
      passed: pct != null ? pct >= 75 : null,
    }
  })
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ElementType; color: string }> = {
  in_progress: { label: 'In Progress', icon: Clock,        color: 'amber' },
  submitted:   { label: 'Submitted',   icon: CheckCircle,  color: 'blue'  },
  graded:      { label: 'Graded',      icon: CheckCircle,  color: 'green' },
}

const PAGE_SIZE = 10

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SubmissionsPage() {
  const { examId } = useParams<{ examId: string }>()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => { setSubmissions(generateDummySubmissions(examId)); setLoading(false) }, 700)
    return () => clearTimeout(t)
  }, [examId])

  const filtered = submissions.filter(sub => {
    const matchSearch = !search || sub.student.full_name.toLowerCase().includes(search.toLowerCase()) || sub.student.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || sub.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><ClipboardList size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Submissions</h1>
              <p className={s.headingSub}>{submissions.length} total submissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Pills */}
      <div className={s.statsRow}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = submissions.filter(s => s.status === key).length
          return (
            <div key={key} className={`${s.statPill} ${s[`statPill_${cfg.color}`]}`}>
              <cfg.icon size={13} />
              <span>{cfg.label}</span>
              <strong>{count}</strong>
            </div>
          )
        })}
        <div className={`${s.statPill} ${s.statPill_muted}`}>
          <XCircle size={13} />
          <span>Not Submitted</span>
          <strong>{Math.max(0, 42 - submissions.filter(s => s.status !== 'in_progress').length)}</strong>
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
          <select className={s.filterSelect} value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as any); setPage(1) }}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Started</th>
                <th>Submitted</th>
                <th>Time Spent</th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className={s.skeletonRow}>
                  <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelAvatar}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 100, marginTop: 5 }} /></div></div></td>
                  {[80,80,60,80,40].map((w,j) => <td key={j}><div className={`${s.skeleton} ${s.skelText}`} style={{ width: w }} /></td>)}
                  <td><div className={s.skelActions}><div className={`${s.skeleton} ${s.skelBtn}`} /><div className={`${s.skeleton} ${s.skelBtn}`} /></div></td>
                </tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><ClipboardList size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No submissions found</p>
                    <p className={s.emptySub}>Submissions will appear here once students begin the exam.</p>
                  </div>
                </td></tr>
              ) : paginated.map(sub => {
                const cfg = STATUS_CONFIG[sub.status]
                return (
                  <tr key={sub.id} className={s.tableRow}>
                    <td>
                      <div className={s.studentCell}>
                        <div className={s.avatar}><span className={s.avatarInitials}>{initials(sub.student.full_name)}</span></div>
                        <div>
                          <div className={s.studentName}>{sub.student.full_name}</div>
                          <div className={s.studentEmail}>{sub.student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={s.dateCell}>{fmt(sub.started_at)}</span></td>
                    <td><span className={s.dateCell}>{sub.submitted_at ? fmt(sub.submitted_at) : <span className={s.na}>—</span>}</span></td>
                    <td><span className={s.timeCell}>{sub.time_spent_seconds ? fmtTime(sub.time_spent_seconds) : <span className={s.na}>—</span>}</span></td>
                    <td>
                      <span className={`${s.statusBadge} ${s[`statusBadge_${cfg.color}`]}`}>
                        <cfg.icon size={11} />{cfg.label}
                      </span>
                    </td>
                    <td>
                      {sub.score != null
                        ? <span className={`${s.scoreChip} ${sub.passed ? s.scorePass : s.scoreFail}`}>{sub.percentage}%</span>
                        : <span className={s.na}>—</span>}
                    </td>
                    <td>
                      <div className={s.actions}>
                        <Link href={`/admin/exams/${examId}/submissions/${sub.id}`} className={s.actionView} title="View">
                          <Eye size={13} />
                        </Link>
                        {sub.status === 'submitted' && (
                          <Link href={`/admin/exams/${examId}/submissions/${sub.id}/grade`} className={s.actionEdit} title="Grade">
                            <Pencil size={13} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className={s.pagination}>
            <span className={s.pageInfo}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
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