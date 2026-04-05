// app/(dashboard)/admin/exams/[examId]/assignments/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Users, ArrowLeft, Plus, Search, X, Trash2,
  AlertCircle, Loader2, ChevronLeft, ChevronRight, Filter,
  CheckCircle, Clock, XCircle
} from 'lucide-react'
import s from './assignments.module.css'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string
  student: {
    id: string
    full_name: string
    email: string
    student_id: string | null
  }
  assigned_at: string
  deadline: string | null
  is_active: boolean
  // Derived from submissions table for this student × exam
  submission_status: 'not_started' | 'in_progress' | 'submitted' | 'graded'
  score: number | null
}

// ── Supabase raw shape ─────────────────────────────────────────────────────────
// exam_assignments → profiles (via student_id → profiles.id)
type AssignmentRaw = {
  id: string
  student_id: string | null
  program_id: string | null
  assigned_at: string
  deadline: string | null
  is_active: boolean
  profiles: {
    id: string
    full_name: string | null
    email: string
  } | {
    id: string
    full_name: string | null
    email: string
  }[] | null
  students: {
    student_id: string | null
  } | {
    student_id: string | null
  }[] | null
}

type SubmissionRaw = {
  student_id: string | null
  status: string
  percentage: number | null
}

function unwrapSingle<T>(raw: T | T[] | null): T | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: XCircle,     color: 'muted'  },
  in_progress: { label: 'In Progress', icon: Clock,       color: 'amber'  },
  submitted:   { label: 'Submitted',   icon: CheckCircle, color: 'blue'   },
  graded:      { label: 'Graded',      icon: CheckCircle, color: 'green'  },
} as const

const PAGE_SIZE = 10

// ── Component ─────────────────────────────────────────────────────────────────
export default function AssignmentsPage() {
  const { examId } = useParams<{ examId: string }>()
  const [assignments,    setAssignments]    = useState<Assignment[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState<Assignment['submission_status'] | 'all'>('all')
  const [page,           setPage]           = useState(1)
  const [unassignTarget, setUnassignTarget] = useState<Assignment | null>(null)
  const [unassigning,    setUnassigning]    = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // 1. Fetch active student-level assignments for this exam
    //    Join profiles (for name/email) and students (for student_id number)
    const { data: asnData, error: asnErr } = await supabase
      .from('exam_assignments')
      .select(`
        id, student_id, program_id, assigned_at, deadline, is_active,
        profiles:student_id ( id, full_name, email ),
        students:student_id ( student_id )
      `)
      .eq('exam_id', examId)
      .not('student_id', 'is', null)   // only direct student assignments
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (asnErr) {
      setError('Could not load assignments.')
      setLoading(false)
      return
    }

    const rawAssignments = (asnData ?? []) as unknown as AssignmentRaw[]
    const studentIds = rawAssignments
      .map(a => a.student_id)
      .filter((id): id is string => id !== null)

    // 2. Fetch the latest submission per student for this exam
    //    We'll pick the most recent by status priority: graded > submitted > in_progress
    const submissionMap: Record<string, SubmissionRaw> = {}

    if (studentIds.length > 0) {
      const { data: subRows } = await supabase
        .from('submissions')
        .select('student_id, status, percentage')
        .eq('exam_id', examId)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })

      // Keep the "best" submission per student (graded > submitted > in_progress)
      const statusPriority: Record<string, number> = { graded: 3, submitted: 2, in_progress: 1 }
      ;(subRows ?? []).forEach((sub: SubmissionRaw) => {
        if (!sub.student_id) return
        const existing = submissionMap[sub.student_id]
        const newPriority = statusPriority[sub.status] ?? 0
        const existingPriority = existing ? (statusPriority[existing.status] ?? 0) : -1
        if (newPriority > existingPriority) submissionMap[sub.student_id] = sub
      })
    }

    // 3. Map to Assignment shape
    const mapped: Assignment[] = rawAssignments.map(a => {
      const profile = unwrapSingle(a.profiles)
      const student = unwrapSingle(a.students)
      const sub     = a.student_id ? submissionMap[a.student_id] : undefined

      const subStatus = sub?.status as Assignment['submission_status'] | undefined
      const validStatuses = ['not_started', 'in_progress', 'submitted', 'graded']
      const submissionStatus: Assignment['submission_status'] =
        subStatus && validStatuses.includes(subStatus) ? subStatus : 'not_started'

      return {
        id: a.id,
        student: {
          id:         profile?.id         ?? a.student_id ?? '',
          full_name:  profile?.full_name  ?? 'Unknown Student',
          email:      profile?.email      ?? '',
          student_id: student?.student_id ?? null,
        },
        assigned_at:       a.assigned_at,
        deadline:          a.deadline,
        is_active:         a.is_active,
        submission_status: submissionStatus,
        score:             sub?.percentage ?? null,
      }
    })

    setAssignments(mapped)
    setLoading(false)
  }, [examId])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  // ── Unassign ───────────────────────────────────────────────────────────────
  const handleUnassign = async () => {
    if (!unassignTarget) return
    setUnassigning(true)
    const supabase = createClient()
    // Soft-delete: set is_active = false to preserve submission data
    const { error: updErr } = await supabase
      .from('exam_assignments')
      .update({ is_active: false })
      .eq('id', unassignTarget.id)
    if (updErr) {
      setError('Could not unassign student.')
    } else {
      setAssignments(prev => prev.filter(a => a.id !== unassignTarget.id))
    }
    setUnassigning(false)
    setUnassignTarget(null)
  }

  // ── Filter + Paginate ──────────────────────────────────────────────────────
  const filtered = assignments.filter(a => {
    const matchSearch = !search
      || a.student.full_name.toLowerCase().includes(search.toLowerCase())
      || a.student.email.toLowerCase().includes(search.toLowerCase())
      || (a.student.student_id ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || a.submission_status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const fmt      = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // ── Render ─────────────────────────────────────────────────────────────────
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

      {error && <div className={s.errorBanner ?? ''}><AlertCircle size={14} />{error}</div>}

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
            onChange={e => { setStatusFilter(e.target.value as Assignment['submission_status'] | 'all'); setPage(1) }}>
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
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className={s.skeletonRow}>
                    <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelAvatar}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 90, marginTop: 5 }} /></div></div></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 80 }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 80 }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 80 }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelBadge}`} /></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 40 }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelBtn}`} /></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><Users size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No assignments found</p>
                    <p className={s.emptySub}>Assign students to this exam to get started.</p>
                  </div>
                </td></tr>
              ) : (
                paginated.map(a => {
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
                          ? <span className={`${s.scoreChip} ${a.score >= 75 ? s.scorePass : s.scoreFail}`}>{a.score.toFixed(1)}%</span>
                          : <span className={s.scoreDash}>—</span>}
                      </td>
                      <td>
                        <button className={s.actionDelete} title="Unassign" onClick={() => setUnassignTarget(a)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
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
            <p className={s.modalBody}>
              Remove <strong>{unassignTarget.student.full_name}</strong> from this exam?
              Their submission data will be preserved.
            </p>
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