// components/dashboard/admin/exams/submissions/ViewSubmissionModal.tsx
import { X, Save, Loader2, ThumbsUp, ThumbsDown, MinusCircle, Zap, Pencil } from 'lucide-react'
import type { Submission }    from '@/lib/types/admin/exams/submissions/submission.types'
import type { AnswerDetail, AnswerKeyEntry, AnswerStats } from '@/lib/types/admin/exams/submissions/answer.types'
import type { ExamInfo, PreviewScore } from '@/lib/types/admin/exams/submissions/exam.types'
import type { GradingMode }   from '@/lib/types/admin/exams/submissions/submission.types'
import { STATUS_CONFIG }      from '@/lib/utils/admin/submissions/constants'
import { fmtDate, initials }  from '@/lib/utils/admin/submissions/format'
import { AnswerCard }         from './AnswerCard'
import { EmptyAnswers }       from './SubmissionsUI'
import s from '@/app/(dashboard)/admin/exams/[examId]/submissions/submissions.module.css'

interface ViewSubmissionModalProps {
  target:           Submission
  answers:          AnswerDetail[]
  answersLoading:   boolean
  answerStats:      AnswerStats
  previewScore:     PreviewScore | null
  examInfo:         ExamInfo | null
  gradingMode:      GradingMode
  gradingSubmission: boolean
  answerKey:        AnswerKeyEntry[]
  onClose:          () => void
  onGrade:          () => void
  onCorrectToggle:  (id: string, correct: boolean) => void
  onPointsChange:   (id: string, pts: number)      => void
  onFeedbackChange: (id: string, fb: string)        => void
}

export function ViewSubmissionModal({
  target, answers, answersLoading, answerStats, previewScore, examInfo,
  gradingMode, gradingSubmission, answerKey,
  onClose, onGrade, onCorrectToggle, onPointsChange, onFeedbackChange,
}: ViewSubmissionModalProps) {
  const cfg = STATUS_CONFIG[target.status]
  const canGrade = ['submitted', 'graded', 'reviewed'].includes(target.status)

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={s.modalOverlay} onClick={handleOverlayClick}>
      <div className={s.viewModal}>
        {/* Header */}
        <div className={s.viewModalHeader}>
          <div className={s.viewModalStudentInfo}>
            <div className={s.viewModalAvatar}>{initials(target.student.full_name)}</div>
            <div>
              <h2 className={s.viewModalName}>{target.student.full_name}</h2>
              <p className={s.viewModalMeta}>
                {target.student.email}
                {target.student.student_id && <> · ID: {target.student.student_id}</>}
                {target.submitted_at && <> · {fmtDate(target.submitted_at)}</>}
              </p>
            </div>
          </div>
          <div className={s.viewModalHeaderRight}>
            {previewScore !== null && (
              <div className={`${s.previewScore} ${previewScore.passed ? s.previewScorePass : s.previewScoreFail}`}>
                {previewScore.pct.toFixed(1)}% · {previewScore.passed ? 'PASS' : 'FAIL'}
              </div>
            )}
            <span className={`${s.statusBadge} ${s[`statusBadge_${cfg.color}`]}`}>
              {cfg.label}
            </span>
            <button className={s.modalClose} onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Stats strip */}
        {!answersLoading && answers.length > 0 && (
          <div className={s.answerStatsStrip}>
            <div className={s.answerStat}><ThumbsUp size={12} className={s.statIconCorrect} /><span>{answerStats.correct} correct</span></div>
            <div className={s.answerStat}><ThumbsDown size={12} className={s.statIconWrong} /><span>{answerStats.incorrect} wrong</span></div>
            {answerStats.pending > 0 && (
              <div className={s.answerStat}><MinusCircle size={12} className={s.statIconPending} /><span>{answerStats.pending} pending</span></div>
            )}
            <div className={s.answerStat}><span className={s.answerStatTotal}>{answerStats.total} questions</span></div>
            <div className={s.answerStatMode}>
              {gradingMode === 'auto' ? <Zap size={11} /> : <Pencil size={11} />}
              {gradingMode === 'auto' ? 'Auto mode' : 'Manual mode'}
            </div>
          </div>
        )}

        {/* Body */}
        <div className={s.viewModalBody}>
          {answersLoading ? (
            <div className={s.loadingState}>
              <div className={s.loadingSpinner} />
              <p>Loading answers…</p>
            </div>
          ) : answers.length === 0 ? (
            <EmptyAnswers />
          ) : (
            answers.map((ans, idx) => (
              <AnswerCard
                key={ans.id}
                ans={ans}
                index={idx}
                gradingMode={gradingMode}
                viewStatus={target.status}
                answerKey={answerKey}
                onCorrectToggle={onCorrectToggle}
                onPointsChange={onPointsChange}
                onFeedbackChange={onFeedbackChange}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className={s.viewModalFooter}>
          <div className={s.footerLeft}>
            {previewScore !== null && (
              <span className={s.footerScore}>
                Preview: <strong>{previewScore.earned}</strong>/{examInfo?.total_points} pts
                &nbsp;({previewScore.pct.toFixed(1)}%)&nbsp;·&nbsp;
                <span className={previewScore.passed ? s.passText : s.failText}>
                  {previewScore.passed ? 'PASS' : 'FAIL'}
                </span>
              </span>
            )}
          </div>
          <div className={s.footerRight}>
            <button className={s.btnSecondary} onClick={onClose} disabled={gradingSubmission}>
              Close
            </button>
            {canGrade && (
              <button className={s.btnGrade} onClick={onGrade} disabled={gradingSubmission}>
                {gradingSubmission
                  ? <><Loader2 size={13} className={s.spinner} /> Saving…</>
                  : <><Save size={13} /> Save &amp; Mark Reviewed</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}