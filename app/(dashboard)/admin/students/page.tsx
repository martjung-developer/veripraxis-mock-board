// app/(dashboard)/admin/students/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UserPlus, Search, Eye, Pencil, Trash2,
  X, ChevronLeft, ChevronRight, GraduationCap,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/AuthContext'
import styles from './students.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Program {
  id:   string
  code: string
  name: string
}

interface Student {
  id:           string
  full_name:    string | null
  email:        string
  student_id:   string | null
  year_level:   number | null
  created_at:   string
  program_id:   string | null
  program_code: string | null
  program_name: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE    = 15
const ALL_TAB      = '__all__'
const YEAR_OPTIONS = ['All Years', '1st Year', '2nd Year', '3rd Year', '4th Year']

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function yearLabel(n: number | null): string {
  if (!n) return '—'
  const suffix = ['st','nd','rd'][n - 1] ?? 'th'
  return `${n}${suffix} Year`
}

// ── Avatar colours (consistent per-student) ───────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#ede9fe', color: '#5b21b6' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#fee2e2', color: '#991b1b' },
  { bg: '#ecfeff', color: '#155e75' },
]
function avatarColor(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useUser()

  const [programs,    setPrograms]    = useState<Program[]>([])
  const [students,    setStudents]    = useState<Student[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [activeTab,   setActiveTab]   = useState(ALL_TAB)
  const [search,      setSearch]      = useState('')
  const [yearFilter,  setYearFilter]  = useState('All Years')
  const [page,        setPage]        = useState(1)
  const [deleteModal, setDeleteModal] = useState<Student | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  // ── Auth guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
  }, [authLoading, user, router])

  // ── Fetch programs ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('programs')
      .select('id, code, name')
      .order('code', { ascending: true })
      .then(({ data }) => setPrograms((data ?? []) as Program[]))
  }, [supabase])

  // ── Fetch students with joins ─────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        year_level,
        program_id,
        created_at,
        profiles!inner (
          full_name,
          email,
          role
        ),
        programs (
          id,
          code,
          name
        )
      `)
      .eq('profiles.role', 'student')
      .order('created_at', { ascending: false })

    if (err) { setError('Failed to load students.'); setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: Student[] = (data ?? []).map((row: any) => ({
      id:           row.id,
      full_name:    row.profiles?.full_name ?? null,
      email:        row.profiles?.email ?? '',
      student_id:   row.student_id,
      year_level:   row.year_level,
      created_at:   row.created_at,
      program_id:   row.program_id,
      program_code: row.programs?.code ?? null,
      program_name: row.programs?.name ?? null,
    }))

    setStudents(mapped)
    setLoading(false)
  }, [supabase])

  useEffect(() => { void fetchStudents() }, [fetchStudents])

  // ── Re-fetch when the tab regains focus (catches edits from other pages) ──────
  useEffect(() => {
    function onFocus() { void fetchStudents() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchStudents])

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return students.filter((s) => {
      if (activeTab !== ALL_TAB && s.program_id !== activeTab) return false
      if (yearFilter !== 'All Years') {
        const yr = YEAR_OPTIONS.indexOf(yearFilter)
        if (s.year_level !== yr) return false
      }
      if (q) {
        const haystack = [s.full_name, s.email, s.student_id, s.program_code, s.program_name]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [students, activeTab, yearFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset page when filters change
  useEffect(() => setPage(1), [activeTab, yearFilter, search])

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteModal) return
    setDeleting(true)
    await supabase.from('profiles').delete().eq('id', deleteModal.id)
    setDeleting(false)
    setDeleteModal(null)
    void fetchStudents()
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (authLoading) return null

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <GraduationCap size={22} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className={styles.title}>Students</h1>
            <p className={styles.subtitle}>
              {loading ? '…' : `${students.length} enrolled student${students.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Link href="/admin/students/create" className={styles.btnAdd}>
          <UserPlus size={15} strokeWidth={2.2} />
          Add Student
        </Link>
      </div>

      {/* ── Program Tabs ── */}
      <div className={styles.tabsRow}>
        <button
          className={`${styles.tab} ${activeTab === ALL_TAB ? styles.tabActive : ''}`}
          onClick={() => setActiveTab(ALL_TAB)}
        >
          All Programs
        </button>
        {programs.map((p) => (
          <button
            key={p.id}
            className={`${styles.tab} ${activeTab === p.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(p.id)}
          >
            {p.code}
          </button>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by name, email, program, student ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <select
          className={styles.yearSelect}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Student ID</th>
              <th>Program / Year</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td><div className={styles.skeletonCell} /></td>
                  <td><div className={styles.skeletonCell} style={{ width: 80 }} /></td>
                  <td><div className={styles.skeletonCell} style={{ width: 120 }} /></td>
                  <td><div className={styles.skeletonCell} style={{ width: 90 }} /></td>
                  <td><div className={styles.skeletonCell} style={{ width: 80 }} /></td>
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className={styles.emptyState}>
                    <GraduationCap size={38} strokeWidth={1.3} color="#cbd5e1" />
                    <p className={styles.emptyTitle}>No students found</p>
                    <p className={styles.emptyText}>
                      {activeTab !== ALL_TAB
                        ? 'No students enrolled in this program yet.'
                        : search
                        ? 'No results match your search.'
                        : 'No students have been added yet.'}
                    </p>
                    {activeTab === ALL_TAB && !search && (
                      <Link href="/admin/students/create" className={styles.emptyBtn}>
                        <UserPlus size={14} /> Add First Student
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((s) => {
                const initials = getInitials(s.full_name, s.email)
                const { bg, color } = avatarColor(s.id)
                return (
                  <tr key={s.id} className={styles.row}>
                    <td>
                      <div className={styles.studentCell}>
                        <div className={styles.avatar} style={{ background: bg, color }}>
                          {initials}
                        </div>
                        <div>
                          <p className={styles.studentName}>{s.full_name ?? '—'}</p>
                          <p className={styles.studentEmail}>{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.idBadge}>{s.student_id ?? '—'}</span>
                    </td>
                    <td>
                      {s.program_code ? (
                        <div>
                          <span className={styles.programBadge}>{s.program_code}</span>
                          <span className={styles.yearLabel}>{yearLabel(s.year_level)}</span>
                        </div>
                      ) : (
                        <span className={styles.noProgramLabel}>No program</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.dateLabel}>{formatDate(s.created_at)}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/students/${s.id}`} className={styles.actionBtn} title="View">
                          <Eye size={15} />
                        </Link>
                        <Link href={`/admin/students/${s.id}/edit`} className={styles.actionBtn} title="Edit">
                          <Pencil size={15} />
                        </Link>
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          title="Delete"
                          onClick={() => setDeleteModal(s)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Page {safePage} of {totalPages} · {filtered.length} total
          </span>
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteModal && (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setDeleteModal(null) }}>
          <div className={styles.modal}>
            <div className={styles.modalIcon} style={{ background: '#fee2e2', border: '2px solid #fca5a5' }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <h2 className={styles.modalTitle}>Delete Student?</h2>
            <p className={styles.modalBody}>
              This will permanently remove <strong>{deleteModal.full_name ?? deleteModal.email}</strong> and all their data. This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnModalCancel} onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className={styles.btnModalDanger} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}