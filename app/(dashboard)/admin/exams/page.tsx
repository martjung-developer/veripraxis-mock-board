// app/(dashboard)/admin/exams/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen, Plus, Search, X, Filter, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, AlertCircle, Loader2, Clock,
  HelpCircle, Users, CheckCircle, XCircle
} from 'lucide-react'
import s from './exams.module.css'

// ── Types ────────────────────────────────────────────────────────────────────
interface Exam {
  id: string
  title: string
  description: string | null
  category: { id: string; name: string } | null
  duration_minutes: number
  total_points: number
  passing_score: number
  is_published: boolean
  question_count: number
  assigned_count: number
  created_at: string
}

// ── Dummy data ────────────────────────────────────────────────────────────────
const CATEGORIES = ['All Categories', 'Nursing', 'Medicine', 'Pharmacy', 'Dentistry', 'Engineering']

function generateDummyExams(): Exam[] {
  const cats = ['Nursing', 'Medicine', 'Pharmacy', 'Dentistry', 'Engineering']
  return Array.from({ length: 28 }, (_, i) => ({
    id: `exam-${i + 1}`,
    title: [
      'Fundamentals of Nursing Practice',
      'Medical Surgical Nursing Board Prep',
      'Pharmacology & Drug Administration',
      'Community Health Nursing',
      'Maternal & Child Health Nursing',
      'Psychiatric Mental Health Nursing',
      'Critical Care Nursing Review',
      'Basic Life Support Assessment',
    ][i % 8] + (i >= 8 ? ` (Set ${Math.floor(i / 8) + 1})` : ''),
    description: 'Comprehensive mock exam covering core competencies and board exam topics.',
    category: { id: `cat-${i % 5}`, name: cats[i % 5] },
    duration_minutes: [60, 90, 120, 45, 75][i % 5],
    total_points: [100, 150, 200, 50, 75][i % 5],
    passing_score: 75,
    is_published: i % 3 !== 2,
    question_count: [50, 75, 100, 25, 40][i % 5],
    assigned_count: Math.floor(Math.random() * 80) + 5,
    created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
  }))
}

const ALL_EXAMS = generateDummyExams()
const PAGE_SIZE = 8

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => { setExams(ALL_EXAMS); setLoading(false) }, 700)
    return () => clearTimeout(t)
  }, [])

  const filtered = exams.filter(e => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All Categories' || e.category?.name === category
    const matchStatus = status === 'all' || (status === 'published' ? e.is_published : !e.is_published)
    return matchSearch && matchCat && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearFilters = () => { setSearch(''); setCategory('All Categories'); setStatus('all'); setPage(1) }
  const hasFilters = search || category !== 'All Categories' || status !== 'all'

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await new Promise(r => setTimeout(r, 900))
    setExams(prev => prev.filter(e => e.id !== deleteTarget.id))
    setDeleting(false)
    setDeleteTarget(null)
  }

  const pageNums = (() => {
    const nums: (number | '…')[] = []
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) nums.push(i); return nums }
    nums.push(1)
    if (page > 3) nums.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
    if (page < totalPages - 2) nums.push('…')
    nums.push(totalPages)
    return nums
  })()

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.headerIcon}><BookOpen size={20} color="#fff" /></div>
          <div>
            <h1 className={s.heading}>Exams</h1>
            <p className={s.headingSub}>Manage mock exams, questions, and assignments</p>
          </div>
        </div>
        <div className={s.headerActions}>
          <Link href="/admin/exams/create" className={s.btnPrimary}>
            <Plus size={14} /> Create Exam
          </Link>
        </div>
      </div>

      {error && (
        <div className={s.errorBanner}><AlertCircle size={15} />{error}</div>
      )}

      {/* Filter Bar */}
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Search exams…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button className={s.searchClear} onClick={() => { setSearch(''); setPage(1) }}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className={s.filterGroup}>
          <CheckCircle size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {hasFilters && (
          <button className={s.clearFilters} onClick={clearFilters}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Exam Title</th>
                <th>Category</th>
                <th>Duration</th>
                <th>Questions</th>
                <th>Assigned</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className={s.skeletonRow}>
                    <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelIcon}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 180 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 100, marginTop: 5 }} /></div></div></td>
                    <td><div className={`${s.skeleton} ${s.skelBadge}`} /></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 55 }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 40 }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 45 }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelBadge}`} /></td>
                    <td><div className={s.skelActions}><div className={`${s.skeleton} ${s.skelBtn}`} /><div className={`${s.skeleton} ${s.skelBtn}`} /><div className={`${s.skeleton} ${s.skelBtn}`} /></div></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={s.emptyState}>
                      <div className={s.emptyIcon}><BookOpen size={22} color="var(--text-muted)" /></div>
                      <p className={s.emptyTitle}>No exams found</p>
                      <p className={s.emptySub}>Try adjusting your filters or create a new exam.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(exam => (
                  <tr key={exam.id} className={s.tableRow}>
                    <td>
                      <div className={s.examCell}>
                        <div className={s.examIcon}><BookOpen size={16} color="var(--primary)" /></div>
                        <div>
                          <div className={s.examTitle}>{exam.title}</div>
                          <div className={s.examMeta}>{exam.total_points} pts · Pass {exam.passing_score}%</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={s.categoryBadge}>{exam.category?.name ?? '—'}</span>
                    </td>
                    <td>
                      <div className={s.durationCell}>
                        <Clock size={12} className={s.durationIcon} />
                        {exam.duration_minutes} min
                      </div>
                    </td>
                    <td>
                      <div className={s.countCell}>
                        <HelpCircle size={12} className={s.countIcon} />
                        {exam.question_count}
                      </div>
                    </td>
                    <td>
                      <div className={s.countCell}>
                        <Users size={12} className={s.countIcon} />
                        {exam.assigned_count}
                      </div>
                    </td>
                    <td>
                      {exam.is_published
                        ? <span className={s.badgePublished}><CheckCircle size={11} /> Published</span>
                        : <span className={s.badgeDraft}><XCircle size={11} /> Draft</span>}
                    </td>
                    <td>
                      <div className={s.actions}>
                        <Link href={`/admin/exams/${exam.id}`} className={s.actionView} title="View"><Eye size={14} /></Link>
                        <Link href={`/admin/exams/${exam.id}/edit`} className={s.actionEdit} title="Edit"><Pencil size={14} /></Link>
                        <button className={s.actionDelete} title="Delete" onClick={() => setDeleteTarget(exam)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className={s.pagination}>
            <span className={s.pageInfo}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} exams
            </span>
            <div className={s.pageButtons}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              {pageNums.map((n, i) =>
                n === '…'
                  ? <span key={`d${i}`} className={s.pageDots}>…</span>
                  : <button key={n} className={`${s.pageBtn} ${page === n ? s.pageBtnActive : ''}`} onClick={() => setPage(n as number)}>{n}</button>
              )}
              <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className={s.modalOverlay}>
          <div className={s.modal}>
            <div className={s.modalIcon}><Trash2 size={22} color="var(--danger)" /></div>
            <h2 className={s.modalTitle}>Delete Exam?</h2>
            <p className={s.modalBody}>
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>? This will also remove all questions, assignments, and submissions. This action cannot be undone.
            </p>
            <div className={s.modalActions}>
              <button className={s.btnSecondary} onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className={s.btnDanger} onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={13} className={s.spinner} /> Deleting…</> : <><Trash2 size={13} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}