'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Users, ArrowLeft, Plus, Search, X, Trash2,
  AlertCircle, Loader2, ChevronLeft, ChevronRight, Filter,
  CheckCircle, Clock, XCircle
} from 'lucide-react'
import s from './assignments.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string
  student: { id: string; full_name: string; email: string; student_id: string | null }
  assigned_at: string
  deadline: string | null
  is_active: boolean
  submission_status: 'not_started' | 'in_progress' | 'submitted' | 'graded'
  score: number | null
}

// ── Dummy data ────────────────────────────────────────────────────────────────
const NAMES = [
  'Maria Santos', 'Juan dela Cruz', 'Ana Reyes', 'Carlo Mendoza', 'Liza Villanueva',
  'Ramon Garcia', 'Rosa Cruz', 'Miguel Torres', 'Elena Bautista', 'Jose Ramos',
  'Carla Pascual', 'Paolo Dela Rosa', 'Diana Castillo', 'Renzo Aquino', 'Sophia Navarro',
  'Ivan Mercado', 'Fatima Yusof', 'Benedict Orozco', 'Stella Manalo', 'Gio Hernandez',
]

function generateDummyAssignments(examId: string): Assignment[] {
  const statuses: Assignment['submission_status'][] = ['not_started', 'in_progress', 'submitted', 'graded']
  return NAMES.map((name, i) => ({
    id: `asgn-${examId}-${i + 1}`,
    student: {
      id: `stu-${i + 1}`,
      full_name: name,
      email: name.toLowerCase().replace(/ /g, '.') + '@school.edu.ph',
      student_id: `2024-${String(1001 + i).padStart(5, '0')}`,
    },
    assigned_at: new Date(Date.now() - (i * 86400000) - 86400000 * 10).toISOString(),
    deadline: new Date(Date.now() + 86400000 * (14 - i)).toISOString(),
    is_active: i % 7 !== 6,
    submission_status: statuses[i % statuses.length],
    score: statuses[i % statuses.length] === 'graded' ? Math.floor(60 + Math.random() * 40) : null,
  }))
}

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: XCircle,     color: 'muted'  },
  in_progress: { label: 'In Progress', icon: Clock,       color: 'amber'  },
  submitted:   { label: 'Submitted',   icon: CheckCircle, color: 'blue'   },
  graded:      { label: 'Graded',      icon: CheckCircle, color: 'green'  },
}

const PAGE_SIZE = 10

// ── Component ─────────────────────────────────────────────────────────────────
export default function AssignmentsPage() {
  const { examId } = useParams<{ examId: string }>()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Assignment['submission_status'] | 'all'>('all')
  const [page, setPage] = useState(1)
  const [unassignTarget, setUnassignTarget] = useState<Assignment | null>(null)
  const [unassigning, setUnassigning] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setAssignments(generateDummyAssignments(examId)); setLoading(false) }, 700)
    return () => clearTimeout(t)
  }, [examId])

  const filtered = assignments.filter(a => {
    const matchSearch = !search ||
      a.student.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.student.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.student.student_id ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || a.submission_status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleUnassign = async () => {
    if (!unassignTarget) return
    setUnassigning(true)
    await new Promise(r => setTimeout(r, 800))
    setAssignments(prev => prev.filter(a => a.id !== unassignTarget.id))
    setUnassigning(false); setUnassignTarget(null)
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><Users size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Assignments</h1>
              <p className={s.headingSub}>{assignments.length} students assigned to this exam</p>
            </div>
          </div>
          <button className={s.btnPrimary}><Plus size={14} /> Assign Students</button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={s.statsRow}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = assignments.filter(a => a.submission_status === key).length
          return (
            <div key={key} className={`${s.statPill} ${s[`statPill_${cfg.color}`]}`}>
              <cfg.icon size={13} />
              <span className={s.statPillLabel}>{cfg.label}</span>
              <span className={s.statPillCount}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input className={s.searchInput} placeholder="Search by name, email, or student ID…" value={search}
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
                <th>Student ID</th>
                <th>Assigned</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className={s.skeletonRow}>
                  <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelAvatar}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 90, marginTop: 5 }} /></div></div></td>
                  <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 80 }} /></td>
                  <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 80 }} /></td>
                  <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 80 }} /></td>
                  <td><div className={`${s.skeleton} ${s.skelBadge}`} /></td>
                  <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 40 }} /></td>
                  <td><div className={`${s.skeleton} ${s.skelBtn}`} /></td>
                </tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><Users size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No assignments found</p>
                    <p className={s.emptySub}>Assign students to this exam to get started.</p>
                  </div>
                </td></tr>
              ) : paginated.map(a => {
                const cfg = STATUS_CONFIG[a.submission_status]
                return (
                  <tr key={a.id} className={s.tableRow}>
                    <td>
                      <div className={s.studentCell}>
                        <div className={s.avatar}>
                          <span className={s.avatarInitials}>{initials(a.student.full_name)}</span>
                        </div>
                        <div>
                          <div className={s.studentName}>{a.student.full_name}</div>
                          <div className={s.studentEmail}>{a.student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={s.idChip}>{a.student.student_id ?? '—'}</span></td>
                    <td><span className={s.dateCell}>{fmt(a.assigned_at)}</span></td>
                    <td><span className={s.dateCell}>{a.deadline ? fmt(a.deadline) : '—'}</span></td>
                    <td>
                      <span className={`${s.statusBadge} ${s[`statusBadge_${cfg.color}`]}`}>
                        <cfg.icon size={11} />{cfg.label}
                      </span>
                    </td>
                    <td>
                      {a.score != null
                        ? <span className={`${s.scoreChip} ${a.score >= 75 ? s.scorePass : s.scoreFail}`}>{a.score}%</span>
                        : <span className={s.scoreDash}>—</span>}
                    </td>
                    <td>
                      <button className={s.actionDelete} title="Unassign" onClick={() => setUnassignTarget(a)}>
                        <Trash2 size={13} />
                      </button>
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

      {/* Unassign Modal */}
      {unassignTarget && (
        <div className={s.modalOverlay}>
          <div className={s.modal}>
            <div className={s.modalIcon}><Users size={22} color="var(--danger)" /></div>
            <h2 className={s.modalTitle}>Unassign Student?</h2>
            <p className={s.modalBody}>Remove <strong>{unassignTarget.student.full_name}</strong> from this exam? Their submission data will be preserved.</p>
            <div className={s.modalActions}>
              <button className={s.btnSecondary} onClick={() => setUnassignTarget(null)} disabled={unassigning}>Cancel</button>
              <button className={s.btnDanger} onClick={handleUnassign} disabled={unassigning}>
                {unassigning ? <><Loader2 size={13} className={s.spinner} /> Removing…</> : <><Trash2 size={13} /> Unassign</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}