// student/reviews/[examId]/page.tsx
// Practice / Reviewer mode — no timer, instant feedback, retry allowed
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, BookOpen, RotateCcw, ArrowLeft,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Database, QuestionOption } from '@/lib/types/database'
import styles from './practice.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────
type QRow = Database['public']['Tables']['questions']['Row']
type ExamRow = Database['public']['Tables']['exams']['Row']
type PracticeRow = Database['public']['Tables']['practice_exams']['Row']

interface Question extends QRow {
  parsedOptions: QuestionOption[] | null
}

interface FeedbackState {
  submitted:    boolean
  isCorrect:    boolean | null   // null = manual type (no auto-grade in practice)
  correctAnswer: string | null
  explanation:  string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseOptions(raw: unknown): QuestionOption[] | null {
  if (!Array.isArray(raw)) return null
  return raw as QuestionOption[]
}

function stripDifficultyTag(raw: string | null): string {
  if (!raw) return ''
  return raw.replace(/^\[(easy|medium|hard)\]\s*/i, '')
}

function checkAnswer(q: Question, studentAnswer: string): boolean | null {
  if (!q.correct_answer) return null  // essay/short_answer — no auto-grade
  if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
    return studentAnswer.toLowerCase() === q.correct_answer.toLowerCase()
  }
  if (q.question_type === 'fill_blank') {
    return studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
  }
  return null  // matching, short_answer, essay
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PracticeExamPage({ params }: { params: { examId: string } }) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { examId } = params

  // This page supports both practice_exams (reviewers) AND exams with exam_type='practice'
  // We detect which one based on what we find in the DB.

