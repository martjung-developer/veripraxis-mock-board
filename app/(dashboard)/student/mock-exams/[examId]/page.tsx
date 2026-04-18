// app/(exam)/student/mock-exams/[examId]/page.tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { useMockExamSession } from '@/lib/hooks/student/mock-exams/useMockExamSession'
import { ExamTopBar }          from '@/components/dashboard/student/mock-exams/ExamTopBar'
import { ExamSidebar }         from '@/components/dashboard/student/mock-exams/ExamSidebar'
import { QuestionCard }        from '@/components/dashboard/student/mock-exams/QuestionCard'
import { ExamNavigation }      from '@/components/dashboard/student/mock-exams/ExamNavigation'
import { SubmitModal }         from '@/components/dashboard/student/mock-exams/SubmitModal'
import { ResumeModal }         from '@/components/dashboard/student/mock-exams/ResumeModal'
import { AttemptHistoryModal } from '@/components/dashboard/student/mock-exams/AttemptHistoryModal'
import { SubmittedScreen }     from '@/components/dashboard/student/mock-exams/SubmittedScreen'
import { resolveQState }       from '@/lib/utils/student/mock-exams/mock-exams'
import { MAX_TAB_VIOLATIONS }  from '@/lib/constants/student/mock-exams/mock-exams'
import styles from './mock.module.css'

export default function MockExamPage() {
  const router  = useRouter()
  const params  = useParams()
  const examId  = params.examId as string

  const session = useMockExamSession(examId)

  const {
    loading, error,
    exam, questions,
    current, setCurrent,
    answers, qStates,
    handleAnswer, handleSkip, handleFlag, jumpToUnanswered,
    timeLeft, timerWarning, timerCritical,
    showConfirm, setShowConfirm,
    showResume, confirmResume, confirmRestart,
    showAttemptHistory, setShowAttemptHistory, attempts,
    submitted, submitting, doSubmit,
    saveStatus, tabViolations,
    answeredCount, skippedCount, unansweredCount,
  } = session

  // ── Guards ──────────────────────────────────────────────────────────────
  if (loading) return <div className={styles.center}>Loading exam…</div>

  if (error) {
    return (
      <div className={styles.center}>
        <XCircle size={28} color="#dc2626" />
        <span>{error}</span>
        <button className={styles.btnCenter} onClick={() => router.back()}>Go back</button>
      </div>
    )
  }

  if (submitted) {
    return (
      <SubmittedScreen
        examTitle={exam?.title ?? 'Mock Exam'}
        onBack={() => router.push('/student/mock-exams')}
      />
    )
  }

  const q = questions[current]
  if (!q || !exam) return null

  const isFlagged = qStates[q.id] === 'flagged' || qStates[q.id] === 'flagged-answered'

  // ── Anti-cheat banner (shown after first violation but before auto-submit) ──
  const showViolationBanner = tabViolations > 0 && tabViolations < MAX_TAB_VIOLATIONS

  return (
    <div className={styles.shell}>

      {/* Anti-cheat warning banner */}
      {showViolationBanner && (
        <div className={styles.violationBanner}>
          ⚠ Tab switching detected ({tabViolations}/{MAX_TAB_VIOLATIONS}). Your exam will be
          auto-submitted after {MAX_TAB_VIOLATIONS} violations.
        </div>
      )}

      <ExamTopBar
        title={exam.title}
        current={current}
        total={questions.length}
        timeLeft={timeLeft}
        timerWarning={timerWarning}
        timerCritical={timerCritical}
        submitting={submitting}
        saveStatus={saveStatus}
        tabViolations={tabViolations}
        onSubmit={() => setShowConfirm(true)}
        onViewHistory={() => setShowAttemptHistory(true)}
      />

      <div className={styles.main}>
        <ExamSidebar
          questions={questions}
          current={current}
          answers={answers}
          qStates={qStates}
          answeredCount={answeredCount}
          skippedCount={skippedCount}
          unansweredCount={unansweredCount}
          onSelect={setCurrent}
          onJumpUnanswered={jumpToUnanswered}
        />

        <div className={styles.content}>
          <QuestionCard
            question={q}
            index={current}
            total={questions.length}
            answer={answers[q.id]}
            isFlagged={isFlagged}
            onAnswer={handleAnswer}
            onFlag={handleFlag}
          />
        </div>
      </div>

      <ExamNavigation
        current={current}
        total={questions.length}
        submitting={submitting}
        onPrev={() => setCurrent(Math.max(0, current - 1))}
        onNext={() => setCurrent(Math.min(questions.length - 1, current + 1))}
        onSkip={handleSkip}
        onSubmit={() => setShowConfirm(true)}
      />

      {/* Modals */}
      {showResume && (
        <ResumeModal
          onResume={confirmResume}
          onRestart={confirmRestart}
        />
      )}

      {showConfirm && (
        <SubmitModal
          answeredCount={answeredCount}
          skippedCount={skippedCount}
          unansweredCount={unansweredCount}
          submitting={submitting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => { setShowConfirm(false); void doSubmit() }}
        />
      )}

      {showAttemptHistory && (
        <AttemptHistoryModal
          attempts={attempts}
          onClose={() => setShowAttemptHistory(false)}
        />
      )}
    </div>
  )
}