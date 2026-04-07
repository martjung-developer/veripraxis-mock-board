// app/(dashboard)/admin/exams/[examId]/submissions/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ClipboardList, ArrowLeft, Search, X, Eye, Pencil,
  ChevronLeft, ChevronRight, Filter,
  CheckCircle, Clock, XCircle, AlertCircle, RefreshCw,
  CheckSquare, ToggleLeft, AlignLeft, Hash, List,
  ThumbsUp, ThumbsDown, MinusCircle,
} from 'lucide-react'
import s from './submissions.module.css'
import { createClient } from '@/lib/supabase/client'
import type { QuestionType, QuestionOption } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────
type SubmissionStatus = 'in_progress' | 'submitted' | 'graded'

interface Submission {
  id: string
  student: { id: string; full_name: string; email: string; student_id: string | null }
  started_at: string
  submitted_at: string | null
  time_spent_seconds: number | null
  status: SubmissionStatus
  score: number | null
  percentage: number | null
  passed: boolean | null
}

// Answer detail for view modal
interface AnswerDetail {
  id: string
  question_id: string
  answer_text: string | null
  is_correct: boolean | null
  points_earned: number | null
  feedback: string | null
  question: {
    question_text: string
    question_type: QuestionType
    points: number
    options: QuestionOption[] | null
    correct_answer: string | null
    explanation: string | null
    order_number: number | null
  } | null
}

type SubmissionRaw = {
  id: string
  student_id: string | null
  started_at: string
  submitted_at: string | null
  time_spent_seconds: number | null
  status: string
  score: number | null
  percentage: number | null
  passed: boolean | null
  profiles: { id: string; full_name: string | null; email: string } | { id: string; full_name: string | null; email: string }[] | null
  students: { student_id: string | null } | { student_id: string | null }[] | null
}

type AnswerRaw = {
  id: string
  question_id: string | null
  answer_text: string | null
  is_correct: boolean | null
  points_earned: number | null
  feedback: string | null
  questions: {
    question_text: string
    question_type: string
    points: number
    options: unknown
    correct_answer: string | null
    explanation: string | null
    order_number: number | null
  } | null
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ElementType; color: string }> = {
  in_progress: { label: 'In Progress', icon: Clock,       color: 'amber' },
  submitted:   { label: 'Submitted',   icon: CheckCircle, color: 'blue'  },
  graded:      { label: 'Graded',      icon: CheckCircle, color: 'green' },
}

const TYPE_ICONS: Record<QuestionType, React.ElementType> = {
  multiple_choice: CheckSquare,
  true_false:      ToggleLeft,
  short_answer:    AlignLeft,
  essay:           AlignLeft,
  matching:        List,
  fill_blank:      Hash,
}

