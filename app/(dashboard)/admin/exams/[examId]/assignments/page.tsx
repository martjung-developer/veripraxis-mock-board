// app/(dashboard)/admin/exams/[examId]/assignments/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Users, ArrowLeft, Plus, Search, X, Trash2,
  AlertCircle, Loader2, ChevronLeft, ChevronRight, Filter,
  CheckCircle, Clock, XCircle, UserPlus, Layers, ChevronDown,
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
  program_name: string | null
  assigned_at: string
  deadline: string | null
  is_active: boolean
  submission_status: 'not_started' | 'in_progress' | 'submitted' | 'graded'
  score: number | null
}

interface StudentSearchResult {
  id: string
  full_name: string
  email: string
  student_id: string | null
  program_code: string | null
}

interface Program { id: string; code: string; name: string }

// ── BUG ROOT CAUSE & FIX ──────────────────────────────────────────────────────
// ORIGINAL BUG: The query used `profiles:student_id (...)` as a direct foreign-key
// hint join. This works ONLY if `exam_assignments.student_id` has an explicit FK
// constraint pointing to `profiles.id` in the database.
//
// In VeriPraxis, `exam_assignments.student_id` may reference `students.id` (which
// mirrors `profiles.id`), not `profiles.id` directly. When Supabase can't resolve
// the FK hint, it silently returns null for the join — so after insert the row
// exists in the DB but the fetch maps it to an empty/unknown student.
//
// FIX: Fetch assignments without the embedded join, then batch-fetch student
// profile data separately using `.in('id', studentIds)`. This is explicit,
// always works regardless of FK definition, and is equally efficient.
// ─────────────────────────────────────────────────────────────────────────────

type AssignmentRow = {
  id: string
  student_id: string | null
  program_id: string | null
  assigned_at: string
  deadline: string | null
  is_active: boolean
  // programs join is safe — program_id → programs.id FK is standard
  programs: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null
}

