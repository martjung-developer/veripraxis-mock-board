// app/(dashboard)/admin/exams/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen, Plus, Search, X, Filter, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, AlertCircle, Loader2, Clock,
  HelpCircle, Users, CheckCircle, XCircle, GraduationCap, Tag,
} from 'lucide-react'
import s from './exams.module.css'
import { createClient } from '@/lib/supabase/client'
import { EXAM_TYPE_META, type ExamType } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProgramRow {
  id:   string
  code: string
  name: string
}

interface Exam {
  id:               string
  title:            string
  description:      string | null
  category:         { id: string; name: string } | null
  program:          { id: string; code: string; name: string } | null
  exam_type:        ExamType
  duration_minutes: number
  total_points:     number
  passing_score:    number
  is_published:     boolean
  question_count:   number
  assigned_count:   number
  created_at:       string
}

// ── Supabase raw shapes ───────────────────────────────────────────────────────
type CategoryShape = { id: string; name: string; icon: string | null }
type ProgramShape  = { id: string; code: string; name: string } | null

type ExamRaw = {
  id:               string
  title:            string
  description:      string | null
  duration_minutes: number
  total_points:     number
  passing_score:    number
  is_published:     boolean
  exam_type:        string | null
  created_at:       string
  exam_categories:  CategoryShape | CategoryShape[] | null
  programs:         ProgramShape  | ProgramShape[]  | null
}

function unwrapCategory(raw: CategoryShape | CategoryShape[] | null): CategoryShape | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

function unwrapProgram(raw: ProgramShape | ProgramShape[] | null): ProgramShape {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

function safeExamType(raw: string | null): ExamType {
  if (raw === 'practice') return 'practice'
  return 'mock'
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExamsPage() {
  const [exams,        setExams]        = useState<Exam[]>([])
  const [categories,   setCategories]   = useState<string[]>(['All Categories'])
  const [programs,     setPrograms]     = useState<ProgramRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [category,     setCategory]     = useState('All Categories')
  const [status,       setStatus]       = useState('all')
  const [examType,     setExamType]     = useState<ExamType | 'all'>('all')
  const [programId,    setProgramId]    = useState('all')
  const [page,         setPage]         = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Fetch programs for the filter dropdown
    const { data: programRows } = await supabase
      .from('programs')
      .select('id, code, name')
      .order('code')
    setPrograms((programRows ?? []) as ProgramRow[])

    // Fetch exams joined with category + program
    const { data: examData, error: examErr } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        description,
        duration_minutes,
        total_points,
        passing_score,
        is_published,
        exam_type,
        created_at,
        exam_categories ( id, name, icon ),
        programs ( id, code, name )
      `)
      .order('created_at', { ascending: false })

    if (examErr) {
      setError('Could not load exams. Please try again.')
      setLoading(false)
      return
    }

    const rawExams = (examData ?? []) as unknown as ExamRaw[]
    const examIds  = rawExams.map(e => e.id)

    // Batch-fetch question counts (avoids N+1)
    const qCountMap: Record<string, number> = {}
    if (examIds.length > 0) {
      const { data: qRows } = await supabase
        .from('questions')
        .select('exam_id')
        .in('exam_id', examIds)
      ;(qRows ?? []).forEach((q: { exam_id: string | null }) => {
        if (q.exam_id) qCountMap[q.exam_id] = (qCountMap[q.exam_id] ?? 0) + 1
      })
    }

    // Batch-fetch active assignment counts
    const aCountMap: Record<string, number> = {}
    if (examIds.length > 0) {
      const { data: aRows } = await supabase
        .from('exam_assignments')
        .select('exam_id')
        .in('exam_id', examIds)
        .eq('is_active', true)
      ;(aRows ?? []).forEach((a: { exam_id: string | null }) => {
        if (a.exam_id) aCountMap[a.exam_id] = (aCountMap[a.exam_id] ?? 0) + 1
      })
    }

    const mapped: Exam[] = rawExams.map(e => {
      const cat  = unwrapCategory(e.exam_categories)
      const prog = unwrapProgram(e.programs)
      return {
        id:               e.id,
        title:            e.title,
        description:      e.description,
        category:         cat  ? { id: cat.id,   name: cat.name,   } : null,
        program:          prog ? { id: prog.id,  code: prog.code, name: prog.name } : null,
        exam_type:        safeExamType(e.exam_type),
        duration_minutes: e.duration_minutes,
        total_points:     e.total_points,
        passing_score:    e.passing_score,
        is_published:     e.is_published,
        question_count:   qCountMap[e.id] ?? 0,
        assigned_count:   aCountMap[e.id] ?? 0,
        created_at:       e.created_at,
      }
    })

    // Build category dropdown from live data
    const uniqueCats = Array.from(
      new Set(mapped.map(e => e.category?.name).filter(Boolean) as string[])
    ).sort()
    setCategories(['All Categories', ...uniqueCats])
    setExams(mapped)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    const { error: delErr } = await supabase
      .from('exams')
      .delete()
      .eq('id', deleteTarget.id)
    if (delErr) {
      setError('Could not delete exam. Please try again.')
    } else {
      setExams(prev => prev.filter(e => e.id !== deleteTarget.id))
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  // ── Filter + Paginate ──────────────────────────────────────────────────────
  const filtered = exams.filter(e => {
    const matchSearch  = !search || e.title.toLowerCase().includes(search.toLowerCase())
    const matchCat     = category === 'All Categories' || e.category?.name === category
    const matchStatus  = status === 'all' || (status === 'published' ? e.is_published : !e.is_published)
    const matchType    = examType === 'all'   || e.exam_type    === examType
    const matchProgram = programId === 'all'  || e.program?.id  === programId
    return matchSearch && matchCat && matchStatus && matchType && matchProgram
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = !!(search || category !== 'All Categories' || status !== 'all' || examType !== 'all' || programId !== 'all')

  const clearFilters = () => {
    setSearch(''); setCategory('All Categories'); setStatus('all')
    setExamType('all'); setProgramId('all'); setPage(1)
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.headerIcon}><BookOpen size={20} color="#fff" /></div>
          <div>
            <h1 className={s.heading}>Exams</h1>
            <p className={s.headingSub}>Manage mock exams, practice sets, and assignments</p>
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

        {/* Category */}
        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Exam Type */}
        <div className={s.filterGroup}>
          <Tag size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={examType}
            onChange={e => { setExamType(e.target.value as ExamType | 'all'); setPage(1) }}>
            <option value="all">All Types</option>
            <option value="mock">Mock Exam</option>
            <option value="practice">Practice Exam</option>
          </select>
        </div>

        {/* Program — sourced from DB */}
        <div className={s.filterGroup}>
          <GraduationCap size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={programId}
            onChange={e => { setProgramId(e.target.value); setPage(1) }}>
            <option value="all">All Programs</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </select>
        </div>

        {/* Published status */}
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
                <th>Program</th>
                <th>Type</th>
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
                    <td><div className={`${s.skeleton} ${s.skelBadge}`} /></td>
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
                  <td colSpan={9}>
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

                    {/* Program — shows code badge or dash if not linked */}
                    <td>
                      {exam.program
                        ? <span className={s.programBadge} title={exam.program.name}>{exam.program.code}</span>
                        : <span className={s.programNone}>—</span>}
                    </td>

                    {/* Exam Type badge */}
                    <td>
                      <span className={exam.exam_type === 'mock' ? s.badgeMock : s.badgePractice}>
                        {EXAM_TYPE_META[exam.exam_type].label}
                      </span>
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