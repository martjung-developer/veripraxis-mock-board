// app/(dashboard)/admin/exams/[examId]/answer-key/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Key, ArrowLeft, Save, RotateCcw, AlertCircle, Loader2,
  CheckCircle, ChevronDown, ChevronRight, CheckSquare,
  ToggleLeft, AlignLeft, Hash, List, Search, X, Info,
  FileText, Zap, Pencil, Eye, EyeOff,
} from 'lucide-react'
import s from './answer-key.module.css'
import { createClient } from '@/lib/supabase/client'
import type { QuestionType, QuestionOption } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnswerKeyEntry {
  question_id:    string
  question_text:  string
  question_type:  QuestionType
  points:         number
  order_number:   number | null
  options:        QuestionOption[] | null
  correct_answer: string | null   // stored value
  override:       string | null   // local edit — null = use stored
  explanation:    string | null
  has_rubric:     boolean         // true if explanation contains rubric text
}

interface ExamMeta {
  title:        string
  total_points: number
  exam_type:    string
}

type QuestionRaw = {
  id:             string
  question_text:  string
  question_type:  string
  points:         number
  order_number:   number | null
  options:        unknown
  correct_answer: string | null
  explanation:    string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTO_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']
const MANUAL_TYPES: QuestionType[] = ['short_answer', 'essay', 'matching']

const TYPE_META: Record<QuestionType, { label: string; icon: React.ElementType; color: string }> = {
  multiple_choice: { label: 'Multiple Choice', icon: CheckSquare, color: 'blue'   },
  true_false:      { label: 'True / False',    icon: ToggleLeft,  color: 'green'  },
  short_answer:    { label: 'Short Answer',    icon: AlignLeft,   color: 'amber'  },
  essay:           { label: 'Essay',           icon: FileText,    color: 'violet' },
  matching:        { label: 'Matching',        icon: List,        color: 'teal'   },
  fill_blank:      { label: 'Fill in Blank',   icon: Hash,        color: 'rose'   },
}

const GROUP_ORDER: QuestionType[] = [
  'multiple_choice', 'true_false', 'fill_blank',
  'short_answer', 'matching', 'essay',
]

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({
  message, type, onClose,
}: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`${s.toast} ${type === 'success' ? s.toastSuccess : s.toastError}`}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      <span>{message}</span>
      <button onClick={onClose} className={s.toastClose}><X size={12} /></button>
    </div>
  )
}

// ── Rubric Modal ──────────────────────────────────────────────────────────────

