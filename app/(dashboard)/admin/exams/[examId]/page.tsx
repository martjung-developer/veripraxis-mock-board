// app/(dashboard)/admin/exams/[examId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BookOpen, ArrowLeft, Pencil, HelpCircle, Users, BarChart2,
  ClipboardList, Clock, Target, Tag, AlignLeft, CheckCircle,
  XCircle, ChevronRight, FileText, Award, X, Loader2, Save,
  ChevronDown, AlertCircle,
} from 'lucide-react'
import s from './detail.module.css'
import { createClient } from '@/lib/supabase/client'
import { EXAM_TYPE_META, type ExamType } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────
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
  submission_count: number
  avg_score:        number | null
  created_at:       string
  updated_at:       string
}

interface EditForm {
  title:            string
  description:      string
  category_id:      string
  program_id:       string
  exam_type:        ExamType
  duration_minutes: string
  total_points:     string
  passing_score:    string
  is_published:     boolean
}

interface CategoryRow { id: string; name: string }
interface ProgramRow  { id: string; code: string; name: string }

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
  updated_at:       string
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

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`${s.toast} ${type === 'success' ? s.toastSuccess : s.toastError}`}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      <span>{message}</span>
      <button onClick={onClose} className={s.toastClose}><X size={12} /></button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>()
  const [exam,         setExam]         = useState<Exam | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // Edit modal
  const [showEdit,     setShowEdit]     = useState(false)
  const [editForm,     setEditForm]     = useState<EditForm | null>(null)
  const [editSaving,   setEditSaving]   = useState(false)
  const [editErrors,   setEditErrors]   = useState<Partial<Record<keyof EditForm, string>>>({})
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])
  const [programs,     setPrograms]     = useState<ProgramRow[]>([])
  const [toast,        setToast]        = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ── Fetch exam ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!examId) return
    let cancelled = false

    async function fetchExam() {
      setLoading(true)
      const supabase = createClient()

      const [examRes, catRes, progRes] = await Promise.all([
        supabase
          .from('exams')
          .select(`
            id, title, description,
            duration_minutes, total_points, passing_score,
            is_published, exam_type, created_at, updated_at,
            exam_categories ( id, name, icon ),
            programs ( id, code, name )
          `)
          .eq('id', examId)
          .single(),
        supabase.from('exam_categories').select('id, name').order('name'),
        supabase.from('programs').select('id, code, name').order('code'),
      ])

      if (examRes.error || !examRes.data) {
        if (!cancelled) setError('Exam not found.')
        setLoading(false)
        return
      }

      if (!cancelled) {
        setCategoryRows((catRes.data ?? []) as CategoryRow[])
        setPrograms((progRes.data ?? []) as ProgramRow[])
      }

      const raw  = examRes.data as unknown as ExamRaw
      const cat  = unwrapCategory(raw.exam_categories)
      const prog = unwrapProgram(raw.programs)

      const [qRes, aRes, subRes, scoreRes] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', examId),
        supabase.from('exam_assignments').select('id', { count: 'exact', head: true }).eq('exam_id', examId).eq('is_active', true),
        supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('exam_id', examId),
        supabase.from('submissions').select('percentage').eq('exam_id', examId).eq('status', 'graded').not('percentage', 'is', null),
      ])

      const percentages = (scoreRes.data ?? [])
        .map((r: { percentage: number | null }) => r.percentage)
        .filter((p): p is number => p !== null)
      const avgScore = percentages.length
        ? percentages.reduce((a, b) => a + b, 0) / percentages.length
        : null

      if (!cancelled) {
        setExam({
          id:               raw.id,
          title:            raw.title,
          description:      raw.description,
          category:         cat  ? { id: cat.id,   name: cat.name  } : null,
          program:          prog ? { id: prog.id,  code: prog.code, name: prog.name } : null,
          exam_type:        safeExamType(raw.exam_type),
          duration_minutes: raw.duration_minutes,
          total_points:     raw.total_points,
          passing_score:    raw.passing_score,
          is_published:     raw.is_published,
          question_count:   qRes.count   ?? 0,
          assigned_count:   aRes.count   ?? 0,
          submission_count: subRes.count ?? 0,
          avg_score:        avgScore,
          created_at:       raw.created_at,
          updated_at:       raw.updated_at,
        })
        setLoading(false)
      }
    }

    fetchExam()
    return () => { cancelled = true }
  }, [examId])

  // ── Open/close edit ────────────────────────────────────────────────────────
  const openEdit = () => {
    if (!exam) return
    setEditErrors({})
    setEditForm({
      title:            exam.title,
      description:      exam.description ?? '',
      category_id:      exam.category?.id ?? '',
      program_id:       exam.program?.id  ?? '',
      exam_type:        exam.exam_type,
      duration_minutes: String(exam.duration_minutes),
      total_points:     String(exam.total_points),
      passing_score:    String(exam.passing_score),
      is_published:     exam.is_published,
    })
    setShowEdit(true)
  }

  const closeEdit = () => {
    if (editSaving) return
    setShowEdit(false)
    setEditForm(null)
    setEditErrors({})
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  const validateEdit = (form: EditForm): boolean => {
    const errs: Partial<Record<keyof EditForm, string>> = {}
    if (!form.title.trim())                                     errs.title            = 'Title is required.'
    if (!form.duration_minutes || Number(form.duration_minutes) < 1) errs.duration_minutes = 'At least 1 minute.'
    if (!form.total_points    || Number(form.total_points)    < 1)   errs.total_points     = 'At least 1 point.'
    const ps = Number(form.passing_score)
    if (isNaN(ps) || ps < 0 || ps > 100)                       errs.passing_score    = 'Must be 0–100.'
    setEditErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!exam || !editForm) return
    if (!validateEdit(editForm)) return

    setEditSaving(true)
    const supabase = createClient()

    const payload = {
      title:            editForm.title.trim(),
      description:      editForm.description.trim() || null,
      category_id:      editForm.category_id  || null,
      program_id:       editForm.program_id   || null,
      exam_type:        editForm.exam_type,
      duration_minutes: Number(editForm.duration_minutes),
      total_points:     Number(editForm.total_points),
      passing_score:    Number(editForm.passing_score),
      is_published:     editForm.is_published,
      updated_at:       new Date().toISOString(),
    }

    const { error: saveErr } = await supabase.from('exams').update(payload).eq('id', exam.id)

    if (saveErr) {
      setToast({ message: 'Failed to save. Please try again.', type: 'error' })
      setEditSaving(false)
      return
    }

    // Resolve display names from local data
    const newCat  = categoryRows.find(c => c.id === editForm.category_id)
    const newProg = programs.find(p => p.id === editForm.program_id)

    // Optimistic update
    setExam(prev => prev ? {
      ...prev,
      ...payload,
      category: newCat  ? { id: newCat.id,  name: newCat.name  } : null,
      program:  newProg ? { id: newProg.id, code: newProg.code, name: newProg.name } : null,
    } : prev)

    setEditSaving(false)
    closeEdit()
    setToast({ message: `"${payload.title}" updated successfully.`, type: 'success' })
  }

  // ── Subpage nav ────────────────────────────────────────────────────────────
  const subpages = exam ? [
    { href: `/admin/exams/${examId}/questions`,   icon: HelpCircle,    label: 'Questions',   desc: 'Manage exam questions',         count: exam.question_count,   color: 'blue'   },
    { href: `/admin/exams/${examId}/assignments`, icon: Users,         label: 'Assignments', desc: 'View assigned students',        count: exam.assigned_count,   color: 'violet' },
    { href: `/admin/exams/${examId}/submissions`, icon: ClipboardList, label: 'Submissions', desc: 'View student submissions',      count: exam.submission_count, color: 'amber'  },
    { href: `/admin/exams/${examId}/results`,     icon: BarChart2,     label: 'Results',     desc: 'Graded scores and performance', count: null,                  color: 'green'  },
  ] : []

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) return (
    <div className={s.page}>
      <div className={s.skeleton} style={{ width: 200, height: 18, marginBottom: 8 }} />
      <div className={s.skeleton} style={{ width: '60%', height: 28, marginBottom: 32 }} />
      <div className={s.skeletonGrid}>
        {[...Array(4)].map((_, i) => <div key={i} className={`${s.skeleton} ${s.skeletonCard}`} />)}
      </div>
    </div>
  )

  if (error || !exam) return (
    <div className={s.page}><p>{error ?? 'Exam not found.'}</p></div>
  )

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  return (
    <div className={s.page}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className={s.header}>
        <Link href="/admin/exams" className={s.backBtn}><ArrowLeft size={14} /> Back to Exams</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><BookOpen size={20} color="#fff" /></div>
            <div>
              <div className={s.headerMeta}>
                <span className={s.categoryBadge}>{exam.category?.name ?? '—'}</span>
                {exam.is_published
                  ? <span className={s.badgePublished}><CheckCircle size={11} /> Published</span>
                  : <span className={s.badgeDraft}><XCircle size={11} /> Draft</span>}
              </div>
              <h1 className={s.heading}>{exam.title}</h1>
            </div>
          </div>
          <div className={s.headerActions}>
            {/* ✅ FIX: Button triggers modal, not /edit page */}
            <button className={s.btnSecondary} onClick={openEdit}>
              <Pencil size={13} /> Edit Exam
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsGrid}>
        {[
          { icon: Clock,      label: 'Duration',     value: `${exam.duration_minutes} min`,                            color: 'blue'   },
          { icon: HelpCircle, label: 'Questions',     value: exam.question_count,                                       color: 'violet' },
          { icon: Target,     label: 'Passing Score', value: `${exam.passing_score}%`,                                  color: 'amber'  },
          { icon: Users,      label: 'Assigned',      value: exam.assigned_count,                                       color: 'green'  },
          { icon: FileText,   label: 'Submissions',   value: exam.submission_count,                                     color: 'blue'   },
          { icon: Award,      label: 'Avg Score',     value: exam.avg_score != null ? `${exam.avg_score.toFixed(1)}%` : '—', color: 'violet' },
        ].map(stat => (
          <div key={stat.label} className={`${s.statCard} ${s[`stat_${stat.color}`]}`}>
            <div className={s.statIcon}><stat.icon size={16} /></div>
            <div>
              <div className={s.statValue}>{stat.value}</div>
              <div className={s.statLabel}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Details + Nav */}
      <div className={s.layout}>
        <div className={s.mainCol}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <AlignLeft size={15} color="var(--primary)" />
              <h2 className={s.cardTitle}>Description</h2>
            </div>
            <div className={s.cardBody}>
              <p className={s.description}>{exam.description || 'No description provided.'}</p>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardHeader}>
              <Tag size={15} color="var(--primary)" />
              <h2 className={s.cardTitle}>Exam Details</h2>
            </div>
            <div className={s.cardBody}>
              <div className={s.detailGrid}>
                {[
                  { label: 'Category',      value: exam.category?.name ?? '—' },
                  { label: 'Program',       value: exam.program ? `${exam.program.code} — ${exam.program.name}` : '—' },
                  { label: 'Exam Type',     value: EXAM_TYPE_META[exam.exam_type].label },
                  { label: 'Duration',      value: `${exam.duration_minutes} minutes` },
                  { label: 'Total Points',  value: exam.total_points },
                  { label: 'Passing Score', value: `${exam.passing_score}%` },
                  { label: 'Created',       value: fmt(exam.created_at) },
                  { label: 'Last Updated',  value: fmt(exam.updated_at) },
                ].map(d => (
                  <div key={d.label} className={s.detailRow}>
                    <span className={s.detailKey}>{d.label}</span>
                    <span className={s.detailVal}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={s.sideCol}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <BookOpen size={15} color="var(--primary)" />
              <h2 className={s.cardTitle}>Exam Sections</h2>
            </div>
            <div className={s.navList}>
              {subpages.map(sp => (
                <Link key={sp.href} href={sp.href} className={`${s.navItem} ${s[`navItem_${sp.color}`]}`}>
                  <div className={`${s.navIcon} ${s[`navIcon_${sp.color}`]}`}>
                    <sp.icon size={17} />
                  </div>
                  <div className={s.navContent}>
                    <div className={s.navLabel}>{sp.label}</div>
                    <div className={s.navDesc}>{sp.desc}</div>
                  </div>
                  {sp.count != null && <span className={s.navCount}>{sp.count}</span>}
                  <ChevronRight size={14} className={s.navChevron} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          EDIT EXAM MODAL
      ══════════════════════════════════════ */}
      {showEdit && editForm && (
        <div
          className={s.modalOverlay}
          onClick={e => { if (e.target === e.currentTarget) closeEdit() }}
        >
          <div className={s.editModal}>
            {/* Header */}
            <div className={s.editModalHeader}>
              <div className={s.editModalHeaderLeft}>
                <div className={s.editModalIcon}><Pencil size={16} color="#fff" /></div>
                <div>
                  <h2 className={s.editModalTitle}>Edit Exam</h2>
                  <p className={s.editModalSub}>Update exam details below</p>
                </div>
              </div>
              <button className={s.editModalClose} onClick={closeEdit} disabled={editSaving}>
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className={s.editModalBody}>
              <div className={s.editField}>
                <label className={s.editLabel}>Title <span className={s.req}>*</span></label>
                <input
                  className={`${s.editInput} ${editErrors.title ? s.editInputError : ''}`}
                  value={editForm.title}
                  onChange={e => setEditForm(f => f ? { ...f, title: e.target.value } : f)}
                />
                {editErrors.title && <p className={s.editFieldError}>{editErrors.title}</p>}
              </div>

              <div className={s.editField}>
                <label className={s.editLabel}>Description</label>
                <textarea
                  className={s.editTextarea}
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm(f => f ? { ...f, description: e.target.value } : f)}
                />
              </div>

              <div className={s.editGrid2}>
                <div className={s.editField}>
                  <label className={s.editLabel}>Category</label>
                  <div className={s.editSelectWrap}>
                    <select
                      className={s.editSelect}
                      value={editForm.category_id}
                      onChange={e => setEditForm(f => f ? { ...f, category_id: e.target.value } : f)}
                    >
                      <option value="">— No category —</option>
                      {categoryRows.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={13} className={s.editSelectChevron} />
                  </div>
                </div>

                <div className={s.editField}>
                  <label className={s.editLabel}>Program</label>
                  <div className={s.editSelectWrap}>
                    <select
                      className={s.editSelect}
                      value={editForm.program_id}
                      onChange={e => setEditForm(f => f ? { ...f, program_id: e.target.value } : f)}
                    >
                      <option value="">— No program —</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                    </select>
                    <ChevronDown size={13} className={s.editSelectChevron} />
                  </div>
                </div>
              </div>

              <div className={s.editField}>
                <label className={s.editLabel}>Exam Type</label>
                <div className={s.editTypeTabs}>
                  {(['mock', 'practice'] as ExamType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`${s.editTypeTab} ${editForm.exam_type === t ? s.editTypeTabActive : ''}`}
                      onClick={() => setEditForm(f => f ? { ...f, exam_type: t } : f)}
                    >
                      <span className={s.editTypeTabLabel}>{EXAM_TYPE_META[t].label}</span>
                      <span className={s.editTypeTabDesc}>{EXAM_TYPE_META[t].description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.editGrid3}>
                <div className={s.editField}>
                  <label className={s.editLabel}>Duration (min) <span className={s.req}>*</span></label>
                  <input
                    type="number" min={1}
                    className={`${s.editInput} ${editErrors.duration_minutes ? s.editInputError : ''}`}
                    value={editForm.duration_minutes}
                    onChange={e => setEditForm(f => f ? { ...f, duration_minutes: e.target.value } : f)}
                  />
                  {editErrors.duration_minutes && <p className={s.editFieldError}>{editErrors.duration_minutes}</p>}
                </div>

                <div className={s.editField}>
                  <label className={s.editLabel}>Total Points <span className={s.req}>*</span></label>
                  <input
                    type="number" min={1}
                    className={`${s.editInput} ${editErrors.total_points ? s.editInputError : ''}`}
                    value={editForm.total_points}
                    onChange={e => setEditForm(f => f ? { ...f, total_points: e.target.value } : f)}
                  />
                  {editErrors.total_points && <p className={s.editFieldError}>{editErrors.total_points}</p>}
                </div>

                <div className={s.editField}>
                  <label className={s.editLabel}>Passing (%) <span className={s.req}>*</span></label>
                  <input
                    type="number" min={0} max={100}
                    className={`${s.editInput} ${editErrors.passing_score ? s.editInputError : ''}`}
                    value={editForm.passing_score}
                    onChange={e => setEditForm(f => f ? { ...f, passing_score: e.target.value } : f)}
                  />
                  {editErrors.passing_score && <p className={s.editFieldError}>{editErrors.passing_score}</p>}
                </div>
              </div>

              <div className={s.editToggleRow}>
                <div>
                  <div className={s.editToggleLabel}>Published</div>
                  <div className={s.editToggleSub}>Students can see and take this exam</div>
                </div>
                <label className={s.toggle}>
                  <input
                    type="checkbox"
                    checked={editForm.is_published}
                    onChange={e => setEditForm(f => f ? { ...f, is_published: e.target.checked } : f)}
                  />
                  <span className={s.toggleSlider} />
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className={s.editModalFooter}>
              <button className={s.btnSecondary} onClick={closeEdit} disabled={editSaving}>Cancel</button>
              <button className={s.btnPrimary} onClick={handleEditSave} disabled={editSaving}>
                {editSaving
                  ? <><Loader2 size={13} className={s.spinner} /> Saving…</>
                  : <><Save size={13} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}