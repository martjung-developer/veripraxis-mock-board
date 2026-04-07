// app/(dashboard)/admin/exams/[examId]/questions/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  HelpCircle, ArrowLeft, Plus, Search, X, Pencil, Trash2,
  AlertCircle, Loader2, ChevronLeft, ChevronRight, Filter,
  CheckSquare, AlignLeft, List, ToggleLeft, Hash, Save,
} from 'lucide-react'
import s from './questions.module.css'
import { createClient } from '@/lib/supabase/client'
import type { QuestionType, QuestionOption } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Question {
  id: string
  question_text: string
  question_type: QuestionType
  points: number
  order_number: number | null
  options: QuestionOption[] | null
  correct_answer: string | null
  explanation: string | null
  created_at: string
}

// Blank form state
interface QuestionForm {
  question_text: string
  question_type: QuestionType
  points: number
  options: QuestionOption[]
  correct_answer: string
  explanation: string
}

const BLANK_FORM: QuestionForm = {
  question_text: '',
  question_type: 'multiple_choice',
  points: 1,
  options: [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ],
  correct_answer: '',
  explanation: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false:      'True / False',
  short_answer:    'Short Answer',
  essay:           'Essay',
  matching:        'Matching',
  fill_blank:      'Fill in the Blank',
}

const TYPE_ICONS: Record<QuestionType, React.ElementType> = {
  multiple_choice: CheckSquare,
  true_false:      ToggleLeft,
  short_answer:    AlignLeft,
  essay:           AlignLeft,
  matching:        List,
  fill_blank:      Hash,
}

const TYPE_COLORS: Record<QuestionType, string> = {
  multiple_choice: 'blue',
  true_false:      'green',
  short_answer:    'amber',
  essay:           'violet',
  matching:        'teal',
  fill_blank:      'rose',
}

// These types are auto-gradable
const AUTO_GRADE_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']

