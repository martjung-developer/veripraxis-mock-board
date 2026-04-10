// app/(dashboard)/admin/exams/[examId]/questions/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  HelpCircle, ArrowLeft, Plus, Search, X, Pencil, Trash2,
  AlertCircle, Loader2, Filter, ChevronDown, ChevronRight,
  CheckSquare, AlignLeft, List, ToggleLeft, Hash, FileText,
  Save, GripVertical, Key,
} from 'lucide-react'
import s from './questions.module.css'
import { createClient } from '@/lib/supabase/client'
import type { QuestionType, QuestionOption } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id:             string
  question_text:  string
  question_type:  QuestionType
  points:         number
  order_number:   number | null
  options:        QuestionOption[] | null
  correct_answer: string | null
  explanation:    string | null
  created_at:     string
}

interface QuestionForm {
  question_text:  string
  question_type:  QuestionType
  points:         number
  options:        QuestionOption[]
  correct_answer: string
  explanation:    string
}

const BLANK_FORM: QuestionForm = {
  question_text:  '',
  question_type:  'multiple_choice',
  points:         1,
  options:        [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ],
  correct_answer: '',
  explanation:    '',
}

// ── Meta ───────────────────────────────────────────────────────────────────────

const TYPE_META: Record<QuestionType, {
  label:       string
  icon:        React.ElementType
  color:       string
  description: string
  autoGrade:   boolean
}> = {
  multiple_choice: { label: 'Multiple Choice', icon: CheckSquare, color: 'blue',   description: 'Students pick one correct option (A–D)',      autoGrade: true  },
  true_false:      { label: 'True / False',    icon: ToggleLeft,  color: 'green',  description: 'Binary True/False question',                  autoGrade: true  },
  fill_blank:      { label: 'Fill in Blank',   icon: Hash,        color: 'rose',   description: 'Student fills a blank; exact match graded',   autoGrade: true  },
  short_answer:    { label: 'Short Answer',    icon: AlignLeft,   color: 'amber',  description: 'Brief written response; manual/AI graded',    autoGrade: false },
  matching:        { label: 'Matching',        icon: List,        color: 'teal',   description: 'Match column A to column B; manual graded',   autoGrade: false },
  essay:           { label: 'Essay',           icon: FileText,    color: 'violet', description: 'Extended response; rubric + AI assisted',     autoGrade: false },
}

const GROUP_ORDER: QuestionType[] = [
  'multiple_choice', 'true_false', 'fill_blank',
  'short_answer', 'matching', 'essay',
]

