// student/reviews/[examId]/page.tsx — Practice / Review Mode

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, BookOpen, RotateCcw, ArrowLeft,
} from 'lucide-react'
import { createClient }       from '@/lib/supabase/client'
import { QuestionType, QuestionOption } from '@/lib/types/database'
import { useUser }            from '@/lib/context/AuthContext'
import styles                 from './practice.module.css'

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
  id:    string
  title: string
}

interface FeedbackEntry {
  submitted:     boolean
  isCorrect:     boolean | null   // null = manual type, no auto-grade
  correctAnswer: string | null
  explanation:   string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseOptions(raw: unknown): QuestionOption[] | null {
  if (!Array.isArray(raw)) return null
  return raw as QuestionOption[]
}

function stripDiffTag(raw: string | null): string {
  if (!raw) return ''
  return raw.replace(/^\[(easy|medium|hard)\]\s*/i, '')
}

// ✅ Grade only the auto-gradable types — no imported constant needed
function gradeAnswer(q: Question, answer: string): boolean | null {
  if (!q.correct_answer) return null
  if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
    return answer.toLowerCase() === q.correct_answer.toLowerCase()
  }
  if (q.question_type === 'fill_blank') {
    return answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
  }
  return null  // essay, short_answer, matching — manual only
}

// ── Page ───────────────────────────────────────────────────────────────────────