const PAGE_SIZE = 10

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuestionsPage() {
  const { examId } = useParams<{ examId: string }>()

  const [questions,    setQuestions]    = useState<Question[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState<QuestionType | 'all'>('all')
  const [page,         setPage]         = useState(1)

  // Modal state
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Question | null>(null) // null = create mode
  const [form,         setForm]         = useState<QuestionForm>(BLANK_FORM)
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data, error: fetchErr } = await supabase
      .from('questions')
      .select('id, question_text, question_type, points, order_number, options, correct_answer, explanation, created_at')
      .eq('exam_id', examId)
      .order('order_number', { ascending: true, nullsFirst: false })

    if (fetchErr) {
      setError('Could not load questions.')
    } else {
      setQuestions((data ?? []) as Question[])
    }
    setLoading(false)
  }, [examId])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  // ── Open modal helpers ─────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditTarget(null)
    setForm(BLANK_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEditModal = (q: Question) => {
    setEditTarget(q)
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      points:        q.points,
      options:       (q.options as QuestionOption[]) ?? [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' },
      ],
      correct_answer: q.correct_answer ?? '',
      explanation:    q.explanation ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditTarget(null)
    setFormError(null)
  }

  // ── Form field handlers ────────────────────────────────────────────────────
  const handleTypeChange = (type: QuestionType) => {
    setForm(prev => ({
      ...prev,
      question_type: type,
      correct_answer: '',
      // Reset options when switching to MCQ
      options: type === 'multiple_choice'
        ? (prev.options.length > 0 ? prev.options : [
            { label: 'A', text: '' },
            { label: 'B', text: '' },
            { label: 'C', text: '' },
            { label: 'D', text: '' },
          ])
        : prev.options,
    }))
  }

  const handleOptionText = (index: number, text: string) => {
    setForm(prev => {
      const opts = [...prev.options]
      opts[index] = { ...opts[index], text }
      return { ...prev, options: opts }
    })
  }

  const addOption = () => {
    setForm(prev => {
      const labels = ['A','B','C','D','E','F']
      const label = labels[prev.options.length] ?? String(prev.options.length + 1)
      return { ...prev, options: [...prev.options, { label, text: '' }] }
    })
  }

  const removeOption = (index: number) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
      correct_answer: prev.correct_answer === prev.options[index]?.label ? '' : prev.correct_answer,
    }))
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.question_text.trim()) return 'Question text is required.'
    if (form.points < 1) return 'Points must be at least 1.'
    if (form.question_type === 'multiple_choice') {
      if (form.options.some(o => !o.text.trim())) return 'All option texts are required.'
      if (!form.correct_answer) return 'Please select the correct answer.'
    }
    if (form.question_type === 'true_false' && !form.correct_answer) {
      return 'Please select True or False as the correct answer.'
    }
    return null
  }

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErr = validate()
    if (validationErr) { setFormError(validationErr); return }

    setSaving(true)
    setFormError(null)
    const supabase = createClient()

    // Build payload
    const payload = {
      question_text:  form.question_text.trim(),
      question_type:  form.question_type,
      points:         form.points,
      options:        form.question_type === 'multiple_choice' ? form.options : null,
      // correct_answer is null for essay/short_answer (manual grading)
      correct_answer: AUTO_GRADE_TYPES.includes(form.question_type)
        ? form.correct_answer || null
        : null,
      explanation:    form.explanation.trim() || null,
    }

    if (editTarget) {
      // UPDATE
      const { error: updateErr } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', editTarget.id)

      if (updateErr) {
        setFormError('Could not update question. Please try again.')
      } else {
        setQuestions(prev =>
          prev.map(q =>
            q.id === editTarget.id
              ? { ...q, ...payload, options: payload.options as QuestionOption[] | null }
              : q
          )
        )
        closeModal()
      }
    } else {
      // INSERT — auto-assign order_number as max + 1
      const maxOrder = questions.reduce((m, q) => Math.max(m, q.order_number ?? 0), 0)

      const { data: inserted, error: insertErr } = await supabase
        .from('questions')
        .insert({ ...payload, exam_id: examId, order_number: maxOrder + 1 })
        .select('id, question_text, question_type, points, order_number, options, correct_answer, explanation, created_at')
        .single()

      if (insertErr || !inserted) {
        setFormError('Could not create question. Please try again.')
      } else {
        setQuestions(prev => [...prev, inserted as Question])
        closeModal()
      }
    }

    setSaving(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    const { error: delErr } = await supabase
      .from('questions')
      .delete()
      .eq('id', deleteTarget.id)
    if (delErr) {
      setError('Could not delete question.')
    } else {
      setQuestions(prev => prev.filter(q => q.id !== deleteTarget.id))
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  // ── Filter + Paginate ──────────────────────────────────────────────────────
  const filtered = questions.filter(q => {
    const matchSearch = !search || q.question_text.toLowerCase().includes(search.toLowerCase())
    const matchType   = typeFilter === 'all' || q.question_type === typeFilter
    return matchSearch && matchType
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><HelpCircle size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Questions</h1>
              <p className={s.headingSub}>{questions.length} question{questions.length !== 1 ? 's' : ''} · Manage and add exam questions</p>
            </div>
          </div>
          <button className={s.btnPrimary} onClick={openCreateModal}>
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      {error && <div className={s.errorBanner}><AlertCircle size={14} />{error}</div>}

      {/* Filters */}
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input className={s.searchInput} placeholder="Search questions…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {search && <button className={s.searchClear} onClick={() => { setSearch(''); setPage(1) }}><X size={13} /></button>}
        </div>
        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value as QuestionType | 'all'); setPage(1) }}>
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Type</th>
                <th>Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className={s.skeletonRow}>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 24 }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: '80%' }} /></td>
                    <td><div className={`${s.skeleton} ${s.skelBadge}`} /></td>
                    <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 30 }} /></td>
                    <td><div className={s.skelActions}><div className={`${s.skeleton} ${s.skelBtn}`} /><div className={`${s.skeleton} ${s.skelBtn}`} /></div></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><HelpCircle size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No questions found</p>
                    <p className={s.emptySub}>Add your first question or adjust the filters.</p>
                  </div>
                </td></tr>
              ) : (
                paginated.map(q => {
                  const Icon  = TYPE_ICONS[q.question_type]
                  const color = TYPE_COLORS[q.question_type]
                  return (
                    <tr key={q.id} className={s.tableRow}>
                      <td><span className={s.orderChip}>{q.order_number ?? '—'}</span></td>
                      <td><div className={s.questionText}>{q.question_text}</div></td>
                      <td>
                        <span className={`${s.typeBadge} ${s[`typeBadge_${color}`]}`}>
                          <Icon size={11} />{TYPE_LABELS[q.question_type]}
                        </span>
                      </td>
                      <td><span className={s.pointsChip}>{q.points} pt{q.points !== 1 ? 's' : ''}</span></td>
                      <td>
                        <div className={s.actions}>
                          <button className={s.actionEdit} title="Edit" onClick={() => openEditModal(q)}>
                            <Pencil size={13} />
                          </button>
                          <button className={s.actionDelete} title="Delete" onClick={() => setDeleteTarget(q)}>
                            <Trash2 size={13} />
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

        {!loading && filtered.length > 0 && (
          <div className={s.pagination}>
            <span className={s.pageInfo}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className={s.pageButtons}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              {pageNums.map((n, i) => n === '…'
                ? <span key={`d${i}`} className={s.pageDots}>…</span>
                : <button key={n} className={`${s.pageBtn} ${page === n ? s.pageBtnActive : ''}`} onClick={() => setPage(n as number)}>{n}</button>
              )}
              <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Question Create/Edit Modal ── */}
      {modalOpen && (
        <div className={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className={s.modal}>
            {/* Modal Header */}
            <div className={s.modalHeader}>
              <div className={s.modalHeaderLeft}>
                <div className={s.modalHeaderIcon}>
                  <HelpCircle size={16} color="#fff" />
                </div>
                <h2 className={s.modalTitle}>{editTarget ? 'Edit Question' : 'Add Question'}</h2>
              </div>
              <button className={s.modalClose} onClick={closeModal}><X size={16} /></button>
            </div>

            {/* Modal Body */}
            <div className={s.modalBody}>
              {formError && (
                <div className={s.formError}><AlertCircle size={13} />{formError}</div>
              )}

              {/* Question Type Selector */}
              <div className={s.formGroup}>
                <label className={s.label}>Question Type</label>
                <div className={s.typeGrid}>
                  {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([type, label]) => {
                    const Icon = TYPE_ICONS[type]
                    const color = TYPE_COLORS[type]
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`${s.typeOption} ${form.question_type === type ? s.typeOptionActive : ''} ${s[`typeOption_${color}`]}`}
                        onClick={() => handleTypeChange(type)}
                      >
                        <Icon size={13} />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Question Text */}
              <div className={s.formGroup}>
                <label className={s.label}>Question Text <span className={s.required}>*</span></label>
                <textarea
                  className={s.textarea}
                  rows={3}
                  placeholder="Enter the question…"
                  value={form.question_text}
                  onChange={e => setForm(prev => ({ ...prev, question_text: e.target.value }))}
                />
              </div>

              {/* Points */}
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.label}>Points <span className={s.required}>*</span></label>
                  <input
                    type="number"
                    className={s.input}
                    min={1}
                    max={100}
                    value={form.points}
                    onChange={e => setForm(prev => ({ ...prev, points: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* ── MCQ Options ── */}
              {form.question_type === 'multiple_choice' && (
                <div className={s.formGroup}>
                  <label className={s.label}>Answer Options <span className={s.required}>*</span></label>
                  <div className={s.optionsList}>
                    {form.options.map((opt, i) => (
                      <div key={i} className={s.optionRow}>
                        <button
                          type="button"
                          className={`${s.optionLabel} ${form.correct_answer === opt.label ? s.optionLabelCorrect : ''}`}
                          title="Set as correct answer"
                          onClick={() => setForm(prev => ({ ...prev, correct_answer: opt.label }))}
                        >
                          {opt.label}
                        </button>
                        <input
                          className={s.optionInput}
                          placeholder={`Option ${opt.label}`}
                          value={opt.text}
                          onChange={e => handleOptionText(i, e.target.value)}
                        />
                        {form.options.length > 2 && (
                          <button className={s.optionRemove} type="button" onClick={() => removeOption(i)}>
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {form.options.length < 6 && (
                    <button className={s.addOptionBtn} type="button" onClick={addOption}>
                      <Plus size={12} /> Add Option
                    </button>
                  )}
                  {form.correct_answer && (
                    <p className={s.correctHint}>✓ Correct answer: Option {form.correct_answer}</p>
                  )}
                </div>
              )}

              {/* ── True/False ── */}
              {form.question_type === 'true_false' && (
                <div className={s.formGroup}>
                  <label className={s.label}>Correct Answer <span className={s.required}>*</span></label>
                  <div className={s.tfRow}>
                    <button
                      type="button"
                      className={`${s.tfBtn} ${form.correct_answer === 'true' ? s.tfBtnActive : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, correct_answer: 'true' }))}
                    >
                      True
                    </button>
                    <button
                      type="button"
                      className={`${s.tfBtn} ${form.correct_answer === 'false' ? s.tfBtnActive : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, correct_answer: 'false' }))}
                    >
                      False
                    </button>
                  </div>
                </div>
              )}

              {/* ── Fill in the Blank ── */}
              {form.question_type === 'fill_blank' && (
                <div className={s.formGroup}>
                  <label className={s.label}>Correct Answer <span className={s.required}>*</span></label>
                  <input
                    className={s.input}
                    placeholder="Expected answer text…"
                    value={form.correct_answer}
                    onChange={e => setForm(prev => ({ ...prev, correct_answer: e.target.value }))}
                  />
                </div>
              )}

              {/* ── Essay / Short Answer notice ── */}
              {(form.question_type === 'essay' || form.question_type === 'short_answer') && (
                <div className={s.manualNotice}>
                  <AlertCircle size={13} />
                  <span>
                    {form.question_type === 'essay'
                      ? 'Essay questions require manual grading by a faculty member.'
                      : 'Short answer questions will be flagged for manual review.'}
                  </span>
                </div>
              )}

              {/* Explanation */}
              <div className={s.formGroup}>
                <label className={s.label}>Explanation <span className={s.optional}>(optional)</span></label>
                <textarea
                  className={s.textarea}
                  rows={2}
                  placeholder="Shown to students after submission…"
                  value={form.explanation}
                  onChange={e => setForm(prev => ({ ...prev, explanation: e.target.value }))}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={closeModal} disabled={saving}>Cancel</button>
              <button className={s.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 size={13} className={s.spinner} /> Saving…</>
                  : <><Save size={13} /> {editTarget ? 'Save Changes' : 'Create Question'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className={s.modalOverlay}>
          <div className={s.deleteModal}>
            <div className={s.deleteModalIcon}><Trash2 size={22} color="var(--danger)" /></div>
            <h2 className={s.modalTitle}>Delete Question?</h2>
            <p className={s.deleteModalBody}>This question and all associated answers will be permanently deleted.</p>
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