const AUTO_GRADE_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`${s.toast} ${type === 'success' ? s.toastSuccess : s.toastError}`}>
      {type === 'success' ? '✓' : '✕'} {message}
      <button onClick={onClose} className={s.toastClose}><X size={11} /></button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuestionsPage() {
  const { examId } = useParams<{ examId: string }>()

  const [questions,     setQuestions]     = useState<Question[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [typeFilter,    setTypeFilter]    = useState<QuestionType | 'all'>('all')
  const [expandedTypes, setExpandedTypes] = useState<Set<QuestionType>>(new Set(GROUP_ORDER))
  const [toast,         setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modal
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Question | null>(null)
  const [form,         setForm]         = useState<QuestionForm>(BLANK_FORM)
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)

  // Delete
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

  // ── Grouped + filtered ─────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = questions.filter(qn => {
      const matchSearch = !search || qn.question_text.toLowerCase().includes(q)
      const matchType   = typeFilter === 'all' || qn.question_type === typeFilter
      return matchSearch && matchType
    })

    const map: Partial<Record<QuestionType, Question[]>> = {}
    for (const qn of filtered) {
      ;(map[qn.question_type] ??= []).push(qn)
    }
    return map
  }, [questions, search, typeFilter])

  const totalQuestions = questions.length
  const totalPoints    = questions.reduce((s, q) => s + q.points, 0)

  // ── Expand/collapse ────────────────────────────────────────────────────────
  const toggleExpand = (type: QuestionType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const expandAll  = () => setExpandedTypes(new Set(GROUP_ORDER))
  const collapseAll = () => setExpandedTypes(new Set())

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreateModal = (defaultType?: QuestionType) => {
    setEditTarget(null)
    setForm({ ...BLANK_FORM, question_type: defaultType ?? 'multiple_choice' })
    setFormError(null)
    setModalOpen(true)
  }

  const openEditModal = (q: Question) => {
    setEditTarget(q)
    setForm({
      question_text:  q.question_text,
      question_type:  q.question_type,
      points:         q.points,
      options:        (q.options as QuestionOption[]) ?? [
        { label: 'A', text: '' }, { label: 'B', text: '' },
        { label: 'C', text: '' }, { label: 'D', text: '' },
      ],
      correct_answer: q.correct_answer ?? '',
      explanation:    q.explanation ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditTarget(null); setFormError(null) }

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleTypeChange = (type: QuestionType) => {
    setForm(prev => ({
      ...prev,
      question_type:  type,
      correct_answer: '',
      options: type === 'multiple_choice' ? (prev.options.length > 0 ? prev.options : [
        { label: 'A', text: '' }, { label: 'B', text: '' },
        { label: 'C', text: '' }, { label: 'D', text: '' },
      ]) : prev.options,
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
      const label  = labels[prev.options.length] ?? String(prev.options.length + 1)
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
    if (!form.question_text.trim())   return 'Question text is required.'
    if (form.points < 1)              return 'Points must be at least 1.'
    if (form.question_type === 'multiple_choice') {
      if (form.options.some(o => !o.text.trim())) return 'All option texts are required.'
      if (!form.correct_answer)                   return 'Please select the correct answer.'
    }
    if (form.question_type === 'true_false' && !form.correct_answer) {
      return 'Please select True or False as the correct answer.'
    }
    return null
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationErr = validate()
    if (validationErr) { setFormError(validationErr); return }

    setSaving(true)
    setFormError(null)
    const supabase = createClient()

    const payload = {
      question_text:  form.question_text.trim(),
      question_type:  form.question_type,
      points:         form.points,
      options:        form.question_type === 'multiple_choice' ? form.options : null,
      correct_answer: AUTO_GRADE_TYPES.includes(form.question_type) ? form.correct_answer || null : null,
      explanation:    form.explanation.trim() || null,
    }

    if (editTarget) {
      const { error: updateErr } = await supabase
        .from('questions').update(payload).eq('id', editTarget.id)
      if (updateErr) {
        setFormError('Could not update question.')
        setSaving(false)
        return
      }
      setQuestions(prev => prev.map(q =>
        q.id === editTarget.id ? { ...q, ...payload, options: payload.options as QuestionOption[] | null } : q
      ))
      closeModal()
      setToast({ message: 'Question updated.', type: 'success' })
    } else {
      const maxOrder = questions.reduce((m, q) => Math.max(m, q.order_number ?? 0), 0)
      const { data: inserted, error: insertErr } = await supabase
        .from('questions')
        .insert({ ...payload, exam_id: examId, order_number: maxOrder + 1 })
        .select('id, question_text, question_type, points, order_number, options, correct_answer, explanation, created_at')
        .single()

      if (insertErr || !inserted) {
        setFormError('Could not create question.')
        setSaving(false)
        return
      }
      setQuestions(prev => [...prev, inserted as Question])
      closeModal()
      setToast({ message: 'Question added.', type: 'success' })
    }
    setSaving(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    const { error: delErr } = await supabase.from('questions').delete().eq('id', deleteTarget.id)
    if (delErr) {
      setError('Could not delete question.')
    } else {
      setQuestions(prev => prev.filter(q => q.id !== deleteTarget.id))
      setToast({ message: 'Question deleted.', type: 'success' })
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><HelpCircle size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Questions</h1>
              <p className={s.headingSub}>
                {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} · {totalPoints} total pts
              </p>
            </div>
          </div>
          <div className={s.headerActions}>
            <Link href={`/admin/exams/${examId}/answer-key`} className={s.btnOutline}>
              <Key size={13} /> Answer Key
            </Link>
            <button className={s.btnPrimary} onClick={() => openCreateModal()}>
              <Plus size={14} /> Add Question
            </button>
          </div>
        </div>
      </div>

      {error && <div className={s.errorBanner}><AlertCircle size={14} />{error}</div>}

      {/* Stats strip */}
      {!loading && totalQuestions > 0 && (
        <div className={s.statsStrip}>
          {GROUP_ORDER.map(type => {
            const count = questions.filter(q => q.question_type === type).length
            if (count === 0) return null
            const meta = TYPE_META[type]
            const Icon = meta.icon
            return (
              <div key={type} className={`${s.statChip} ${s[`statChip_${meta.color}`]}`}>
                <Icon size={11} />
                <span>{meta.label}</span>
                <strong>{count}</strong>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters + expand controls */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Search questions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={s.searchClear} onClick={() => setSearch('')}><X size={13} /></button>}
        </div>

        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as QuestionType | 'all')}>
            <option value="all">All Types</option>
            {GROUP_ORDER.map(t => (
              <option key={t} value={t}>{TYPE_META[t].label}</option>
            ))}
          </select>
        </div>

        <div className={s.expandControls}>
          <button className={s.expandBtn} onClick={expandAll}>Expand All</button>
          <span className={s.expandDivider} />
          <button className={s.expandBtn} onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      {/* Grouped sections */}
      {loading ? (
        <div className={s.loadingState}>
          <Loader2 size={22} className={s.spinner} />
          <p>Loading questions…</p>
        </div>
      ) : totalQuestions === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}><HelpCircle size={24} color="var(--text-muted)" /></div>
          <p className={s.emptyTitle}>No questions yet</p>
          <p className={s.emptySub}>Click "Add Question" to create your first question.</p>
          <button className={s.btnPrimary} style={{ marginTop: '1rem' }} onClick={() => openCreateModal()}>
            <Plus size={14} /> Add First Question
          </button>
        </div>
      ) : (
        <div className={s.groups}>
          {GROUP_ORDER.map(type => {
            const typeQuestions = grouped[type]
            if (!typeQuestions?.length && (search || typeFilter !== 'all')) return null
            if (!questions.some(q => q.question_type === type)) return null

            const meta       = TYPE_META[type]
            const Icon       = meta.icon
            const isExpanded = expandedTypes.has(type)
            const count      = questions.filter(q => q.question_type === type).length
            const pts        = questions.filter(q => q.question_type === type).reduce((s, q) => s + q.points, 0)
            const visibleQ   = typeQuestions ?? []

            return (
              <div key={type} className={`${s.group} ${s[`group_${meta.color}`]}`}>
                {/* Group header */}
                <div className={s.groupHeader}>
                  <button className={s.groupToggle} onClick={() => toggleExpand(type)}>
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <div className={`${s.groupIcon} ${s[`groupIcon_${meta.color}`]}`}>
                      <Icon size={15} />
                    </div>
                    <div className={s.groupTitleBlock}>
                      <span className={s.groupTitle}>{meta.label}</span>
                      <span className={s.groupMeta}>{meta.description}</span>
                    </div>
                  </button>

                  <div className={s.groupHeaderRight}>
                    <div className={`${s.groupModeBadge} ${meta.autoGrade ? s.groupModeBadgeAuto : s.groupModeBadgeManual}`}>
                      {meta.autoGrade ? '⚡ Auto' : '✍ Manual'}
                    </div>
                    <div className={s.groupStats}>
                      <span className={s.groupCount}>{count} question{count !== 1 ? 's' : ''}</span>
                      <span className={s.groupPts}>{pts} pts</span>
                    </div>
                    <button
                      className={s.addInGroupBtn}
                      onClick={() => openCreateModal(type)}
                      title={`Add ${meta.label} question`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Questions list */}
                {isExpanded && (
                  <div className={s.groupBody}>
                    {visibleQ.length === 0 ? (
                      <div className={s.groupEmpty}>
                        <p>No questions match your search in this category.</p>
                      </div>
                    ) : (
                      visibleQ.map((q, idx) => (
                        <div key={q.id} className={s.questionRow}>
                          <div className={s.questionDragHandle}>
                            <GripVertical size={14} />
                          </div>

                          <div className={s.questionNum}>
                            {q.order_number ?? idx + 1}
                          </div>

                          <div className={s.questionContent}>
                            <p className={s.questionText}>{q.question_text}</p>

                            {/* MCQ options preview */}
                            {q.question_type === 'multiple_choice' && q.options && (
                              <div className={s.optionsPreview}>
                                {(q.options as QuestionOption[]).map(opt => (
                                  <span
                                    key={opt.label}
                                    className={`${s.optPreview} ${q.correct_answer === opt.label ? s.optPreviewCorrect : ''}`}
                                  >
                                    {opt.label}: {opt.text.length > 25 ? opt.text.slice(0, 25) + '…' : opt.text}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* T/F answer preview */}
                            {q.question_type === 'true_false' && q.correct_answer && (
                              <span className={s.tfPreview}>
                                Answer: <strong>{q.correct_answer === 'true' ? 'True' : 'False'}</strong>
                              </span>
                            )}

                            {/* Fill blank preview */}
                            {q.question_type === 'fill_blank' && q.correct_answer && (
                              <span className={s.fillPreview}>
                                Expected: <strong>{q.correct_answer}</strong>
                              </span>
                            )}

                            {/* Manual types note */}
                            {!meta.autoGrade && (
                              <span className={s.manualNote}>
                                ✍ {meta.label === 'Essay' ? 'Rubric + AI-assisted grading' : 'Manual grading required'}
                              </span>
                            )}

                            {q.explanation && (
                              <span className={s.hasExplanation}>💡 Has explanation</span>
                            )}
                          </div>

                          <div className={s.questionMeta}>
                            <span className={s.pointsPill}>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                          </div>

                          <div className={s.questionActions}>
                            <button className={s.actionEdit} title="Edit" onClick={() => openEditModal(q)}>
                              <Pencil size={13} />
                            </button>
                            <button className={s.actionDelete} title="Delete" onClick={() => setDeleteTarget(q)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Add in group footer */}
                    <button
                      className={s.addInGroupFooter}
                      onClick={() => openCreateModal(type)}
                    >
                      <Plus size={13} /> Add {meta.label} Question
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Question Modal ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className={s.modal}>
            <div className={s.modalHeader}>
              <div className={s.modalHeaderLeft}>
                <div className={s.modalHeaderIcon}><HelpCircle size={16} color="#fff" /></div>
                <h2 className={s.modalTitle}>{editTarget ? 'Edit Question' : 'Add Question'}</h2>
              </div>
              <button className={s.modalClose} onClick={closeModal}><X size={16} /></button>
            </div>

            <div className={s.modalBody}>
              {formError && (
                <div className={s.formError}><AlertCircle size={13} />{formError}</div>
              )}

              {/* Type selector */}
              <div className={s.formGroup}>
                <label className={s.label}>Question Type</label>
                <div className={s.typeGrid}>
                  {GROUP_ORDER.map(type => {
                    const meta = TYPE_META[type]
                    const Icon = meta.icon
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`${s.typeOption} ${form.question_type === type ? s.typeOptionActive : ''} ${s[`typeOption_${meta.color}`]}`}
                        onClick={() => handleTypeChange(type)}
                      >
                        <Icon size={13} />
                        <span>{meta.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Question text */}
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
                    type="number" className={s.input} min={1} max={100}
                    value={form.points}
                    onChange={e => setForm(prev => ({ ...prev, points: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* MCQ options */}
              {form.question_type === 'multiple_choice' && (
                <div className={s.formGroup}>
                  <label className={s.label}>Answer Options <span className={s.required}>*</span></label>
                  <div className={s.optionsList}>
                    {form.options.map((opt, i) => (
                      <div key={i} className={s.optionRow}>
                        <button
                          type="button"
                          className={`${s.optionLabel} ${form.correct_answer === opt.label ? s.optionLabelCorrect : ''}`}
                          title="Set as correct"
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

              {/* True/False */}
              {form.question_type === 'true_false' && (
                <div className={s.formGroup}>
                  <label className={s.label}>Correct Answer <span className={s.required}>*</span></label>
                  <div className={s.tfRow}>
                    <button type="button"
                      className={`${s.tfBtn} ${form.correct_answer === 'true' ? s.tfBtnActive : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, correct_answer: 'true' }))}>
                      True
                    </button>
                    <button type="button"
                      className={`${s.tfBtn} ${form.correct_answer === 'false' ? s.tfBtnActive : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, correct_answer: 'false' }))}>
                      False
                    </button>
                  </div>
                </div>
              )}

              {/* Fill blank */}
              {form.question_type === 'fill_blank' && (
                <div className={s.formGroup}>
                  <label className={s.label}>Correct Answer <span className={s.required}>*</span></label>
                  <input className={s.input} placeholder="Expected answer…"
                    value={form.correct_answer}
                    onChange={e => setForm(prev => ({ ...prev, correct_answer: e.target.value }))} />
                </div>
              )}

              {/* Manual grading notice */}
              {(form.question_type === 'essay' || form.question_type === 'short_answer' || form.question_type === 'matching') && (
                <div className={s.manualNotice}>
                  <Pencil size={13} />
                  <div>
                    <strong>{TYPE_META[form.question_type].label}</strong> — {TYPE_META[form.question_type].description}
                    <br />
                    <span className={s.manualNoticeSub}>
                      Set scoring rubrics on the <Link href={`/admin/exams/${examId}/answer-key`} className={s.answerKeyLink} target="_blank">Answer Key</Link> page.
                    </span>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className={s.formGroup}>
                <label className={s.label}>Explanation <span className={s.optional}>(optional)</span></label>
                <textarea className={s.textarea} rows={2}
                  placeholder="Shown to students after submission…"
                  value={form.explanation}
                  onChange={e => setForm(prev => ({ ...prev, explanation: e.target.value }))} />
              </div>
            </div>

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

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
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