type ProfileRow    = { id: string; full_name: string | null; email: string }
type StudentRow    = { id: string; student_id: string | null }
type SubmissionRow = { student_id: string | null; status: string; percentage: number | null }

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
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
  const [programs,       setPrograms]       = useState<Program[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState<Assignment['submission_status'] | 'all'>('all')
  const [page,           setPage]           = useState(1)

  // Assign panel
  const [showPanel,      setShowPanel]      = useState(false)
  const [assignMode,     setAssignMode]     = useState<'student' | 'program'>('student')
  const [studentSearch,  setStudentSearch]  = useState('')
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([])
  const [searching,      setSearching]      = useState(false)
  const [selected,       setSelected]       = useState<StudentSearchResult[]>([])
  const [deadline,       setDeadline]       = useState('')
  const [selectedProg,   setSelectedProg]   = useState('')
  const [progDeadline,   setProgDeadline]   = useState('')
  const [assigning,      setAssigning]      = useState(false)
  const [unassignTarget, setUnassignTarget] = useState<Assignment | null>(null)
  const [unassigning,    setUnassigning]    = useState(false)

  // ── Fetch assignments (FIXED) ──────────────────────────────────────────────
  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Step 1: Fetch assignment rows + programs join (safe FK)
    const [asnRes, progRes] = await Promise.all([
      supabase
        .from('exam_assignments')
        .select(`
          id,
          student_id,
          program_id,
          assigned_at,
          deadline,
          is_active,
          programs:program_id ( id, name, code )
        `)
        .eq('exam_id', examId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false }),
      supabase.from('programs').select('id, code, name').order('name'),
    ])

    if (asnRes.error) {
      setError('Could not load assignments.')
      setLoading(false)
      return
    }

    setPrograms((progRes.data ?? []) as Program[])

    const rawList    = (asnRes.data ?? []) as unknown as AssignmentRow[]
    const studentIds = rawList
      .map(a => a.student_id)
      .filter((id): id is string => !!id)

    if (studentIds.length === 0) {
      // No individual-student assignments — only program assignments or empty
      setAssignments(rawList.map(a => {
        const prog = unwrap(a.programs)
        return {
          id:          a.id,
          student:     { id: '', full_name: '(Program assignment)', email: '', student_id: null },
          program_name: prog ? `${prog.code} — ${prog.name}` : null,
          assigned_at:  a.assigned_at,
          deadline:     a.deadline,
          is_active:    a.is_active,
          submission_status: 'not_started',
          score: null,
        }
      }))
      setLoading(false)
      return
    }

    // Step 2: Batch-fetch profiles by id — avoids FK ambiguity entirely
    const [profilesRes, studentsRes, submissionsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds),
      supabase
        .from('students')
        .select('id, student_id')
        .in('id', studentIds),
      supabase
        .from('submissions')
        .select('student_id, status, percentage')
        .eq('exam_id', examId)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false }),
    ])

    // Build lookup maps
    const profileMap: Record<string, ProfileRow> = {}
    ;(profilesRes.data ?? []).forEach((p: ProfileRow) => { profileMap[p.id] = p })

    const studentMap: Record<string, StudentRow> = {}
    ;(studentsRes.data ?? []).forEach((s: StudentRow) => { studentMap[s.id] = s })

    // Latest submission per student (priority: graded > submitted > in_progress)
    const priorityOf = (status: string) => ({ graded: 3, submitted: 2, in_progress: 1 }[status] ?? 0)
    const submissionMap: Record<string, SubmissionRow> = {}
    ;(submissionsRes.data ?? []).forEach((sub: SubmissionRow) => {
      if (!sub.student_id) return
      const existing = submissionMap[sub.student_id]
      if (priorityOf(sub.status) > priorityOf(existing?.status ?? ''))
        submissionMap[sub.student_id] = sub
    })

    const validStatuses = new Set(['not_started', 'in_progress', 'submitted', 'graded'])

    const mapped: Assignment[] = rawList.map(a => {
      const prog    = unwrap(a.programs)
      const profile = a.student_id ? profileMap[a.student_id] : null
      const student = a.student_id ? studentMap[a.student_id] : null
      const sub     = a.student_id ? submissionMap[a.student_id] : undefined
      const status  = sub?.status && validStatuses.has(sub.status)
        ? sub.status as Assignment['submission_status']
        : 'not_started'

      return {
        id: a.id,
        student: {
          id:         a.student_id ?? '',
          full_name:  profile?.full_name ?? 'Unknown Student',
          email:      profile?.email ?? '',
          student_id: student?.student_id ?? null,
        },
        program_name: prog ? `${prog.code} — ${prog.name}` : null,
        assigned_at:  a.assigned_at,
        deadline:     a.deadline,
        is_active:    a.is_active,
        submission_status: status,
        score: sub?.percentage ?? null,
      }
    })

    setAssignments(mapped)
    setLoading(false)
  }, [examId])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  // ── Student search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentSearch.trim() || assignMode !== 'student') {
      setStudentResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()

      // Search profiles with role=student
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .or(`full_name.ilike.%${studentSearch}%,email.ilike.%${studentSearch}%`)
        .limit(10)

      if (!profileData || profileData.length === 0) {
        setStudentResults([])
        setSearching(false)
        return
      }

      const profileIds = profileData.map((p: ProfileRow) => p.id)

      // Fetch student records (student_id + program) for those profiles
      const { data: studentData } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          programs:program_id ( code )
        `)
        .in('id', profileIds)

      const studentDataMap: Record<string, { student_id: string | null; program_code: string | null }> = {}
      ;(studentData ?? []).forEach((row: any) => {
        const prog = Array.isArray(row.programs) ? row.programs[0] : row.programs
        studentDataMap[row.id] = {
          student_id:   row.student_id ?? null,
          program_code: prog?.code ?? null,
        }
      })

      const results: StudentSearchResult[] = profileData.map((p: ProfileRow) => ({
        id:           p.id,
        full_name:    p.full_name ?? 'Unknown',
        email:        p.email,
        student_id:   studentDataMap[p.id]?.student_id ?? null,
        program_code: studentDataMap[p.id]?.program_code ?? null,
      }))

      setStudentResults(results)
      setSearching(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [studentSearch, assignMode])

  // ── Assign students ────────────────────────────────────────────────────────
  async function handleAssignStudents() {
    if (!selected.length) return
    setAssigning(true)
    const supabase = createClient()

    // Fetch already-assigned student IDs to skip duplicates
    const { data: existing } = await supabase
      .from('exam_assignments')
      .select('student_id')
      .eq('exam_id', examId)
      .eq('is_active', true)
      .in('student_id', selected.map(s => s.id))

    const alreadyAssigned = new Set((existing ?? []).map((r: any) => r.student_id))
    const toInsert = selected
      .filter(s => !alreadyAssigned.has(s.id))
      .map(s => ({
        exam_id:    examId,
        student_id: s.id,
        deadline:   deadline || null,
        is_active:  true,
      }))

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from('exam_assignments').insert(toInsert)
      if (insertErr) {
        setError(insertErr.message)
        setAssigning(false)
        return
      }
    }

    // Reset panel state
    setSelected([])
    setStudentSearch('')
    setStudentResults([])
    setDeadline('')
    setShowPanel(false)
    setAssigning(false)
    // Refetch so the table reflects the new rows
    fetchAssignments()
  }

  // ── Assign program ─────────────────────────────────────────────────────────
  async function handleAssignProgram() {
    if (!selectedProg) return
    setAssigning(true)
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('exam_assignments')
      .select('id')
      .eq('exam_id', examId)
      .eq('program_id', selectedProg)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      setError('This program is already assigned to this exam.')
      setAssigning(false)
      return
    }

    const { error: insertErr } = await supabase.from('exam_assignments').insert({
      exam_id:    examId,
      program_id: selectedProg,
      deadline:   progDeadline || null,
      is_active:  true,
    })

    if (insertErr) {
      setError(insertErr.message)
      setAssigning(false)
      return
    }

    setSelectedProg('')
    setProgDeadline('')
    setShowPanel(false)
    setAssigning(false)
    fetchAssignments()
  }

  // ── Unassign ───────────────────────────────────────────────────────────────
  async function handleUnassign() {
    if (!unassignTarget) return
    setUnassigning(true)
    const supabase = createClient()
    const { error: updateErr } = await supabase
      .from('exam_assignments')
      .update({ is_active: false })
      .eq('id', unassignTarget.id)
    if (updateErr) setError('Could not unassign.')
    else setAssignments(prev => prev.filter(a => a.id !== unassignTarget.id))
    setUnassigning(false)
    setUnassignTarget(null)
  }

  // ── Filtered / paginated ───────────────────────────────────────────────────
  const filtered = useMemo(() => assignments.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || a.student.full_name.toLowerCase().includes(q)
      || a.student.email.toLowerCase().includes(q)
      || (a.student.student_id ?? '').toLowerCase().includes(q)
      || (a.program_name ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || a.submission_status === statusFilter
    return matchSearch && matchStatus
  }), [assignments, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const fmt      = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const isSelected   = (id: string) => selected.some(s => s.id === id)
  const toggleSelect = (student: StudentSearchResult) =>
    setSelected(prev => isSelected(student.id) ? prev.filter(s => s.id !== student.id) : [...prev, student])

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
              <p className={s.headingSub}>{assignments.length} student{assignments.length !== 1 ? 's' : ''} assigned to this exam</p>
            </div>
          </div>
          <button className={s.btnPrimary} onClick={() => setShowPanel(true)}>
            <Plus size={14} /> Assign
          </button>
        </div>
      </div>

      {error && (
        <div className={s.errorBanner}>
          <AlertCircle size={14} />{error}
          <button onClick={() => setError(null)} className={s.errorClose}><X size={13} /></button>
        </div>
      )}

      {/* Status summary pills */}
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
          <input
            className={s.searchInput}
            placeholder="Search by name, email, student ID or program…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && <button className={s.searchClear} onClick={() => { setSearch(''); setPage(1) }}><X size={13} /></button>}
        </div>
        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select
            className={s.filterSelect}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as Assignment['submission_status'] | 'all'); setPage(1) }}
          >
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
                <th>Program</th>
                <th>Assigned</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className={s.skeletonRow}>
                    <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelAvatar}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 90, marginTop: 5 }} /></div></div></td>
                    {[70, 80, 80, 80, 80, 40, 40].map((w, j) => (
                      <td key={j}><div className={`${s.skeleton} ${s.skelText}`} style={{ width: w }} /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><Users size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No assignments found</p>
                    <p className={s.emptySub}>Assign students or a program to get started.</p>
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
                      <td><span className={s.dateCell}>{a.program_name ?? '—'}</span></td>
                      <td><span className={s.dateCell}>{fmt(a.assigned_at)}</span></td>
                      <td><span className={s.dateCell}>{a.deadline ? fmt(a.deadline) : '—'}</span></td>
                      <td>
                        <span className={`${s.statusBadge} ${s[`statusBadge_${cfg.color}`]}`}>
                          <cfg.icon size={11} />{cfg.label}
                        </span>
                      </td>
                      <td>
                        {a.score != null
                          ? <span className={`${s.scoreChip} ${a.score >= 75 ? s.scorePass : s.scoreFail}`}>
                              {a.score.toFixed(1)}%
                            </span>
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
            <span className={s.pageInfo}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className={s.pageButtons}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`${s.pageBtn} ${page === n ? s.pageBtnActive : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════
          ASSIGN PANEL MODAL
      ════════════════════════════════ */}
      {showPanel && (
        <div
          className={s.modalOverlay}
          onClick={e => { if (e.target === e.currentTarget) setShowPanel(false) }}
        >
          <div className={s.assignModal}>
            {/* Header */}
            <div className={s.assignModalHeader}>
              <div>
                <h2 className={s.modalTitle}>Assign to Exam</h2>
                <p className={s.modalSubtitle}>Add students individually or by program</p>
              </div>
              <button className={s.modalClose} onClick={() => setShowPanel(false)}>
                <X size={14} />
              </button>
            </div>

            {/* Mode tabs */}
            <div className={s.assignTabs}>
              <button
                className={`${s.assignTab} ${assignMode === 'student' ? s.assignTabActive : ''}`}
                onClick={() => setAssignMode('student')}
              >
                <UserPlus size={14} /> By Student
              </button>
              <button
                className={`${s.assignTab} ${assignMode === 'program' ? s.assignTabActive : ''}`}
                onClick={() => setAssignMode('program')}
              >
                <Layers size={14} /> By Program
              </button>
            </div>

            {/* Body */}
            <div className={s.assignModalBody}>
              {assignMode === 'student' && (
                <>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Search Students</label>
                    <div className={s.searchWrap}>
                      <Search size={13} className={s.searchIcon} />
                      <input
                        className={s.searchInput}
                        placeholder="Name or email…"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                      {searching && (
                        <Loader2 size={13} className={s.searchSpinner} />
                      )}
                    </div>

                    {studentResults.length > 0 && (
                      <div className={s.searchDropdown}>
                        {studentResults.map(student => (
                          <div
                            key={student.id}
                            className={`${s.searchDropdownItem} ${isSelected(student.id) ? s.searchDropdownItemSelected : ''}`}
                            onClick={() => toggleSelect(student)}
                          >
                            <div className={s.searchDropdownAvatar}>
                              {student.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className={s.searchDropdownName}>{student.full_name}</div>
                              <div className={s.searchDropdownEmail}>{student.email}</div>
                            </div>
                            {student.program_code && (
                              <span className={s.searchDropdownProg}>{student.program_code}</span>
                            )}
                            {isSelected(student.id) && <CheckCircle size={14} color="#059669" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selected.length > 0 && (
                    <div className={s.selectedList}>
                      <p className={s.selectedListLabel}>
                        {selected.length} student{selected.length !== 1 ? 's' : ''} selected
                      </p>
                      <div className={s.selectedChips}>
                        {selected.map(st => (
                          <span key={st.id} className={s.selectedChip}>
                            {st.full_name}
                            <button onClick={() => toggleSelect(st)}><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={s.formField}>
                    <label className={s.formLabel}>
                      Deadline <span className={s.formLabelOpt}>(optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      className={s.formInput}
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                    />
                  </div>

                  <button
                    className={s.btnPrimaryFull}
                    onClick={handleAssignStudents}
                    disabled={assigning || !selected.length}
                  >
                    {assigning
                      ? <><Loader2 size={13} className={s.spinner} /> Assigning…</>
                      : <><UserPlus size={13} /> Assign {selected.length > 0 ? `${selected.length} Student${selected.length > 1 ? 's' : ''}` : 'Students'}</>}
                  </button>
                </>
              )}

              {assignMode === 'program' && (
                <>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Select Program <span className={s.req}>*</span></label>
                    <div className={s.selectWrap}>
                      <select
                        className={s.formSelect}
                        value={selectedProg}
                        onChange={e => setSelectedProg(e.target.value)}
                      >
                        <option value="">Choose a program…</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className={s.selectChevron} />
                    </div>
                    <p className={s.fieldHint}>All active students in this program will have access.</p>
                  </div>

                  <div className={s.formField}>
                    <label className={s.formLabel}>
                      Deadline <span className={s.formLabelOpt}>(optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      className={s.formInput}
                      value={progDeadline}
                      onChange={e => setProgDeadline(e.target.value)}
                    />
                  </div>

                  <button
                    className={s.btnPrimaryFull}
                    onClick={handleAssignProgram}
                    disabled={assigning || !selectedProg}
                  >
                    {assigning
                      ? <><Loader2 size={13} className={s.spinner} /> Assigning…</>
                      : <><Layers size={13} /> Assign Program</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unassign confirm modal */}
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
              <button className={s.btnSecondary} onClick={() => setUnassignTarget(null)} disabled={unassigning}>
                Cancel
              </button>
              <button className={s.btnDanger} onClick={handleUnassign} disabled={unassigning}>
                {unassigning
                  ? <><Loader2 size={13} className={s.spinner} /> Removing…</>
                  : <><Trash2 size={13} /> Unassign</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}