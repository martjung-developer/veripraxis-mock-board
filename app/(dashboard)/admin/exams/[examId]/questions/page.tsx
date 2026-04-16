// app/(dashboard)/admin/exams/[examId]/questions/page.tsx
//
// CLEAN ORCHESTRATOR — this file's only jobs are:
//   1. Call useQuestions() and useQuestionForm()
//   2. Derive filtered/grouped data via useMemo
//   3. Wire handler callbacks
//   4. Render layout + pass props to pure components
//
// NO Supabase, NO business logic, NO validation, NO raw state.

'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, HelpCircle, Key, Plus } from 'lucide-react'

import { useQuestions }     from '@/lib/hooks/admin/exams/questions/useQuestions'
import { useQuestionForm }  from '@/lib/hooks/admin/exams/questions/useQuestionForm'
import {
  filterQuestions,
  groupQuestions,
  calcTotalPoints,
  buildInitialExpandedSet,
} from '@/lib/utils/admin/questions/helpers'
import {
  GROUP_ORDER,
  type Question,
  type QuestionType,
  type TypeFilter,
} from '@/lib/types/admin/exams/questions/questions.types'

import {
  DeleteModal,
  QuestionList,
  QuestionModal,
  StatsStrip,
  Toast,
  Toolbar,
} from '@/components/dashboard/admin/exams/questions'

import s from './questions.module.css'
import { JSX } from 'react/jsx-dev-runtime'

export default function QuestionsPage(): JSX.Element {
  const { examId } = useParams<{ examId: string }>()

  // ── Data layer ─────────────────────────────────────────────────────────────
  const {
    questions,
    loading,
    error,
    toast,
    dismissToast,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  } = useQuestions(examId)

  // ── Form layer ─────────────────────────────────────────────────────────────
  const {
    form,
    formError,
    modalMode,
    openCreate,
    openEdit,
    closeModal,
    setQuestionText,
    setPoints,
    setExplanation,
    setCorrectAnswer,
    handleTypeChange,
    handleOptionText,
    addOption,
    removeOption,
    validateAndGetPayload,
  } = useQuestionForm()

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState('')
  const [typeFilter,    setTypeFilter]    = useState<TypeFilter>('all')
  const [expandedTypes, setExpandedTypes] = useState<Set<QuestionType>>(buildInitialExpandedSet)
  const [deleteTarget,  setDeleteTarget]  = useState<Question | null>(null)
  const [deleting,      setDeleting]      = useState(false)
  const [saving,        setSaving]        = useState(false)

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => filterQuestions(questions, search, typeFilter),
    [questions, search, typeFilter],
  )

  const grouped = useMemo(
    () => groupQuestions(filtered),
    [filtered],
  )

  const totalPoints = useMemo(
    () => calcTotalPoints(questions),
    [questions],
  )

  // ── Expand/collapse ────────────────────────────────────────────────────────

  const toggleExpand = useCallback((type: QuestionType) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else                next.add(type)
      return next
    })
  }, [])

  const expandAll   = useCallback(() => setExpandedTypes(new Set(GROUP_ORDER)), [])
  const collapseAll = useCallback(() => setExpandedTypes(new Set()),             [])

  // ── Modal submit ───────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const payload = validateAndGetPayload()
    if (!payload) return

    setSaving(true)

    if (modalMode.open && modalMode.mode === 'edit') {
      const ok = await updateQuestion({ id: modalMode.target.id, ...payload })
      if (ok) closeModal()
    } else {
      const ok = await createQuestion(payload)
      if (ok) closeModal()
    }

    setSaving(false)
  }, [validateAndGetPayload, modalMode, updateQuestion, createQuestion, closeModal])

  // ── Delete confirm ─────────────────────────────────────────────────────────

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteQuestion(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
  }, [deleteTarget, deleteQuestion])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={s.page}>

      {/* Toast */}
      {toast && <Toast toast={toast} onClose={dismissToast} />}

      {/* ── Page Header ── */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}>
          <ArrowLeft size={14} /> Back to Exam
        </Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><HelpCircle size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Questions</h1>
              <p className={s.headingSub}>
                {questions.length} question{questions.length !== 1 ? 's' : ''} · {totalPoints} total pts
              </p>
            </div>
          </div>
          <div className={s.headerActions}>
            <Link href={`/admin/exams/${examId}/answer-key`} className={s.btnOutline}>
              <Key size={13} /> Answer Key
            </Link>
            <button className={s.btnPrimary} onClick={() => openCreate()}>
              <Plus size={14} /> Add Question
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className={s.errorBanner}>
          <HelpCircle size={14} />{error}
        </div>
      )}

      {/* Stats strip */}
      {!loading && <StatsStrip questions={questions} />}

      {/* Toolbar */}
      <Toolbar
        search={search}
        typeFilter={typeFilter}
        onSearchChange={setSearch}
        onTypeFilterChange={setTypeFilter}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {/* Question groups */}
      <QuestionList
        questions={questions}
        grouped={grouped}
        loading={loading}
        expandedTypes={expandedTypes}
        onToggleExpand={toggleExpand}
        onAddInGroup={(type) => openCreate(type)}
        onAddFirst={() => openCreate()}
        onEdit={(q) => openEdit(q)}
        onDelete={(q) => setDeleteTarget(q)}
      />

      {/* Create / Edit Modal */}
      {modalMode.open && (
        <QuestionModal
          examId={examId}
          isEditing={modalMode.mode === 'edit'}
          form={form}
          formError={formError}
          saving={saving}
          onClose={closeModal}
          onSave={handleSave}
          onTypeChange={handleTypeChange}
          onTextChange={setQuestionText}
          onPointsChange={setPoints}
          onExplChange={setExplanation}
          onAnswerChange={setCorrectAnswer}
          onOptionText={handleOptionText}
          onAddOption={addOption}
          onRemoveOption={removeOption}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          deleting={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

    </div>
  )
}