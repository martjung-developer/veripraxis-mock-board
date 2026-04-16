// app/(dashboard)/admin/exams/[examId]/submissions/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Layout + wiring only. All state is owned by dedicated hooks.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

// React + Next
import { useCallback }           from 'react'
import { useParams }             from 'next/navigation'
import { AlertCircle, X }        from 'lucide-react'

// Hooks
import { useSubmissions }        from '@/lib/hooks/admin/exams/submissions/useSubmissions'
import { useSubmissionDetails }  from '@/lib/hooks/admin/exams/submissions/useSubmissionDetails'
import { useGrading }            from '@/lib/hooks/admin/exams/submissions/useGrading'
import { useAnswerKey }          from '@/lib/hooks/admin/exams/submissions/useAnswerKey'
import { useBulkGrading, useReleaseResults } from '@/lib/hooks/admin/exams/submissions/useBulkGrading'

// Components
import {
  SubmissionsHeader,
  GradingPanel,
  AnswerKeyPanel,
  StatusPills,
  SubmissionsFilters,
  SubmissionsTable,
  Pagination,
  ViewSubmissionModal,
} from '@/components/dashboard/admin/exams/submissions'

// Types
import type { Submission }       from '@/lib/types/admin/exams/submissions/submission.types'

import s from './submissions.module.css'

// ─────────────────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const { examId } = useParams<{ examId: string }>()

  // ── Hooks ───────────────────────────────────────────────────────────────────
  const subs    = useSubmissions(examId)
  const details = useSubmissionDetails()
  const grading = useGrading(examId)
  const key     = useAnswerKey(examId)
  const bulk    = useBulkGrading()
  const release = useReleaseResults()

  // ── Shared optimistic patcher ───────────────────────────────────────────────
  const patchSubmission = useCallback((id: string, patch: Partial<Submission>) => {
    subs.setSubmissions(prev =>
      prev.map(sub => sub.id === id ? { ...sub, ...patch } : sub),
    )
  }, [subs])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const preview = grading.previewScore(details.answers, subs.examInfo)

  // ── Answer key toggle handler ────────────────────────────────────────────────
  async function handleToggleAnswerKey() {
    if (key.answerKey.length === 0) await key.loadAnswerKey()
    key.setShowAnswerKey(!key.showAnswerKey)
  }

  // ── Mode change handler ──────────────────────────────────────────────────────
  function handleModeChange(mode: 'auto' | 'manual') {
    void grading.handleModeChange(
      mode,
      key.loadAnswerKey,
      key.setShowAnswerKey,
      key.answerKey.length > 0,
    )
  }

  // ── Bulk grade handler ───────────────────────────────────────────────────────
  function handleBulkGrade() {
    if (!subs.examInfo) return
    void bulk.bulkGradeAll(
      subs.submissions,
      subs.examInfo,
      grading.gradingMode,
      key.keyMap,
      patchSubmission,
    )
  }

  // ── Release handler ──────────────────────────────────────────────────────────
  function handleRelease() {
    void release.releaseResults(subs.submissions, patchSubmission)
  }

  // ── Grade single submission handler ─────────────────────────────────────────
  function handleGradeSubmission() {
    if (!details.viewTarget || !subs.examInfo) return
    void grading.gradeSubmission(
      details.viewTarget,
      details.answers,
      key.keyMap,
      subs.examInfo,
      details.setAnswers,
      patch => patchSubmission(details.viewTarget!.id, patch),
      details.closeModal,
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* Header */}
      <SubmissionsHeader
        examId={examId}
        totalCount={subs.submissions.length}
        loading={subs.loading}
        onRefresh={subs.refetch}
      />

      {/* Error banner */}
      {subs.error && (
        <div className={s.errorBanner}>
          <AlertCircle size={14} />
          {subs.error}
          <button
            onClick={subs.clearError}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Grading control panel */}
      <GradingPanel
        gradingMode={grading.gradingMode}
        savingMode={grading.savingMode}
        bulkGrading={bulk.bulkGrading}
        bulkProgress={bulk.bulkProgress}
        releasing={release.releasing}
        gradeableCount={subs.gradeableCount}
        reviewedCount={subs.reviewedCount}
        answerKeyLoading={key.answerKeyLoading}
        showAnswerKey={key.showAnswerKey}
        answerKeyLoaded={key.answerKey.length > 0}
        onModeChange={handleModeChange}
        onBulkGrade={handleBulkGrade}
        onRelease={handleRelease}
        onToggleAnswerKey={handleToggleAnswerKey}
      />

      {/* Manual answer key editor */}
      {grading.gradingMode === 'manual' && key.showAnswerKey && key.answerKey.length > 0 && (
        <AnswerKeyPanel
          answerKey={key.answerKey}
          onReset={key.loadAnswerKey}
          onUpdateEntry={key.updateKeyEntry}
        />
      )}

      {/* Status pills */}
      <StatusPills submissions={subs.submissions} />

      {/* Search + filter bar */}
      <SubmissionsFilters
        search={subs.search}
        statusFilter={subs.statusFilter}
        filteredCount={subs.filtered.length}
        onSearch={v => { subs.setSearch(v); subs.setPage(1) }}
        onStatusFilter={v => { subs.setStatusFilter(v); subs.setPage(1) }}
      />

      {/* Table */}
      <SubmissionsTable
        paginated={subs.paginated}
        loading={subs.loading}
        onView={details.openModal}
      />

      {/* Pagination */}
      <Pagination
        page={subs.page}
        totalPages={subs.totalPages}
        totalItems={subs.filtered.length}
        onPage={subs.setPage}
      />

      {/* View / grade modal */}
      {details.viewTarget && (
        <ViewSubmissionModal
          target={details.viewTarget}
          answers={details.answers}
          answersLoading={details.answersLoading}
          answerStats={details.answerStats}
          previewScore={preview}
          examInfo={subs.examInfo}
          gradingMode={grading.gradingMode}
          gradingSubmission={grading.gradingSubmission}
          answerKey={key.answerKey}
          onClose={details.closeModal}
          onGrade={handleGradeSubmission}
          onCorrectToggle={(id, correct) =>
            grading.handleAnswerCorrectToggle(id, correct, details.answers, details.setAnswers)
          }
          onPointsChange={(id, pts) =>
            grading.handlePointsChange(id, pts, details.answers, details.setAnswers)
          }
          onFeedbackChange={(id, fb) =>
            grading.handleFeedbackChange(id, fb, details.answers, details.setAnswers)
          }
        />
      )}
    </div>
  )
}