  const [practiceExam, setPracticeExam] = useState<PracticeRow | null>(null)
  const [questions,    setQuestions]    = useState<Question[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  const [current,    setCurrent]    = useState(0)
  const [answers,    setAnswers]    = useState<Record<string, string>>({})
  const [feedbacks,  setFeedbacks]  = useState<Record<string, FeedbackState>>({})
  const [completed,  setCompleted]  = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      // Try practice_exams first
      const { data: practiceRow } = await supabase
        .from('practice_exams')
        .select('*')
        .eq('id', examId)
        .eq('is_published', true)
        .single()

      const practice = practiceRow as PracticeRow | null

      if (practice && !cancelled) {
        // Practice exam — questions live in the `questions` table linked to an exam.
        // For practice_exams (reviewers), content is in `content` column (no questions table link).
        // We fetch questions from exams that share the same category and are practice type.
        // However, per schema, practice_exams don't directly link to questions.
        // We show the reviewer content and allow navigation if any linked exam questions exist.
        // For this implementation: fetch questions from exams with same category_id.
        let qs: Question[] = []

        if (practice.category_id) {
          const { data: examRows } = await supabase
            .from('exams')
            .select('id')
            .eq('category_id', practice.category_id)
            .eq('is_published', true)
            .limit(1)

          const linkedExamId = (examRows as Pick<ExamRow, 'id'>[] | null)?.[0]?.id

          if (linkedExamId) {
            const { data: qRows } = await supabase
              .from('questions')
              .select('*')
              .eq('exam_id', linkedExamId)
              .order('order_number', { ascending: true, nullsFirst: false })

            qs = ((qRows as QRow[] | null) ?? []).map((q) => ({ ...q, parsedOptions: parseOptions(q.options) }))
          }
        }

        if (!cancelled) {
          setPracticeExam(practice)
          setQuestions(qs)
          setLoading(false)
        }
        return
      }

      // Fall back: try exams table with exam_type = 'practice'
      const { data: examRow, error: examErr } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .eq('is_published', true)
        .single()

      const exam = examRow as ExamRow | null

      if (examErr || !exam) {
        if (!cancelled) { setError('Reviewer not found.'); setLoading(false) }
        return
      }

      const { data: qRows, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_number', { ascending: true, nullsFirst: false })

      const questionsRows = (qRows as QRow[] | null) ?? []

      if (qErr || !questionsRows.length) {
        if (!cancelled) { setError('No questions found for this reviewer.'); setLoading(false) }
        return
      }

      if (!cancelled) {
        // Treat exam as a practice reviewer
        setPracticeExam({
          id:           exam.id,
          title:        exam.title,
          description:  exam.description,
          category_id:  exam.category_id,
          content:      null,
          file_url:     null,
          created_by:   exam.created_by,
          is_published: exam.is_published,
          view_count:   0,
          created_at:   exam.created_at,
          updated_at:   exam.updated_at,
        })
        setQuestions(questionsRows.map((q) => ({ ...q, parsedOptions: parseOptions(q.options) })))
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [examId, supabase])

  // ── Answer & check ───────────────────────────────────────────────────────────
  const handleAnswer = useCallback((qId: string, value: string) => {
    if (feedbacks[qId]?.submitted) return  // already checked — use retry
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }, [feedbacks])

  const handleCheck = useCallback(() => {
    const q = questions[current]
    if (!q) return
    const studentAnswer = answers[q.id] ?? ''
    const isCorrect     = checkAnswer(q, studentAnswer)
    const explanation   = stripDifficultyTag(q.explanation)

    setFeedbacks((prev) => ({
      ...prev,
      [q.id]: {
        submitted:     true,
        isCorrect,
        correctAnswer: q.correct_answer,
        explanation:   explanation || null,
      },
    }))
  }, [current, questions, answers])

  const handleRetry = useCallback(() => {
    const q = questions[current]
    if (!q) return
    setAnswers((prev) => { const n = { ...prev }; delete n[q.id]; return n })
    setFeedbacks((prev) => { const n = { ...prev }; delete n[q.id]; return n })
  }, [current, questions])

  const handleNext = useCallback(() => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1)
    } else {
      setCompleted(true)
    }
  }, [current, questions.length])

  const handleRestart = useCallback(() => {
    setAnswers({})
    setFeedbacks({})
    setCurrent(0)
    setCompleted(false)
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const q          = questions[current]
  const feedback   = q ? feedbacks[q.id] : undefined
  const pct        = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0
  const correctCount = Object.values(feedbacks).filter((f) => f.isCorrect === true).length

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) return <div className={styles.center}>Loading reviewer…</div>

  if (error) {
    return (
      <div className={styles.center}>
        <XCircle size={28} color="#dc2626" />
        <span>{error}</span>
        <button onClick={() => router.back()} style={{ marginTop: '0.5rem', cursor: 'pointer' }}>
          Go back
        </button>
      </div>
    )
  }

  // ── Completion screen ────────────────────────────────────────────────────────
  if (completed) {
    const gradable = Object.values(feedbacks).filter((f) => f.isCorrect !== null).length
    return (
      <div className={styles.completion}>
        <div className={styles.completionCard}>
          <div className={styles.completionIcon}>
            <BookOpen size={28} color="#8b5cf6" />
          </div>
          <h1 className={styles.completionTitle}>Review Complete!</h1>
          <p className={styles.completionSub}>
            You&apos;ve gone through all {questions.length} question{questions.length !== 1 ? 's' : ''} in this reviewer.
          </p>
          <div className={styles.completionStats}>
            <div className={styles.completionStatBox}>
              <span className={styles.completionStatValue}>{questions.length}</span>
              <span className={styles.completionStatLabel}>Questions</span>
            </div>
            <div className={styles.completionStatBox}>
              <span className={styles.completionStatValue} style={{ color: '#059669' }}>{correctCount}</span>
              <span className={styles.completionStatLabel}>Correct</span>
            </div>
            <div className={styles.completionStatBox}>
              <span className={styles.completionStatValue} style={{ color: '#dc2626' }}>
                {gradable - correctCount}
              </span>
              <span className={styles.completionStatLabel}>Wrong</span>
            </div>
            <div className={styles.completionStatBox}>
              <span className={styles.completionStatValue}>
                {gradable > 0 ? Math.round((correctCount / gradable) * 100) : '—'}
                {gradable > 0 ? '%' : ''}
              </span>
              <span className={styles.completionStatLabel}>Accuracy</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className={styles.btnCompletionRetry} onClick={handleRestart}>
              <RotateCcw size={14} /> Try again
            </button>
            <button className={styles.btnCompletionBack} onClick={() => router.push('/student/reviews')}>
              <ArrowLeft size={14} /> Back to Reviewers
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!q || !practiceExam) return null

  const canCheck = (answers[q.id] ?? '').trim().length > 0 && !feedback?.submitted

  // ── Main Exam UI ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.shell}>

      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.examTitle}>{practiceExam.title}</span>
          <span className={styles.practiceTag}>Practice</span>
        </div>
        <div className={styles.topBarRight}>
          <span className={styles.progressInfo}>{current + 1} / {questions.length}</span>
          <div className={styles.progressBarWrap}>
            <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <div className={styles.sidebarTitle}>Questions</div>
            <div className={styles.sidebarLegend}>
              {[
                { label: 'Correct',   color: '#10b981' },
                { label: 'Wrong',     color: '#ef4444' },
                { label: 'Answered',  color: '#8b5cf6' },
                { label: 'Current',   color: '#7c3aed' },
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
              const fb    = feedbacks[pq.id]
              const isCur = idx === current
              const cls =
                isCur                    ? styles.paletteBtnCurrent   :
                fb?.isCorrect === true   ? styles.paletteBtnCorrect   :
                fb?.isCorrect === false  ? styles.paletteBtnIncorrect :
                fb?.submitted            ? styles.paletteBtnAnswered  :
                answers[pq.id]           ? styles.paletteBtnAnswered  :
                ''
              return (
                <button
                  key={pq.id}
                  className={`${styles.paletteBtn} ${cls}`}
                  onClick={() => setCurrent(idx)}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Question ── */}
        <div className={styles.questionArea}>
          <div className={styles.questionCard} key={q.id}>
            <div className={styles.questionMeta}>
              <span className={styles.questionNumber}>Question {current + 1} of {questions.length}</span>
              <div className={styles.questionBadges}>
                <span className={styles.pointsBadge}>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                <span className={styles.typeBadge}>{q.question_type.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <p className={styles.questionText}>{q.question_text}</p>

            {/* ── MCQ ── */}
            {q.question_type === 'multiple_choice' && q.parsedOptions && (
              <div className={styles.optionsList}>
                {q.parsedOptions.map((opt) => {
                  const isSelected = answers[q.id] === opt.label
                  const isSubmitted = feedback?.submitted
                  const isCorrectOpt = feedback?.correctAnswer === opt.label
                  const isWrongOpt   = isSelected && feedback?.isCorrect === false

                  return (
                    <button
                      key={opt.label}
                      className={`${styles.optionBtn}
                        ${isSelected && !isSubmitted ? styles.optionBtnSelected : ''}
                        ${isSubmitted && isCorrectOpt ? styles.optionBtnCorrect  : ''}
                        ${isSubmitted && isWrongOpt   ? styles.optionBtnWrong    : ''}
                        ${isSubmitted               ? styles.optionBtnSubmitted : ''}
                      `}
                      onClick={() => !isSubmitted && handleAnswer(q.id, opt.label)}
                    >
                      <span className={styles.optionLabel}>{opt.label}</span>
                      <span className={styles.optionText}>{opt.text}</span>
                      {isSubmitted && isCorrectOpt && (
                        <span className={styles.optionResultIcon}>
                          <CheckCircle2 size={16} color="#059669" />
                        </span>
                      )}
                      {isSubmitted && isWrongOpt && (
                        <span className={styles.optionResultIcon}>
                          <XCircle size={16} color="#dc2626" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── True / False ── */}
            {q.question_type === 'true_false' && (
              <div className={styles.tfRow}>
                {['true', 'false'].map((v) => {
                  const isSelected  = answers[q.id] === v
                  const isSubmitted = feedback?.submitted
                  const isCorrectV  = feedback?.correctAnswer === v
                  const isWrongV    = isSelected && feedback?.isCorrect === false

                  return (
                    <button
                      key={v}
                      className={`${styles.tfBtn}
                        ${isSelected && !isSubmitted ? styles.tfBtnSelected  : ''}
                        ${isSubmitted && isCorrectV  ? styles.tfBtnCorrect   : ''}
                        ${isSubmitted && isWrongV    ? styles.tfBtnWrong     : ''}
                        ${isSubmitted               ? styles.tfBtnSubmitted : ''}
                      `}
                      onClick={() => !isSubmitted && handleAnswer(q.id, v)}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Essay / Short Answer ── */}
            {(q.question_type === 'essay' || q.question_type === 'short_answer') && (
              <textarea
                className={styles.textAnswer}
                placeholder={q.question_type === 'essay' ? 'Write your answer here…' : 'Short answer…'}
                value={answers[q.id] ?? ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                disabled={feedback?.submitted}
              />
            )}

            {/* ── Fill in the blank ── */}
            {q.question_type === 'fill_blank' && (
              <input
                className={styles.fillBlankInput}
                type="text"
                placeholder="Your answer…"
                value={answers[q.id] ?? ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                disabled={feedback?.submitted}
              />
            )}

            {/* ── Matching ── */}
            {q.question_type === 'matching' && q.parsedOptions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.parsedOptions.map((opt) => {
                  const currentMatchings = (() => {
                    try { return JSON.parse(answers[q.id] ?? '{}') as Record<string, string> }
                    catch { return {} as Record<string, string> }
                  })()
                  return (
                    <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        padding: '0.5rem 0.8rem', background: '#f0f3f8', borderRadius: 7,
                        fontSize: '0.82rem', fontWeight: 600, color: '#0d1523', flex: 1
                      }}>
                        {opt.label}. {opt.text}
                      </div>
                      <span style={{ color: '#8a9ab5' }}>→</span>
                      <input
                        style={{
                          padding: '0.48rem 0.75rem', border: '1.5px solid #e4e9f0',
                          borderRadius: 7, fontFamily: 'DM Sans, sans-serif',
                          fontSize: '0.8rem', color: '#0d1523', outline: 'none',
                          background: feedback?.submitted ? '#f0f3f8' : '#fff',
                        }}
                        type="text"
                        placeholder="Match…"
                        value={currentMatchings[opt.label] ?? ''}
                        disabled={feedback?.submitted}
                        onChange={(e) => {
                          const updated = { ...currentMatchings, [opt.label]: e.target.value }
                          handleAnswer(q.id, JSON.stringify(updated))
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Action buttons ── */}
            <div className={styles.answerActions}>
              {!feedback?.submitted ? (
                <button className={styles.btnCheck} onClick={handleCheck} disabled={!canCheck}>
                  <CheckCircle2 size={14} /> Check Answer
                </button>
              ) : (
                <button className={styles.btnRetry} onClick={handleRetry}>
                  <RotateCcw size={14} /> Retry
                </button>
              )}
            </div>

            {/* ── Feedback ── */}
            {feedback?.submitted && (
              <div
                className={`${styles.feedbackBox} ${
                  feedback.isCorrect === true  ? styles.feedbackBoxCorrect :
                  feedback.isCorrect === false ? styles.feedbackBoxWrong   :
                  styles.feedbackBoxCorrect    // null = manual, show neutral green
                }`}
              >
                <div className={styles.feedbackHeader}>
                  {feedback.isCorrect === true && (
                    <>
                      <CheckCircle2 size={16} color="#059669" />
                      <span className={styles.feedbackCorrectText}>Correct!</span>
                    </>
                  )}
                  {feedback.isCorrect === false && (
                    <>
                      <XCircle size={16} color="#dc2626" />
                      <span className={styles.feedbackWrongText}>Incorrect</span>
                    </>
                  )}
                  {feedback.isCorrect === null && (
                    <>
                      <BookOpen size={16} color="#059669" />
                      <span className={styles.feedbackCorrectText}>Answer recorded — requires manual review</span>
                    </>
                  )}
                </div>
                {feedback.isCorrect === false && feedback.correctAnswer && (
                  <p className={styles.feedbackAnswer}>
                    Correct answer: <span>{feedback.correctAnswer}</span>
                  </p>
                )}
                {feedback.explanation && (
                  <p className={styles.feedbackExplanation}>{feedback.explanation}</p>
                )}
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
          {current < questions.length - 1 ? (
            <button className={styles.btnNav} onClick={handleNext}>
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