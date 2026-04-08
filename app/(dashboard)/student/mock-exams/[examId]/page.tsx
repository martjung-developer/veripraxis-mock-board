// student/mock-exams/[examId]/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Flag, SkipForward,
  Clock, AlertTriangle, Send, XCircle, CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { QuestionType, QuestionOption } from '@/lib/types/database'
import styles from './mock.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Question {
  id:             string
  question_text:  string
  question_type:  QuestionType
  points:         number
  options:        QuestionOption[] | null
  correct_answer: string | null
  explanation:    string | null
  order_number:   number | null
}

interface ExamMeta {
  id:               string
  title:            string
  duration_minutes: number
  passing_score:    number
  total_points:     number
}

type QState = 'unanswered' | 'answered' | 'skipped' | 'flagged' | 'flagged-answered'

interface AnswerMap { [qId: string]: string }
interface StateMap  { [qId: string]: QState }

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseOptions(raw: unknown): QuestionOption[] | null {
  if (!Array.isArray(raw)) return null
  return raw as QuestionOption[]
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function resolveQState(qId: string, answers: AnswerMap, states: StateMap): QState {
  if (states[qId]) return states[qId]
  return answers[qId] ? 'answered' : 'unanswered'
}

// ── Submitted Confirmation Screen ─────────────────────────────────────────────
// ✅ NO score, NO percentage, NO pass/fail — just a confirmation message.

function SubmittedScreen({ examTitle, onBack }: { examTitle: string; onBack: () => void }) {
  return (
    <div className={styles.results}>
      <div className={styles.resultsCard}>
        <div
          className={styles.resultsIconWrap}
          style={{ background: '#dbeafe', border: '2px solid #93c5fd' }}
        >
          <CheckCircle2 size={28} color="#1d4ed8" />
        </div>
        <h1 className={styles.resultsTitle}>Exam Submitted!</h1>
        <p className={styles.resultsSub}>
          Your answers for <strong>{examTitle}</strong> have been recorded.
        </p>
        <div
          style={{
            background:   '#eff6ff',
            border:       '1.5px solid #bfdbfe',
            borderRadius: 10,
            padding:      '0.9rem 1.1rem',
            margin:       '1rem 0',
            fontSize:     '0.84rem',
            color:        '#1e40af',
            lineHeight:   1.6,
            textAlign:    'left',
          }}
        >
          <strong>What happens next?</strong>
          <br />
          Your submission is now under faculty review. Results will be released
          once your exam has been graded. You will be notified when your score is available.
        </div>
        <button className={styles.btnBack} onClick={onBack}>
          Back to Exams
        </button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MockExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { examId } = use(params)

  // ── Data state ──────────────────────────────────────────────────────────────
  const [exam,         setExam]         = useState<ExamMeta | null>(null)
  const [questions,    setQuestions]    = useState<Question[]>([])
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [submitting,   setSubmitting]   = useState(false)

  // ── Exam interaction state ───────────────────────────────────────────────────
  const [current,     setCurrent]     = useState(0)
  const [answers,     setAnswers]     = useState<AnswerMap>({})
  const [qStates,     setQStates]     = useState<StateMap>({})
  const [timeLeft,    setTimeLeft]    = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  // ✅ submitted = true shows the waiting screen, NOT a score screen
  const [submitted,   setSubmitted]   = useState(false)

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef<string | null>(null)

  // ── Fetch & resume ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated.'); setLoading(false); return }

      const { data: examRow, error: eErr } = await supabase
        .from('exams')
        .select('id, title, duration_minutes, passing_score, total_points')
        .eq('id', examId)
        .eq('is_published', true)
        .single()

      if (eErr || !examRow) { setError('Exam not found or unavailable.'); setLoading(false); return }

      const { data: qRows, error: qErr } = await supabase
        .from('questions')
        .select('id, question_text, question_type, points, options, correct_answer, explanation, order_number')
        .eq('exam_id', examId)
        .order('order_number', { ascending: true, nullsFirst: false })

      if (qErr || !qRows?.length) { setError('No questions found for this exam.'); setLoading(false); return }

      // Resume: check for in-progress submission
      const { data: inProg } = await supabase
        .from('submissions')
        .select('id, started_at')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as { data: { id: string; started_at: string } | null }

      let subId: string

      if (inProg) {
        subId = inProg.id
        startedAt.current = inProg.started_at

        const { data: savedAns } = await supabase
          .from('answers')
          .select('question_id, answer_text')
          .eq('submission_id', inProg.id) as { data: { question_id: string; answer_text: string }[] | null }

        if (savedAns && !cancelled) {
          const restoredAnswers: AnswerMap = {}
          const restoredStates:  StateMap  = {}
          for (const a of savedAns) {
            if (a.question_id && a.answer_text) {
              restoredAnswers[a.question_id] = a.answer_text
              restoredStates[a.question_id]  = 'answered'
            }
          }
          setAnswers(restoredAnswers)
          setQStates(restoredStates)
        }
      } else {
        const now = new Date().toISOString()
        startedAt.current = now
        const { data: newSub, error: sErr } = await supabase
          .from('submissions')
          .insert({ exam_id: examId, student_id: user.id, started_at: now, status: 'in_progress' })
          .select('id')
          .single() as { data: { id: string } | null }

        if (sErr || !newSub) { setError('Could not start exam session.'); setLoading(false); return }
        subId = newSub.id
      }

      if (!cancelled) {
        const qs: Question[] = (qRows ?? []).map((q: Record<string, unknown>) => ({
          ...q,
          question_type: q.question_type as QuestionType,
          options: parseOptions(q.options),
        }))

        setExam(examRow as ExamMeta)
        setQuestions(qs)
        setSubmissionId(subId)

        const total   = (examRow as ExamMeta).duration_minutes * 60
        const elapsed = startedAt.current
          ? Math.floor((Date.now() - new Date(startedAt.current).getTime()) / 1000)
          : 0
        setTimeLeft(Math.max(0, total - elapsed))

        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [examId, supabase])

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!exam || submitted || loading || timeLeft <= 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          void doSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, submitted, loading])

  // ── Auto-save answer to DB ───────────────────────────────────────────────────
  const saveAnswer = useCallback(async (qId: string, text: string) => {
    if (!submissionId) return
    await supabase
      .from('answers')
      .upsert(
        { submission_id: submissionId, question_id: qId, answer_text: text } as Record<string, unknown>,
        { onConflict: 'submission_id,question_id' }
      )
  }, [submissionId, supabase])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAnswer = useCallback((qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
    setQStates((prev) => {
      const cur     = prev[qId]
      const flagged = cur === 'flagged' || cur === 'flagged-answered'
      return { ...prev, [qId]: flagged ? 'flagged-answered' : 'answered' }
    })
    void saveAnswer(qId, value)
  }, [saveAnswer])

  const handleSkip = useCallback(() => {
    const q = questions[current]
    if (!q) return
    setQStates((prev) => {
      const cur = prev[q.id]
      if (cur === 'answered' || cur === 'flagged-answered') return prev
      return { ...prev, [q.id]: 'skipped' }
    })
    if (current < questions.length - 1) setCurrent((c) => c + 1)
  }, [current, questions])

  const handleFlag = useCallback(() => {
    const q = questions[current]
    if (!q) return
    setQStates((prev) => {
      const cur       = prev[q.id]
      const hasAnswer = !!answers[q.id]
      if (cur === 'flagged')          return { ...prev, [q.id]: hasAnswer ? 'answered' : 'unanswered' }
      if (cur === 'flagged-answered') return { ...prev, [q.id]: 'answered' }
      if (cur === 'answered')         return { ...prev, [q.id]: 'flagged-answered' }
      return { ...prev, [q.id]: 'flagged' }
    })
  }, [current, questions, answers])

  // ── Submit ────────────────────────────────────────────────────────────────────
  // ✅ MOCK EXAM RULE:
  //    - Save all answers as-is (no grading, no is_correct, no points_earned)
  //    - Set submission status = 'submitted' ONLY
  //    - Do NOT compute score / percentage / passed
  //    - Show confirmation screen, NOT results
  const doSubmit = useCallback(async () => {
    if (!submissionId || !exam || submitting) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    const timeSpent = startedAt.current
      ? Math.floor((Date.now() - new Date(startedAt.current).getTime()) / 1000)
      : null

    // Save answers — no grading logic whatsoever
    const answerRows: {
      submission_id: string
      question_id:   string
      answer_text:   string | null
      // is_correct and points_earned intentionally omitted — set by faculty grading
    }[] = questions.map((q) => ({
      submission_id: submissionId,
      question_id:   q.id,
      answer_text:   answers[q.id] ?? null,
    }))

    await supabase
      .from('answers')
      .upsert(answerRows as Record<string, unknown>[], { onConflict: 'submission_id,question_id' })

    // ✅ status = 'submitted' — awaiting faculty review
    // score / percentage / passed intentionally left null
    await supabase
      .from('submissions')
      .update({
        submitted_at:       new Date().toISOString(),
        time_spent_seconds: timeSpent,
        status:             'submitted',
       
      } as Record<string, unknown>)
      .eq('id', submissionId)

    setSubmitted(true)
    setSubmitting(false)
  }, [submissionId, exam, answers, questions, supabase, submitting])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const q             = questions[current]
  const answeredCount = questions.filter(
    (item) => answers[item.id] || ['answered', 'flagged-answered'].includes(qStates[item.id] ?? '')
  ).length
  const skippedCount    = Object.values(qStates).filter((s) => s === 'skipped').length
  const unansweredCount = questions.length - answeredCount - skippedCount
  const isFlagged       = q ? (qStates[q.id] === 'flagged' || qStates[q.id] === 'flagged-answered') : false

  const timerCls =
    timeLeft <= 60  ? styles.timerCrit :
    timeLeft <= 300 ? styles.timerWarn : ''

  // ── Loading / Error ──────────────────────────────────────────────────────────
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

  // ── Submission Confirmed — NO scores shown ───────────────────────────────────
  if (submitted) {
    return (
      <SubmittedScreen
        examTitle={exam?.title ?? 'Mock Exam'}
        onBack={() => router.push('/student/mock-exams')}
      />
    )
  }

  if (!q || !exam) return null

  // ── Exam UI ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.shell}>

      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <span className={styles.examTitle}>{exam.title}</span>
          <span className={styles.mockBadge}>Mock Exam</span>
        </div>

        <div className={styles.topCenter}>
          <span className={styles.progressLabel}>{current + 1} / {questions.length}</span>
          <span className={`${styles.timer} ${timerCls}`}>
            <Clock size={13} /> {formatTime(timeLeft)}
          </span>
        </div>

        <div className={styles.topRight}>
          <button
            className={styles.btnTopSubmit}
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
          >
            <Send size={13} /> Submit
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <div className={styles.sidebarHeading}>Questions</div>
            <div className={styles.legend}>
              {[
                { label: 'Answered', color: '#10b981' },
                { label: 'Skipped',  color: '#f59e0b' },
                { label: 'Flagged',  color: '#8b5cf6' },
                { label: 'Current',  color: '#0d2540' },
              ].map((l) => (
                <div key={l.label} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.palette}>
            {questions.map((pq, idx) => {
              const state = resolveQState(pq.id, answers, qStates)
              const isCur = idx === current
              return (
                <button
                  key={pq.id}
                  className={`${styles.palBtn} ${
                    isCur                           ? styles.palCurrent         :
                    state === 'answered'             ? styles.palAnswered        :
                    state === 'skipped'              ? styles.palSkipped         :
                    state === 'flagged'              ? styles.palFlagged         :
                    state === 'flagged-answered'     ? styles.palFlaggedAnswered :
                    ''
                  }`}
                  onClick={() => setCurrent(idx)}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                  {(state === 'flagged' || state === 'flagged-answered') && !isCur && (
                    <span className={styles.flagPip} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Question ── */}
        <div className={styles.content}>
          <div className={styles.questionCard} key={q.id}>

            <div className={styles.questionMeta}>
              <span className={styles.qNumber}>Question {current + 1} of {questions.length}</span>
              <div className={styles.qBadges}>
                <span className={styles.ptsBadge}>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                <span className={styles.typeBadge}>{q.question_type.replace(/_/g, ' ')}</span>
                <button
                  className={`${styles.flagToggle} ${isFlagged ? styles.flagToggleActive : ''}`}
                  onClick={handleFlag}
                >
                  <Flag size={12} /> {isFlagged ? 'Flagged' : 'Flag'}
                </button>
              </div>
            </div>

            <p className={styles.questionText}>{q.question_text}</p>

            {/* MCQ */}
            {q.question_type === 'multiple_choice' && q.options && (
              <div className={styles.optionList}>
                {q.options.map((opt) => (
                  <button
                    key={opt.label}
                    className={`${styles.optionBtn} ${answers[q.id] === opt.label ? styles.optionSelected : ''}`}
                    onClick={() => handleAnswer(q.id, opt.label)}
                  >
                    <span className={styles.optLabel}>{opt.label}</span>
                    <span className={styles.optText}>{opt.text}</span>
                  </button>
                ))}
              </div>
            )}

            {/* True/False */}
            {q.question_type === 'true_false' && (
              <div className={styles.tfRow}>
                {(['true', 'false'] as const).map((v) => (
                  <button
                    key={v}
                    className={`${styles.tfBtn} ${answers[q.id] === v ? styles.tfSelected : ''}`}
                    onClick={() => handleAnswer(q.id, v)}
                  >
                    {v === 'true' ? 'True' : 'False'}
                  </button>
                ))}
              </div>
            )}

            {/* Essay / Short Answer */}
            {(q.question_type === 'essay' || q.question_type === 'short_answer') && (
              <textarea
                className={styles.textArea}
                placeholder={q.question_type === 'essay' ? 'Write your answer here…' : 'Short answer…'}
                value={answers[q.id] ?? ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
              />
            )}

            {/* Fill in the Blank */}
            {q.question_type === 'fill_blank' && (
              <input
                type="text"
                className={styles.fillInput}
                placeholder="Your answer…"
                value={answers[q.id] ?? ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
              />
            )}

            {/* Matching */}
            {q.question_type === 'matching' && q.options && (
              <div className={styles.matchList}>
                {q.options.map((opt) => {
                  const parsed = (() => {
                    try { return JSON.parse(answers[q.id] ?? '{}') as Record<string, string> }
                    catch { return {} }
                  })()
                  return (
                    <div key={opt.label} className={styles.matchRow}>
                      <div className={styles.matchLeft}>{opt.label}. {opt.text}</div>
                      <span className={styles.matchArrow}>→</span>
                      <input
                        type="text"
                        className={styles.matchInput}
                        placeholder="Match…"
                        value={parsed[opt.label] ?? ''}
                        onChange={(e) => {
                          const updated = { ...parsed, [opt.label]: e.target.value }
                          handleAnswer(q.id, JSON.stringify(updated))
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Nav Bar ── */}
      <div className={styles.navBar}>
        <div className={styles.navLeft}>
          <button
            className={styles.btnNav}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            <ChevronLeft size={15} /> Previous
          </button>
        </div>

        <div className={styles.navRight}>
          <button className={styles.btnSkip} onClick={handleSkip}>
            <SkipForward size={14} /> Skip
          </button>
          {current < questions.length - 1 ? (
            <button className={styles.btnNav} onClick={() => setCurrent((c) => c + 1)}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              className={styles.btnSubmit}
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
            >
              <Send size={14} /> {submitting ? 'Submitting…' : 'Submit Exam'}
            </button>
          )}
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <div
          className={styles.overlay}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false) }}
        >
          <div className={styles.modal}>
            <div
              className={styles.modalIcon}
              style={{ background: '#fffbeb', border: '2px solid #fde68a' }}
            >
              <AlertTriangle size={24} color="#d97706" />
            </div>
            <h2 className={styles.modalTitle}>Submit Exam?</h2>
            <p className={styles.modalBody}>
              Once submitted you cannot change your answers. Your exam will be reviewed by faculty before results are released.
            </p>

            <div className={styles.modalStatRow}>
              <div className={styles.modalStat}>
                <span className={styles.modalStatVal} style={{ color: '#059669' }}>{answeredCount}</span>
                <span className={styles.modalStatLbl}>Answered</span>
              </div>
              <div className={styles.modalStat}>
                <span className={styles.modalStatVal} style={{ color: '#d97706' }}>{skippedCount}</span>
                <span className={styles.modalStatLbl}>Skipped</span>
              </div>
              <div className={styles.modalStat}>
                <span className={styles.modalStatVal} style={{ color: '#dc2626' }}>{Math.max(0, unansweredCount)}</span>
                <span className={styles.modalStatLbl}>Unanswered</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnModalCancel} onClick={() => setShowConfirm(false)}>
                Keep reviewing
              </button>
              <button
                className={styles.btnModalConfirm}
                onClick={() => { setShowConfirm(false); void doSubmit() }}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}