// ✅ Next.js 14: params is a plain object
export default function PracticeExamPage({ params }: { params: { examId: string } }) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // ✅ Auth from context — no extra network call
  const { user, loading: authLoading } = useUser()
  const examId = params.examId

  // ── State ─────────────────────────────────────────────────────────────────────
  const [exam,      setExam]      = useState<ExamMeta | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [current,   setCurrent]   = useState(0)
  const [answers,   setAnswers]   = useState<Record<string, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackEntry>>({})
  const [completed, setCompleted] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    // Practice exam doesn't strictly require auth (all published are open),
    // but we still check to maintain consistency.
    if (!user) { setError('Not authenticated.'); setLoading(false); return }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      // Fetch practice exam (exam_type = 'practice')
      const { data: examRow, error: eErr } = await supabase
        .from('exams')
        .select('id, title, exam_type')
        .eq('id', examId)
        .eq('is_published', true)
        .single()

      if (eErr || !examRow) {
        if (!cancelled) { setError('Reviewer not found or unavailable.'); setLoading(false) }
        return
      }

      const { data: qRows, error: qErr } = await supabase
        .from('questions')
        .select('id, question_text, question_type, points, options, correct_answer, explanation, order_number')
        .eq('exam_id', examId)
        .order('order_number', { ascending: true, nullsFirst: false })

      if (qErr || !qRows?.length) {
        if (!cancelled) { setError('No questions found for this reviewer.'); setLoading(false) }
        return
      }

      if (!cancelled) {
        setExam({ id: examRow.id, title: examRow.title })
        setQuestions(qRows.map((q) => ({
          id:             q.id,
          question_text:  q.question_text,
          question_type:  q.question_type as QuestionType,
          points:         q.points,
          options:        parseOptions(q.options),
          correct_answer: q.correct_answer,
          explanation:    q.explanation,
          order_number:   q.order_number,
        })))
        setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [authLoading, user, examId, supabase])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleAnswer = useCallback((qId: string, value: string) => {
    if (feedbacks[qId]?.submitted) return   // locked after check
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }, [feedbacks])

  const handleCheck = useCallback(() => {
    const q = questions[current]
    if (!q) return
    const studentAnswer = answers[q.id] ?? ''
    const isCorrect     = gradeAnswer(q, studentAnswer)

    setFeedbacks((prev) => ({
      ...prev,
      [q.id]: {
        submitted:     true,
        isCorrect,
        correctAnswer: q.correct_answer,
        explanation:   stripDiffTag(q.explanation) || null,
      },
    }))
  }, [current, questions, answers])

  const handleRetry = useCallback(() => {
    const q = questions[current]
    if (!q) return
    setAnswers((prev)   => { const n = { ...prev }; delete n[q.id]; return n })
    setFeedbacks((prev) => { const n = { ...prev }; delete n[q.id]; return n })
  }, [current, questions])

  const handleRestart = useCallback(() => {
    setAnswers({})
    setFeedbacks({})
    setCurrent(0)
    setCompleted(false)
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────────
  const q            = questions[current]
  const fb           = q ? feedbacks[q.id] : undefined
  const pct          = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0
  const correctCount = Object.values(feedbacks).filter((f) => f.isCorrect === true).length
  const canCheck     = !!(answers[q?.id ?? '']?.trim()) && !fb?.submitted

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (authLoading || loading) return <div className={styles.center}>Loading reviewer…</div>

  if (error) {
    return (
      <div className={styles.center}>
        <XCircle size={28} color="#dc2626" />
        <span>{error}</span>
        <button className={styles.btnCenter} onClick={() => router.back()}>Go back</button>
      </div>
    )
  }

  // ── Completion screen ─────────────────────────────────────────────────────────
  if (completed) {
    const gradable = Object.values(feedbacks).filter((f) => f.isCorrect !== null).length
    const accuracy = gradable > 0 ? Math.round((correctCount / gradable) * 100) : null
    return (
      <div className={styles.completion}>
        <div className={styles.completionCard}>
          <div className={styles.completionIcon}>
            <BookOpen size={28} color="#059669" />
          </div>
          <h1 className={styles.completionTitle}>Review Complete!</h1>
          <p className={styles.completionSub}>
            You've finished all {questions.length} question{questions.length !== 1 ? 's' : ''}.
          </p>
          <div className={styles.completionGrid}>
            <div className={styles.completionGridItem}>
              <span className={styles.completionGridVal}>{questions.length}</span>
              <span className={styles.completionGridLbl}>Questions</span>
            </div>
            <div className={styles.completionGridItem}>
              <span className={styles.completionGridVal} style={{ color: '#059669' }}>{correctCount}</span>
              <span className={styles.completionGridLbl}>Correct</span>
            </div>
            <div className={styles.completionGridItem}>
              <span className={styles.completionGridVal} style={{ color: '#dc2626' }}>
                {gradable - correctCount}
              </span>
              <span className={styles.completionGridLbl}>Wrong</span>
            </div>
            <div className={styles.completionGridItem}>
              <span className={styles.completionGridVal}>
                {accuracy !== null ? `${accuracy}%` : '—'}
              </span>
              <span className={styles.completionGridLbl}>Accuracy</span>
            </div>
          </div>
          <div className={styles.completionActions}>
            <button className={styles.btnRetryAll} onClick={handleRestart}>
              <RotateCcw size={14} /> Try again
            </button>
            <button className={styles.btnBackList} onClick={() => router.push('/student/reviews')}>
              <ArrowLeft size={14} /> Back to Reviewers
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!q || !exam) return null

  // ── Practice UI ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.shell}>

      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <span className={styles.examTitle}>{exam.title}</span>
          <span className={styles.practiceBadge}>Practice</span>
        </div>
        <div className={styles.topRight}>
          <span className={styles.progressLabel}>{current + 1} / {questions.length}</span>
          <div className={styles.progressBarWrap}>
            <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* ── Sidebar palette ── */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <div className={styles.sidebarHeading}>Questions</div>
            <div className={styles.legend}>
              {[
                { label: 'Correct', color: '#10b981' },
                { label: 'Wrong',   color: '#ef4444' },
                { label: 'Checked', color: '#8b5cf6' },
                { label: 'Current', color: '#0d2540' },
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
              const pfb   = feedbacks[pq.id]
              const isCur = idx === current
              const cls   =
                isCur                    ? styles.palCurrent :
                pfb?.isCorrect === true  ? styles.palCorrect :
                pfb?.isCorrect === false ? styles.palWrong   :
                pfb?.submitted           ? styles.palChecked :
                ''
              return (
                <button
                  key={pq.id}
                  className={`${styles.palBtn} ${cls}`}
                  onClick={() => setCurrent(idx)}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Question card ── */}
        <div className={styles.content}>
          <div className={styles.questionCard} key={q.id}>
            <div className={styles.questionMeta}>
              <span className={styles.qNumber}>Question {current + 1} of {questions.length}</span>
              <div className={styles.qBadges}>
                <span className={styles.ptsBadge}>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                <span className={styles.typeBadge}>{q.question_type.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <p className={styles.questionText}>{q.question_text}</p>

            {/* MCQ */}
            {q.question_type === 'multiple_choice' && q.options && (
              <div className={styles.optionList}>
                {q.options.map((opt) => {
                  const isSel      = answers[q.id] === opt.label
                  const isChecked  = fb?.submitted
                  const isCorrectO = fb?.correctAnswer === opt.label
                  const isWrongO   = isSel && fb?.isCorrect === false
                  return (
                    <button
                      key={opt.label}
                      className={`${styles.optionBtn}
                        ${isSel && !isChecked     ? styles.optionSelected : ''}
                        ${isChecked && isCorrectO ? styles.optionCorrect  : ''}
                        ${isChecked && isWrongO   ? styles.optionWrong    : ''}
                        ${isChecked               ? styles.optLocked      : ''}
                      `}
                      onClick={() => !isChecked && handleAnswer(q.id, opt.label)}
                    >
                      <span className={styles.optLabel}>{opt.label}</span>
                      <span className={styles.optText}>{opt.text}</span>
                      {isChecked && isCorrectO && <span className={styles.optIcon}><CheckCircle2 size={16} color="#059669" /></span>}
                      {isChecked && isWrongO   && <span className={styles.optIcon}><XCircle      size={16} color="#dc2626" /></span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* True / False */}
            {q.question_type === 'true_false' && (
              <div className={styles.tfRow}>
                {(['true', 'false'] as const).map((v) => {
                  const isSel     = answers[q.id] === v
                  const isChecked = fb?.submitted
                  const isCorr    = fb?.correctAnswer === v
                  const isWrong   = isSel && fb?.isCorrect === false
                  return (
                    <button
                      key={v}
                      className={`${styles.tfBtn}
                        ${isSel && !isChecked ? styles.tfSelected : ''}
                        ${isChecked && isCorr  ? styles.tfCorrect  : ''}
                        ${isChecked && isWrong ? styles.tfWrong    : ''}
                        ${isChecked            ? styles.tfLocked   : ''}
                      `}
                      onClick={() => !isChecked && handleAnswer(q.id, v)}
                    >
                      {v === 'true' ? 'True' : 'False'}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Essay / Short Answer */}
            {(q.question_type === 'essay' || q.question_type === 'short_answer') && (
              <textarea
                className={styles.textArea}
                placeholder={q.question_type === 'essay' ? 'Write your answer here…' : 'Short answer…'}
                value={answers[q.id] ?? ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                disabled={fb?.submitted}
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
                disabled={fb?.submitted}
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
                        disabled={fb?.submitted}
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

            {/* Action bar */}
            <div className={styles.answerBar}>
              {!fb?.submitted ? (
                <button className={styles.btnCheck} onClick={handleCheck} disabled={!canCheck}>
                  <CheckCircle2 size={14} /> Check Answer
                </button>
              ) : (
                <button className={styles.btnRetry} onClick={handleRetry}>
                  <RotateCcw size={14} /> Retry
                </button>
              )}
            </div>

            {/* Feedback box */}
            {fb?.submitted && (
              <div className={`${styles.feedback} ${
                fb.isCorrect === true  ? styles.feedbackCorrect  :
                fb.isCorrect === false ? styles.feedbackWrong    :
                styles.feedbackNeutral
              }`}>
                <div className={`${styles.feedbackHeader} ${
                  fb.isCorrect === true  ? styles.feedbackHeaderCorrect  :
                  fb.isCorrect === false ? styles.feedbackHeaderWrong    :
                  styles.feedbackHeaderNeutral
                }`}>
                  {fb.isCorrect === true  && <><CheckCircle2 size={15} /> Correct!</>}
                  {fb.isCorrect === false && <><XCircle      size={15} /> Incorrect</>}
                  {fb.isCorrect === null  && <><BookOpen     size={15} /> Recorded — requires manual review</>}
                </div>
                {fb.isCorrect === false && fb.correctAnswer && (
                  <p className={styles.feedbackAnswer}>
                    Correct answer: <strong>{fb.correctAnswer}</strong>
                  </p>
                )}
                {fb.explanation && (
                  <p className={styles.feedbackExplanation}>{fb.explanation}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Nav Bar ── */}
      <div className={styles.navBar}>
        <div className={styles.navLeft}>
          <button className={styles.btnNav} onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <ChevronLeft size={15} /> Previous
          </button>
        </div>
        <div className={styles.navRight}>
          {current < questions.length - 1 ? (
            <button className={styles.btnNav} onClick={() => setCurrent((c) => c + 1)}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button className={styles.btnFinish} onClick={() => setCompleted(true)}>
              <CheckCircle2 size={14} /> Finish Review
            </button>
          )}
        </div>
      </div>
    </div>
  )
}