// app/(dashboard)/admin/exams/[examId]/page.tsx
// Thin orchestration layer — auth guard + layout only.
// All data logic lives in useExamDetail() and useEditExam().
// No direct Supabase calls, no inline business logic.

'use client'

// React + Next
import React    from 'react'
import { useParams } from 'next/navigation'

// Hooks
import { useExamDetail } from '@/lib/hooks/admin/exams/detail/useExamDetail'
import { useEditExam }   from '@/lib/hooks/admin/exams/detail/useEditExam'

// Components
import Toast               from '@/components/dashboard/admin/exams/detail/Toast'
import ExamHeader          from '@/components/dashboard/admin/exams/detail/ExamHeader'
import ExamStats           from '@/components/dashboard/admin/exams/detail/ExamStats'
import ExamDescriptionCard from '@/components/dashboard/admin/exams/detail/ExamDescriptionCard'
import ExamDetailsCard     from '@/components/dashboard/admin/exams/detail/ExamDetailsCard'
import ExamSectionsNav     from '@/components/dashboard/admin/exams/detail/ExamSectionsNav'
import EditExamModal       from '@/components/dashboard/admin/exams/detail/EditExamModal'

import s from './detail.module.css'

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>()

  // ── Data layer ──────────────────────────────────────────────────────────────
  const {
    exam,
    categories,
    programs,
    loading,
    error,
    setExam,
  } = useExamDetail(examId)

  // ── Edit layer ──────────────────────────────────────────────────────────────
  const {
    showEdit,
    editForm,
    editErrors,
    editSaving,
    toast,
    openEdit,
    closeEdit,
    setEditField,
    saveEdit,
    clearToast,
  } = useEditExam({ exam, categories, programs, setExam })

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.skeleton} style={{ width: 200, height: 18, marginBottom: 8 }} />
        <div className={s.skeleton} style={{ width: '60%', height: 28, marginBottom: 32 }} />
        <div className={s.skeletonGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${s.skeleton} ${s.skeletonCard}`} />
          ))}
        </div>
      </div>
    )
  }

  // ── Error / not found ───────────────────────────────────────────────────────
  if (error || !exam) {
    return (
      <div className={s.page}>
        <p>{error ?? 'Exam not found.'}</p>
      </div>
    )
  }

  return (
    <div className={s.page}>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      )}

      {/* ── Header ── */}
      <ExamHeader exam={exam} onEdit={openEdit} />

      {/* ── Stats ── */}
      <ExamStats exam={exam} />

      {/* ── Main Layout ── */}
      <div className={s.layout}>
        <div className={s.mainCol}>
          <ExamDescriptionCard description={exam.description} />
          <ExamDetailsCard     exam={exam} />
        </div>
        <div className={s.sideCol}>
          <ExamSectionsNav examId={examId} exam={exam} />
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {showEdit && editForm && (
        <EditExamModal
          editForm={editForm}
          editErrors={editErrors}
          editSaving={editSaving}
          categories={categories}
          programs={programs}
          setEditField={setEditField}
          onSave={saveEdit}
          onClose={closeEdit}
        />
      )}

    </div>
  )
}