function RubricModal({
  entry,
  onSave,
  onClose,
}: {
  entry: AnswerKeyEntry
  onSave: (questionId: string, rubric: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState(entry.explanation ?? '')
  return (
    <div className={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={s.rubricModal}>
        <div className={s.rubricModalHeader}>
          <div>
            <h3 className={s.rubricModalTitle}>
              <Pencil size={15} /> Rubric / Scoring Guide
            </h3>
            <p className={s.rubricModalSub}>Q{entry.order_number ?? '?'} · {entry.question_text.slice(0, 80)}{entry.question_text.length > 80 ? '…' : ''}</p>
          </div>
          <button className={s.modalClose} onClick={onClose}><X size={15} /></button>
        </div>
        <div className={s.rubricModalBody}>
          <div className={s.rubricInfo}>
            <Info size={12} />
            <span>Rubrics guide faculty when manually grading essay and short-answer questions. They are shown to graders but not to students.</span>
          </div>
          <label className={s.rubricLabel}>Rubric / Expected Response</label>
          <textarea
            className={s.rubricTextarea}
            rows={8}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`e.g.\n• 3 pts — Correctly defines the term AND gives an example\n• 2 pts — Correct definition, no example\n• 1 pt  — Partially correct\n• 0 pts — Incorrect or blank`}
          />
          <p className={s.rubricHint}>This text is also shown to students as an "explanation" after results are released. Remove grading-specific notes before releasing if needed.</p>
        </div>
        <div className={s.rubricModalFooter}>
          <button className={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button className={s.btnPrimary} onClick={() => { onSave(entry.question_id, text); onClose() }}>
            <Save size={13} /> Save Rubric
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnswerKeyPage() {
  const { examId } = useParams<{ examId: string }>()

  const [entries,       setEntries]       = useState<AnswerKeyEntry[]>([])
  const [examMeta,      setExamMeta]      = useState<ExamMeta | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [toast,         setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [search,        setSearch]        = useState('')
  const [expandedTypes, setExpandedTypes] = useState<Set<QuestionType>>(new Set(AUTO_TYPES))
  const [previewMode,   setPreviewMode]   = useState(false)
  const [rubricTarget,  setRubricTarget]  = useState<AnswerKeyEntry | null>(null)
  const [dirty,         setDirty]         = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const [examRes, questionsRes] = await Promise.all([
      supabase
        .from('exams')
        .select('title, total_points, exam_type')
        .eq('id', examId)
        .single(),
      supabase
        .from('questions')
        .select('id, question_text, question_type, points, order_number, options, correct_answer, explanation')
        .eq('exam_id', examId)
        .order('order_number', { ascending: true, nullsFirst: false }),
    ])

    if (examRes.data) {
      setExamMeta({
        title:        examRes.data.title,
        total_points: examRes.data.total_points,
        exam_type:    examRes.data.exam_type ?? 'mock',
      })
    }

    if (questionsRes.error) {
      setError('Could not load questions.')
      setLoading(false)
      return
    }

    const mapped: AnswerKeyEntry[] = ((questionsRes.data ?? []) as unknown as QuestionRaw[]).map(q => ({
      question_id:    q.id,
      question_text:  q.question_text,
      question_type:  q.question_type as QuestionType,
      points:         q.points,
      order_number:   q.order_number,
      options:        (q.options as QuestionOption[]) ?? null,
      correct_answer: q.correct_answer,
      override:       null,
      explanation:    q.explanation,
      has_rubric:     !!(q.explanation?.trim()),
    }))

    setEntries(mapped)
    setLoading(false)
    setDirty(false)
  }, [examId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Update helpers ─────────────────────────────────────────────────────────

  const setOverride = (questionId: string, value: string | null) => {
    setEntries(prev => prev.map(e =>
      e.question_id === questionId ? { ...e, override: value } : e
    ))
    setDirty(true)
  }

  const saveRubric = (questionId: string, rubric: string) => {
    setEntries(prev => prev.map(e =>
      e.question_id === questionId
        ? { ...e, explanation: rubric || null, has_rubric: !!rubric.trim() }
        : e
    ))
    setDirty(true)
  }

  // Effective answer = override if set, else stored correct_answer
  const effectiveAnswer = (e: AnswerKeyEntry) =>
    e.override !== null ? e.override : (e.correct_answer ?? '')

  // ── Save all to DB ─────────────────────────────────────────────────────────

  const handleSaveAll = async () => {
    setSaving(true)
    const supabase = createClient()

    const dirtyEntries = entries.filter(
      e => e.override !== null || e.has_rubric !== !!(e.explanation)
    )

    const allEntries = entries.filter(
      e => e.override !== null // Only persist entries that have overrides
    )

    // For each entry with an override, update questions.correct_answer
    // For each entry with a rubric change, update questions.explanation
    const updates = entries.map(async e => {
      const payload: Record<string, unknown> = {}

      if (e.override !== null) {
        payload.correct_answer = e.override || null
      }

      // Always sync explanation (rubric) changes
      if (e.has_rubric !== !!(e.explanation) || e.explanation !== null) {
        payload.explanation = e.explanation || null
      }

      if (Object.keys(payload).length === 0) return

      return supabase
        .from('questions')
        .update(payload)
        .eq('id', e.question_id)
    })

    const results = await Promise.all(updates)
    const failed  = results.filter(r => r && r.error)

    if (failed.length > 0) {
      setToast({ message: `${failed.length} question(s) failed to save.`, type: 'error' })
    } else {
      // Merge overrides into correct_answer, clear overrides
      setEntries(prev => prev.map(e => ({
        ...e,
        correct_answer: e.override !== null ? (e.override || null) : e.correct_answer,
        override: null,
      })))
      setDirty(false)
      setToast({ message: 'Answer key saved successfully.', type: 'success' })
    }

    setSaving(false)
  }

  // ── Reset overrides ────────────────────────────────────────────────────────

  const handleReset = () => {
    setEntries(prev => prev.map(e => ({ ...e, override: null })))
    setDirty(false)
    setToast({ message: 'Unsaved overrides discarded.', type: 'success' })
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(e =>
      e.question_text.toLowerCase().includes(q) ||
      (effectiveAnswer(e) ?? '').toLowerCase().includes(q)
    )
  }, [entries, search])

  const grouped = useMemo(() => {
    const map: Partial<Record<QuestionType, AnswerKeyEntry[]>> = {}
    for (const e of filtered) {
      ;(map[e.question_type] ??= []).push(e)
    }
    return map
  }, [filtered])

  const totalDefined = entries.filter(e => !!(effectiveAnswer(e))).length
  const totalQuestions = entries.length
  const coveragePercent = totalQuestions > 0
    ? Math.round((totalDefined / totalQuestions) * 100) : 0

  const toggleExpand = (type: QuestionType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  // ── Render answer input per type ───────────────────────────────────────────

  function renderAnswerInput(entry: AnswerKeyEntry) {
    const val = effectiveAnswer(entry)
    const isOverridden = entry.override !== null

    if (previewMode) {
      return (
        <div className={`${s.previewAnswer} ${val ? s.previewAnswerFilled : s.previewAnswerEmpty}`}>
          {val || <span className={s.noAnswer}>No answer set</span>}
        </div>
      )
    }

    switch (entry.question_type) {
      case 'multiple_choice':
        return (
          <div className={s.mcqAnswerGroup}>
            {(entry.options ?? []).map(opt => (
              <button
                key={opt.label}
                type="button"
                className={`${s.mcqOption} ${val === opt.label ? s.mcqOptionSelected : ''}`}
                onClick={() => setOverride(entry.question_id, opt.label)}
                title={opt.text}
              >
                <span className={s.mcqLabel}>{opt.label}</span>
                <span className={s.mcqText}>{opt.text.length > 30 ? opt.text.slice(0, 30) + '…' : opt.text}</span>
              </button>
            ))}
            {isOverridden && (
              <button className={s.clearOverride} onClick={() => setOverride(entry.question_id, null)}>
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>
        )

      case 'true_false':
        return (
          <div className={s.tfAnswerGroup}>
            <button
              type="button"
              className={`${s.tfBtn} ${val === 'true' ? s.tfBtnTrue : ''}`}
              onClick={() => setOverride(entry.question_id, 'true')}
            >True</button>
            <button
              type="button"
              className={`${s.tfBtn} ${val === 'false' ? s.tfBtnFalse : ''}`}
              onClick={() => setOverride(entry.question_id, 'false')}
            >False</button>
            {isOverridden && (
              <button className={s.clearOverride} onClick={() => setOverride(entry.question_id, null)}>
                <RotateCcw size={11} />
              </button>
            )}
          </div>
        )

      case 'fill_blank':
        return (
          <div className={s.textAnswerWrap}>
            <input
              className={`${s.textAnswerInput} ${isOverridden ? s.textAnswerInputOverridden : ''}`}
              value={val}
              placeholder="Enter expected answer…"
              onChange={e => setOverride(entry.question_id, e.target.value)}
            />
            {isOverridden && (
              <button className={s.clearOverride} onClick={() => setOverride(entry.question_id, null)} title="Reset to stored">
                <RotateCcw size={11} />
              </button>
            )}
          </div>
        )

      case 'short_answer':
        return (
          <div className={s.manualAnswerWrap}>
            <div className={s.manualTag}><Pencil size={11} /> Manual Grading</div>
            <textarea
              className={`${s.shortAnswerTextarea} ${isOverridden ? s.textAnswerInputOverridden : ''}`}
              rows={2}
              value={val}
              placeholder="Keyword list or model answer for reference…"
              onChange={e => setOverride(entry.question_id, e.target.value)}
            />
            <button
              className={s.rubricBtn}
              onClick={() => setRubricTarget(entry)}
            >
              <FileText size={11} />
              {entry.has_rubric ? 'Edit Rubric' : 'Add Rubric'}
              {entry.has_rubric && <span className={s.rubricBadge}>✓</span>}
            </button>
          </div>
        )

      case 'essay':
        return (
          <div className={s.manualAnswerWrap}>
            <div className={s.manualTag}><Pencil size={11} /> Manual + AI-Assisted</div>
            <p className={s.essayNote}>Essay grading uses rubrics and optional AI scoring. Set a rubric to guide graders.</p>
            <button
              className={`${s.rubricBtn} ${entry.has_rubric ? s.rubricBtnFilled : ''}`}
              onClick={() => setRubricTarget(entry)}
            >
              <FileText size={11} />
              {entry.has_rubric ? 'Edit Rubric' : 'Add Rubric'}
              {entry.has_rubric && <span className={s.rubricBadge}>✓</span>}
            </button>
            {/* FUTURE: AI scoring config panel */}
            <div className={s.aiFuturePlaceholder}>
              🤖 AI keyword scoring — coming soon
            </div>
          </div>
        )

      case 'matching':
        return (
          <div className={s.manualAnswerWrap}>
            <div className={s.manualTag}><Pencil size={11} /> Manual Grading</div>
            <textarea
              className={`${s.shortAnswerTextarea} ${isOverridden ? s.textAnswerInputOverridden : ''}`}
              rows={3}
              value={val}
              placeholder={`JSON pairs, e.g.\n[{"left":"Term","right":"Definition"}]`}
              onChange={e => setOverride(entry.question_id, e.target.value)}
            />
          </div>
        )

      default:
        return null
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={s.page}>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}>
          <ArrowLeft size={14} /> Back to Exam
        </Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><Key size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Answer Key</h1>
              <p className={s.headingSub}>
                {examMeta?.title ?? 'Loading…'} · {totalDefined}/{totalQuestions} answers defined
              </p>
            </div>
          </div>
          <div className={s.headerActions}>
            <button
              className={`${s.previewToggle} ${previewMode ? s.previewToggleActive : ''}`}
              onClick={() => setPreviewMode(v => !v)}
            >
              {previewMode ? <EyeOff size={13} /> : <Eye size={13} />}
              {previewMode ? 'Edit Mode' : 'Preview'}
            </button>
            {dirty && (
              <button className={s.btnSecondary} onClick={handleReset} disabled={saving}>
                <RotateCcw size={13} /> Discard
              </button>
            )}
            <button
              className={s.btnPrimary}
              onClick={handleSaveAll}
              disabled={saving || !dirty}
            >
              {saving
                ? <><Loader2 size={13} className={s.spinner} /> Saving…</>
                : <><Save size={13} /> Save Answer Key</>}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className={s.errorBanner}><AlertCircle size={14} />{error}</div>
      )}

      {/* Coverage bar */}
      {!loading && totalQuestions > 0 && (
        <div className={s.coverageBar}>
          <div className={s.coverageBarLeft}>
            <span className={s.coverageLabel}>Answer Coverage</span>
            <span className={s.coverageValue}>{coveragePercent}%</span>
            <span className={s.coverageDetail}>{totalDefined} of {totalQuestions} questions</span>
          </div>
          <div className={s.coverageTrack}>
            <div
              className={`${s.coverageFill} ${coveragePercent === 100 ? s.coverageFillComplete : ''}`}
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          {coveragePercent < 100 && (
            <div className={s.coverageWarning}>
              <AlertCircle size={12} />
              {totalQuestions - totalDefined} answer{totalQuestions - totalDefined !== 1 ? 's' : ''} missing — auto-grading will skip these questions
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className={s.legend}>
        <div className={s.legendItem}>
          <span className={s.legendDotAuto} />
          <span>Auto-graded (MCQ, T/F, Fill Blank)</span>
          <Zap size={11} className={s.legendIcon} />
        </div>
        <div className={s.legendItem}>
          <span className={s.legendDotManual} />
          <span>Manual / AI-assisted (Essay, Short Answer, Matching)</span>
          <Pencil size={11} className={s.legendIcon} />
        </div>
        {dirty && (
          <div className={s.legendDirty}>
            <span className={s.legendDotDirty} />
            Unsaved changes
          </div>
        )}
      </div>

      {/* Search */}
      <div className={s.searchBar}>
        <Search size={14} className={s.searchIcon} />
        <input
          className={s.searchInput}
          placeholder="Search questions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={s.searchClear} onClick={() => setSearch('')}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Grouped sections */}
      {loading ? (
        <div className={s.loadingState}>
          <Loader2 size={22} className={s.spinner} />
          <p>Loading questions…</p>
        </div>
      ) : totalQuestions === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}><Key size={24} color="var(--text-muted)" /></div>
          <p className={s.emptyTitle}>No questions found</p>
          <p className={s.emptySub}>
            Add questions to this exam first from the{' '}
            <Link href={`/admin/exams/${examId}/questions`} className={s.emptyLink}>Questions</Link> page.
          </p>
        </div>
      ) : (
        <div className={s.groups}>
          {GROUP_ORDER.map(type => {
            const typeEntries = grouped[type]
            if (!typeEntries?.length) return null

            const meta       = TYPE_META[type]
            const Icon       = meta.icon
            const isExpanded = expandedTypes.has(type)
            const isAuto     = AUTO_TYPES.includes(type)
            const defined    = typeEntries.filter(e => !!(effectiveAnswer(e))).length

            return (
              <div key={type} className={`${s.group} ${s[`group_${meta.color}`]}`}>
                {/* Group header */}
                <button
                  className={s.groupHeader}
                  onClick={() => toggleExpand(type)}
                >
                  <div className={s.groupHeaderLeft}>
                    <div className={`${s.groupIcon} ${s[`groupIcon_${meta.color}`]}`}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <span className={s.groupTitle}>{meta.label}</span>
                      <span className={s.groupCount}>{typeEntries.length} question{typeEntries.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className={s.groupHeaderRight}>
                    <div className={`${s.groupMode} ${isAuto ? s.groupModeAuto : s.groupModeManual}`}>
                      {isAuto ? <><Zap size={10} /> Auto</> : <><Pencil size={10} /> Manual</>}
                    </div>
                    <div className={s.groupProgress}>
                      <span className={defined === typeEntries.length ? s.groupProgressComplete : s.groupProgressPartial}>
                        {defined}/{typeEntries.length}
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </div>
                </button>

                {/* Questions in this group */}
                {isExpanded && (
                  <div className={s.groupBody}>
                    {typeEntries.map((entry, idx) => {
                      const hasOverride  = entry.override !== null
                      const isAnswered   = !!(effectiveAnswer(entry))

                      return (
                        <div
                          key={entry.question_id}
                          className={`${s.questionRow} ${isAnswered ? s.questionRowAnswered : s.questionRowEmpty} ${hasOverride ? s.questionRowOverridden : ''}`}
                        >
                          {/* Left: question info */}
                          <div className={s.questionInfo}>
                            <div className={s.questionMeta}>
                              <span className={s.questionNum}>Q{entry.order_number ?? idx + 1}</span>
                              <span className={s.questionPoints}>{entry.points} pt{entry.points !== 1 ? 's' : ''}</span>
                              {hasOverride && (
                                <span className={s.overrideBadge}>
                                  <Pencil size={9} /> Overridden
                                </span>
                              )}
                              {isAnswered && !hasOverride && (
                                <span className={s.storedBadge}>
                                  <CheckCircle size={9} /> Stored
                                </span>
                              )}
                            </div>
                            <p className={s.questionText}>{entry.question_text}</p>
                          </div>

                          {/* Right: answer input */}
                          <div className={s.answerInputArea}>
                            {renderAnswerInput(entry)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky save bar when dirty */}
      {dirty && !loading && (
        <div className={s.stickyBar}>
          <span className={s.stickyBarMsg}>
            <AlertCircle size={13} /> You have unsaved changes
          </span>
          <div className={s.stickyBarActions}>
            <button className={s.btnSecondarySmall} onClick={handleReset} disabled={saving}>
              Discard
            </button>
            <button className={s.btnPrimarySmall} onClick={handleSaveAll} disabled={saving}>
              {saving ? <><Loader2 size={12} className={s.spinner} /> Saving…</> : <><Save size={12} /> Save Now</>}
            </button>
          </div>
        </div>
      )}

      {/* Rubric modal */}
      {rubricTarget && (
        <RubricModal
          entry={rubricTarget}
          onSave={saveRubric}
          onClose={() => setRubricTarget(null)}
        />
      )}
    </div>
  )
}