const PAGE_SIZE = 10

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  return `${m}m ${secs % 60}s`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SubmissionsPage() {
  const { examId } = useParams<{ examId: string }>()

  const [submissions,  setSubmissions]  = useState<Submission[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all')
  const [page,         setPage]         = useState(1)

  // View modal
  const [viewTarget,   setViewTarget]   = useState<Submission | null>(null)
  const [answers,      setAnswers]       = useState<AnswerDetail[]>([])
  const [answersLoading, setAnswersLoading] = useState(false)

  // ── Fetch submissions ──────────────────────────────────────────────────────
  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data, error: fetchErr } = await supabase
      .from('submissions')
      .select(`
        id, student_id,
        started_at, submitted_at, time_spent_seconds,
        status, score, percentage, passed,
        profiles:student_id ( id, full_name, email ),
        students:student_id ( student_id )
      `)
      .eq('exam_id', examId)
      .order('started_at', { ascending: false })

    if (fetchErr) {
      setError('Could not load submissions.')
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as SubmissionRaw[]
    const validStatuses: SubmissionStatus[] = ['in_progress', 'submitted', 'graded']

    const mapped: Submission[] = rows.map(row => {
      const profile = unwrap(row.profiles)
      const student = unwrap(row.students)
      const status: SubmissionStatus = validStatuses.includes(row.status as SubmissionStatus)
        ? (row.status as SubmissionStatus)
        : 'in_progress'
      return {
        id: row.id,
        student: {
          id:         profile?.id        ?? row.student_id ?? '',
          full_name:  profile?.full_name ?? 'Unknown Student',
          email:      profile?.email     ?? '',
          student_id: student?.student_id ?? null,
        },
        started_at:         row.started_at,
        submitted_at:       row.submitted_at,
        time_spent_seconds: row.time_spent_seconds,
        status,
        score:      row.score,
        percentage: row.percentage,
        passed:     row.passed,
      }
    })

    setSubmissions(mapped)
    setLoading(false)
  }, [examId])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  // ── Fetch answers for a single submission ──────────────────────────────────
  const openViewModal = async (sub: Submission) => {
    setViewTarget(sub)
    setAnswers([])
    setAnswersLoading(true)

    const supabase = createClient()
    const { data, error: ansErr } = await supabase
      .from('answers')
      .select(`
        id, question_id, answer_text, is_correct, points_earned, feedback,
        questions:question_id (
          question_text, question_type, points,
          options, correct_answer, explanation, order_number
        )
      `)
      .eq('submission_id', sub.id)
      .order('created_at', { ascending: true })

    if (!ansErr && data) {
      const mapped: AnswerDetail[] = (data as unknown as AnswerRaw[]).map(row => ({
        id:            row.id,
        question_id:   row.question_id ?? '',
        answer_text:   row.answer_text,
        is_correct:    row.is_correct,
        points_earned: row.points_earned,
        feedback:      row.feedback,
        question:      row.questions
          ? {
              question_text:  row.questions.question_text,
              question_type:  row.questions.question_type as QuestionType,
              points:         row.questions.points,
              options:        (row.questions.options as QuestionOption[]) ?? null,
              correct_answer: row.questions.correct_answer,
              explanation:    row.questions.explanation,
              order_number:   row.questions.order_number,
            }
          : null,
      }))

      // Sort by order_number if available
      mapped.sort((a, b) => (a.question?.order_number ?? 999) - (b.question?.order_number ?? 999))
      setAnswers(mapped)
    }

    setAnswersLoading(false)
  }

  const closeViewModal = () => {
    setViewTarget(null)
    setAnswers([])
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => submissions.filter(sub => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || sub.student.full_name.toLowerCase().includes(q)
      || sub.student.email.toLowerCase().includes(q)
      || (sub.student.student_id ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || sub.status === statusFilter
    return matchSearch && matchStatus
  }), [submissions, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const initials   = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // Answer correctness breakdown
  const answerStats = useMemo(() => {
    const correct = answers.filter(a => a.is_correct === true).length
    const incorrect = answers.filter(a => a.is_correct === false).length
    const pending = answers.filter(a => a.is_correct === null).length
    return { correct, incorrect, pending, total: answers.length }
  }, [answers])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><ClipboardList size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Submissions</h1>
              <p className={s.headingSub}>{submissions.length} total submission{submissions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button className={s.btnSecondary} onClick={fetchSubmissions} disabled={loading}>
            <RefreshCw size={13} className={loading ? s.spinner : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className={s.errorBanner}>
          <AlertCircle size={14} />{error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} /></button>
        </div>
      )}

      {/* ── Status summary pills ── */}
      <div className={s.statsRow}>
        {(Object.entries(STATUS_CONFIG) as [SubmissionStatus, typeof STATUS_CONFIG[SubmissionStatus]][]).map(([key, cfg]) => {
          const count = submissions.filter(sub => sub.status === key).length
          return (
            <div key={key} className={`${s.statPill} ${s[`statPill_${cfg.color}`]}`}>
              <cfg.icon size={13} />
              <span>{cfg.label}</span>
              <strong>{count}</strong>
            </div>
          )
        })}
        <div className={`${s.statPill} ${s.statPill_muted}`}>
          <XCircle size={13} />
          <span>Not Started</span>
          <strong>—</strong>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Search by name, email, or student ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && <button className={s.searchClear} onClick={() => { setSearch(''); setPage(1) }}><X size={13} /></button>}
        </div>
        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select
            className={s.filterSelect}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as SubmissionStatus | 'all'); setPage(1) }}
          >
            <option value="all">All Status</option>
            {(Object.entries(STATUS_CONFIG) as [SubmissionStatus, typeof STATUS_CONFIG[SubmissionStatus]][]).map(([k, v]) =>
              <option key={k} value={k}>{v.label}</option>
            )}
          </select>
        </div>
        <p className={s.resultCount}>
          <strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Table ── */}
      <div className={s.tableCard}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Started</th>
                <th>Submitted</th>
                <th>Time Spent</th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className={s.skeletonRow}>
                    <td><div className={s.skelCell}><div className={`${s.skeleton} ${s.skelAvatar}`} /><div><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} /><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 100, marginTop: 5 }} /></div></div></td>
                    {[70, 90, 90, 60, 80, 50].map((w, j) => <td key={j}><div className={`${s.skeleton} ${s.skelText}`} style={{ width: w }} /></td>)}
                    <td><div className={s.skelActions}><div className={`${s.skeleton} ${s.skelBtn}`} /><div className={`${s.skeleton} ${s.skelBtn}`} /></div></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><ClipboardList size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No submissions found</p>
                    <p className={s.emptySub}>Submissions will appear once students begin the exam.</p>
                  </div>
                </td></tr>
              ) : paginated.map(sub => {
                const cfg = STATUS_CONFIG[sub.status]
                return (
                  <tr key={sub.id} className={s.tableRow}>
                    <td>
                      <div className={s.studentCell}>
                        <div className={s.avatar}><span className={s.avatarInitials}>{initials(sub.student.full_name)}</span></div>
                        <div>
                          <div className={s.studentName}>{sub.student.full_name}</div>
                          <div className={s.studentEmail}>{sub.student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={s.idChip}>{sub.student.student_id ?? '—'}</span></td>
                    <td><span className={s.dateCell}>{fmtDate(sub.started_at)}</span></td>
                    <td><span className={s.dateCell}>{sub.submitted_at ? fmtDate(sub.submitted_at) : <span className={s.na}>—</span>}</span></td>
                    <td><span className={s.timeCell}>{sub.time_spent_seconds ? fmtTime(sub.time_spent_seconds) : <span className={s.na}>—</span>}</span></td>
                    <td>
                      <span className={`${s.statusBadge} ${s[`statusBadge_${cfg.color}`]}`}>
                        <cfg.icon size={11} />{cfg.label}
                      </span>
                    </td>
                    <td>
                      {sub.score != null
                        ? <span className={`${s.scoreChip} ${sub.passed ? s.scorePass : s.scoreFail}`}>
                            {sub.percentage != null ? `${sub.percentage.toFixed(1)}%` : `${sub.score} pts`}
                          </span>
                        : <span className={s.na}>—</span>}
                    </td>
                    <td>
                      <div className={s.actions}>
                        <button
                          className={s.actionView}
                          title="View Submission"
                          onClick={() => openViewModal(sub)}
                        >
                          <Eye size={13} />
                        </button>
                        {sub.status === 'submitted' && (
                          <Link
                            href={`/admin/exams/${examId}/submissions/${sub.id}/grade`}
                            className={s.actionEdit}
                            title="Grade Submission"
                          >
                            <Pencil size={13} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className={s.pagination}>
            <span className={s.pageInfo}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className={s.pageButtons}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} className={`${s.pageBtn} ${page === n ? s.pageBtnActive : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          VIEW SUBMISSION MODAL
      ══════════════════════════════════════════ */}
      {viewTarget && (
        <div className={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeViewModal() }}>
          <div className={s.viewModal}>
            {/* Modal Header */}
            <div className={s.viewModalHeader}>
              <div className={s.viewModalStudentInfo}>
                <div className={s.viewModalAvatar}>
                  {initials(viewTarget.student.full_name)}
                </div>
                <div>
                  <h2 className={s.viewModalName}>{viewTarget.student.full_name}</h2>
                  <p className={s.viewModalMeta}>
                    {viewTarget.student.email}
                    {viewTarget.student.student_id && <> · ID: {viewTarget.student.student_id}</>}
                    {viewTarget.submitted_at && <> · Submitted {fmtDate(viewTarget.submitted_at)}</>}
                  </p>
                </div>
              </div>
              <div className={s.viewModalHeaderRight}>
                {/* Score summary */}
                {viewTarget.score != null && (
                  <div className={`${s.viewScoreBadge} ${viewTarget.passed ? s.viewScorePass : s.viewScoreFail}`}>
                    {viewTarget.percentage?.toFixed(1)}% · {viewTarget.passed ? 'PASSED' : 'FAILED'}
                  </div>
                )}
                <button className={s.modalClose} onClick={closeViewModal}><X size={16} /></button>
              </div>
            </div>

            {/* Answer stats strip */}
            {!answersLoading && answers.length > 0 && (
              <div className={s.answerStatsStrip}>
                <div className={s.answerStat}>
                  <ThumbsUp size={12} className={s.statIconCorrect} />
                  <span>{answerStats.correct} correct</span>
                </div>
                <div className={s.answerStat}>
                  <ThumbsDown size={12} className={s.statIconWrong} />
                  <span>{answerStats.incorrect} incorrect</span>
                </div>
                {answerStats.pending > 0 && (
                  <div className={s.answerStat}>
                    <MinusCircle size={12} className={s.statIconPending} />
                    <span>{answerStats.pending} pending review</span>
                  </div>
                )}
                <div className={s.answerStat}>
                  <span className={s.answerStatTotal}>{answerStats.total} total</span>
                </div>
              </div>
            )}

            {/* Answer list */}
            <div className={s.viewModalBody}>
              {answersLoading ? (
                <div className={s.loadingState}>
                  <div className={s.loadingSpinner} />
                  <p>Loading answers…</p>
                </div>
              ) : answers.length === 0 ? (
                <div className={s.emptyState}>
                  <div className={s.emptyIcon}><AlignLeft size={22} color="var(--text-muted)" /></div>
                  <p className={s.emptyTitle}>No answers recorded</p>
                  <p className={s.emptySub}>This submission has no answers yet.</p>
                </div>
              ) : (
                answers.map((ans, idx) => {
                  const q = ans.question
                  if (!q) return null

                  const Icon = TYPE_ICONS[q.question_type]
                  // Determine answer state
                  const isAutoGraded = ['multiple_choice','true_false','fill_blank'].includes(q.question_type)
                  const isPending    = !isAutoGraded && ans.is_correct === null
                  const isCorrect    = ans.is_correct === true
                  const isWrong      = ans.is_correct === false

                  return (
                    <div
                      key={ans.id}
                      className={`${s.answerCard} ${
                        isPending  ? s.answerPending  :
                        isCorrect  ? s.answerCorrect  :
                        isWrong    ? s.answerWrong    : ''
                      }`}
                    >
                      {/* Question header */}
                      <div className={s.answerCardHeader}>
                        <div className={s.answerQNum}>Q{q.order_number ?? idx + 1}</div>
                        <div className={s.answerQText}>{q.question_text}</div>
                        <div className={s.answerMeta}>
                          <span className={s.answerTypePill}>
                            <Icon size={10} />{q.question_type.replace('_', ' ')}
                          </span>
                          <span className={s.answerPointsPill}>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Answer body */}
                      <div className={s.answerCardBody}>
                        {/* MCQ options display */}
                        {q.question_type === 'multiple_choice' && q.options && (
                          <div className={s.mcqOptions}>
                            {q.options.map(opt => {
                              const isStudentAnswer = ans.answer_text === opt.label
                              const isCorrectOpt    = q.correct_answer === opt.label
                              return (
                                <div
                                  key={opt.label}
                                  className={`${s.mcqOpt} ${
                                    isCorrectOpt && isStudentAnswer ? s.mcqOptCorrect :
                                    isStudentAnswer && !isCorrectOpt ? s.mcqOptWrong :
                                    isCorrectOpt && !isStudentAnswer ? s.mcqOptCorrectUnchosen : ''
                                  }`}
                                >
                                  <span className={s.mcqOptLabel}>{opt.label}</span>
                                  <span>{opt.text}</span>
                                  {isStudentAnswer && <span className={s.mcqOptTag}>Student</span>}
                                  {isCorrectOpt && !isStudentAnswer && <span className={s.mcqOptTagCorrect}>Correct</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* True/False */}
                        {q.question_type === 'true_false' && (
                          <div className={s.tfAnswerRow}>
                            <span className={s.tfAnswerLabel}>Student answered:</span>
                            <span className={`${s.tfAnswerValue} ${
                              ans.answer_text === q.correct_answer ? s.tfCorrect : s.tfWrong
                            }`}>
                              {ans.answer_text
                                ? ans.answer_text.charAt(0).toUpperCase() + ans.answer_text.slice(1)
                                : '—'}
                            </span>
                            {ans.answer_text !== q.correct_answer && (
                              <>
                                <span className={s.tfAnswerLabel}>&nbsp;· Correct:</span>
                                <span className={s.tfCorrect}>
                                  {q.correct_answer
                                    ? q.correct_answer.charAt(0).toUpperCase() + q.correct_answer.slice(1)
                                    : '—'}
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Text answers (short_answer, essay, fill_blank) */}
                        {['short_answer','essay','fill_blank'].includes(q.question_type) && (
                          <div className={s.textAnswer}>
                            <p className={s.textAnswerLabel}>Student&apos;s Answer:</p>
                            <div className={s.textAnswerBox}>
                              {ans.answer_text || <span className={s.na}>No answer provided</span>}
                            </div>
                            {q.correct_answer && q.question_type === 'fill_blank' && (
                              <p className={s.textAnswerExpected}>Expected: <strong>{q.correct_answer}</strong></p>
                            )}
                          </div>
                        )}

                        {/* Status pill */}
                        <div className={s.answerStatusRow}>
                          {isPending ? (
                            <span className={s.pendingPill}>
                              <MinusCircle size={11} /> Needs Manual Review
                            </span>
                          ) : isCorrect ? (
                            <span className={s.correctPill}>
                              <ThumbsUp size={11} /> Correct · {ans.points_earned ?? q.points} pts
                            </span>
                          ) : isWrong ? (
                            <span className={s.wrongPill}>
                              <ThumbsDown size={11} /> Incorrect · 0 pts
                            </span>
                          ) : null}

                          {/* Explanation */}
                          {q.explanation && (
                            <span className={s.explanationPill} title={q.explanation}>
                              💡 Explanation available
                            </span>
                          )}
                        </div>

                        {/* Explanation box */}
                        {q.explanation && (
                          <div className={s.explanationBox}>{q.explanation}</div>
                        )}

                        {/* Faculty feedback */}
                        {ans.feedback && (
                          <div className={s.feedbackBox}>
                            <strong>Faculty feedback:</strong> {ans.feedback}
                          </div>
                        )}

                        {/* FUTURE: Python AI grading placeholder */}
                        {(q.question_type === 'essay') && isPending && (
                          <div className={s.aiFuturePlaceholder}>
                            {/* FUTURE: sendToPythonService(ans.answer_text) */}
                            🤖 AI-assisted grading coming soon
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className={s.viewModalFooter}>
              <button className={s.btnSecondary} onClick={closeViewModal}>Close</button>
              {viewTarget.status === 'submitted' && (
                <Link
                  href={`/admin/exams/${examId}/submissions/${viewTarget.id}/grade`}
                  className={s.btnPrimary}
                >
                  <Pencil size={13} /> Grade Submission
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}