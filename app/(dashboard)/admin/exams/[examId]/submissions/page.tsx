// app/(dashboard)/admin/exams/[examId]/submissions/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ClipboardList, ArrowLeft, Search, X, Eye,
  ChevronLeft, ChevronRight, Filter,
  CheckCircle, Clock, AlertCircle, RefreshCw,
  CheckSquare, ToggleLeft, AlignLeft, Hash, List,
  ThumbsUp, ThumbsDown, MinusCircle, Zap, Users,
  Send, Loader2, Settings, Pencil, Save, RotateCcw,
} from 'lucide-react'
import s from './submissions.module.css'
import { createClient } from '@/lib/supabase/client'
import type { QuestionType, QuestionOption } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────
type SubmissionStatus = 'in_progress' | 'submitted' | 'graded' | 'reviewed' | 'released'
type GradingMode = 'auto' | 'manual'

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

interface ExamInfo {
  passing_score: number
  total_points: number
  grading_mode: GradingMode
}

interface AnswerKeyEntry {
  question_id: string
  correct_answer: string | null
  question_text: string
  question_type: QuestionType
  order_number: number | null
}

interface AnswerDetail {
  id: string
  question_id: string
  answer_text: string | null
  is_correct: boolean | null
  points_earned: number | null
  feedback: string
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

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ElementType; color: string }> = {
  in_progress: { label: 'In Progress', icon: Clock,       color: 'amber'  },
  submitted:   { label: 'Submitted',   icon: CheckCircle, color: 'blue'   },
  graded:      { label: 'Graded',      icon: CheckCircle, color: 'teal'   },
  reviewed:    { label: 'Reviewed',    icon: CheckSquare, color: 'violet' },
  released:    { label: 'Released',    icon: Send,        color: 'green'  },
}

const TYPE_ICONS: Record<QuestionType, React.ElementType> = {
  multiple_choice: CheckSquare,
  true_false:      ToggleLeft,
  short_answer:    AlignLeft,
  essay:           AlignLeft,
  matching:        List,
  fill_blank:      Hash,
}

// Auto-graded question types
const AUTO_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']

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

// ── Core grading function ─────────────────────────────────────────────────────
// Compares student answer against correct answer for auto-grade types.
// Returns null is_correct for manual types — they need human review.
function gradeAnswer(
  answerText: string | null,
  correctAnswer: string | null,
  questionType: QuestionType,
  points: number,
): { is_correct: boolean | null; points_earned: number } {
  if (!AUTO_TYPES.includes(questionType)) {
    // FUTURE: sendToPythonService(answerText) for essay/short_answer AI grading
    return { is_correct: null, points_earned: 0 }
  }
  if (correctAnswer === null || answerText === null) {
    return { is_correct: false, points_earned: 0 }
  }
  const correct = answerText.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
  return { is_correct: correct, points_earned: correct ? points : 0 }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SubmissionsPage() {
  const { examId } = useParams<{ examId: string }>()
  const supabase = createClient()

  const [submissions,     setSubmissions]     = useState<Submission[]>([])
  const [examInfo,        setExamInfo]        = useState<ExamInfo | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState<SubmissionStatus | 'all'>('all')
  const [page,            setPage]            = useState(1)

  // Grading mode (persisted to exams.grading_mode)
  const [gradingMode,  setGradingMode]  = useState<GradingMode>('auto')
  const [savingMode,   setSavingMode]   = useState(false)

  // Manual answer key editor
  const [answerKey,        setAnswerKey]        = useState<AnswerKeyEntry[]>([])
  const [showAnswerKey,    setShowAnswerKey]     = useState(false)
  const [answerKeyLoading, setAnswerKeyLoading]  = useState(false)

  // Bulk grading state
  const [bulkGrading,  setBulkGrading]  = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  // Release state
  const [releasing, setReleasing] = useState(false)

  // View/grade modal
  const [viewTarget,        setViewTarget]        = useState<Submission | null>(null)
  const [answers,           setAnswers]            = useState<AnswerDetail[]>([])
  const [answersLoading,    setAnswersLoading]     = useState(false)
  const [gradingSubmission, setGradingSubmission]  = useState(false)

  // ── Fetch exam info ────────────────────────────────────────────────────────
  const fetchExamInfo = useCallback(async () => {
    const { data } = await supabase
      .from('exams')
      .select('passing_score, total_points, grading_mode')
      .eq('id', examId)
      .single()

    if (data) {
      const mode = (data.grading_mode as GradingMode | null) ?? 'auto'
      setExamInfo({ passing_score: data.passing_score, total_points: data.total_points, grading_mode: mode })
      setGradingMode(mode)
    }
  }, [examId, supabase])

  // ── Fetch submissions ──────────────────────────────────────────────────────
  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)

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

    if (fetchErr) { setError('Could not load submissions.'); setLoading(false); return }

    const rows = (data ?? []) as unknown as SubmissionRaw[]
    const validStatuses: SubmissionStatus[] = ['in_progress', 'submitted', 'graded', 'reviewed', 'released']

    const mapped: Submission[] = rows.map(row => {
      const profile = unwrap(row.profiles)
      const student = unwrap(row.students)
      const status: SubmissionStatus = validStatuses.includes(row.status as SubmissionStatus)
        ? (row.status as SubmissionStatus) : 'in_progress'
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
  }, [examId, supabase])

  useEffect(() => { fetchExamInfo(); fetchSubmissions() }, [fetchExamInfo, fetchSubmissions])

  // ── Load answer key from questions table ──────────────────────────────────
  const loadAnswerKey = useCallback(async () => {
    setAnswerKeyLoading(true)
    const { data } = await supabase
      .from('questions')
      .select('id, correct_answer, question_text, question_type, order_number')
      .eq('exam_id', examId)
      .order('order_number', { ascending: true, nullsFirst: false })

    if (data) {
      setAnswerKey(data.map(q => ({
        question_id:    q.id,
        correct_answer: q.correct_answer,
        question_text:  q.question_text,
        question_type:  q.question_type as QuestionType,
        order_number:   q.order_number,
      })))
    }
    setAnswerKeyLoading(false)
  }, [examId, supabase])

  // ── Toggle grading mode (persists to DB) ──────────────────────────────────
  // Requires: ALTER TABLE exams ADD COLUMN IF NOT EXISTS grading_mode text NOT NULL DEFAULT 'auto'
  //           CHECK (grading_mode IN ('auto','manual'));
  const handleModeChange = async (mode: GradingMode) => {
    setSavingMode(true)
    setGradingMode(mode)
    await supabase
      .from('exams')
      .update({ grading_mode: mode } as Record<string, unknown>)
      .eq('id', examId)

    if (mode === 'manual' && answerKey.length === 0) {
      await loadAnswerKey()
      setShowAnswerKey(true)
    }
    setSavingMode(false)
  }

  // ── Open view/grade modal ─────────────────────────────────────────────────
  const openViewModal = async (sub: Submission) => {
    setViewTarget(sub)
    setAnswers([])
    setAnswersLoading(true)

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
        feedback:      row.feedback ?? '',
        question: row.questions ? {
          question_text:  row.questions.question_text,
          question_type:  row.questions.question_type as QuestionType,
          points:         row.questions.points,
          options:        (row.questions.options as QuestionOption[]) ?? null,
          correct_answer: row.questions.correct_answer,
          explanation:    row.questions.explanation,
          order_number:   row.questions.order_number,
        } : null,
      }))
      mapped.sort((a, b) => (a.question?.order_number ?? 999) - (b.question?.order_number ?? 999))
      setAnswers(mapped)
    }
    setAnswersLoading(false)
  }

  const closeViewModal = () => { setViewTarget(null); setAnswers([]) }

  // ── Manual answer override controls (in modal) ────────────────────────────
  const handleAnswerCorrectToggle = (answerId: string, isCorrect: boolean) => {
    setAnswers(prev => prev.map(a => {
      if (a.id !== answerId) return a
      return { ...a, is_correct: isCorrect, points_earned: isCorrect ? (a.question?.points ?? 0) : 0 }
    }))
  }

  const handlePointsChange = (answerId: string, pts: number) => {
    setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, points_earned: pts } : a))
  }

  const handleFeedbackChange = (answerId: string, fb: string) => {
    setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, feedback: fb } : a))
  }

  // ── Grade single submission (from modal) ──────────────────────────────────
  const gradeSubmission = async () => {
    if (!viewTarget || !examInfo) return
    setGradingSubmission(true)

    // Build effective answer key map
    const keyMap: Record<string, string | null> = {}
    if (gradingMode === 'manual') {
      for (const e of answerKey) keyMap[e.question_id] = e.correct_answer
    }

    // Resolve grades for each answer
    const gradedAnswers = answers.map(ans => {
      if (!ans.question) return ans
      // If already manually set in modal, use those values
      // For auto types that are still null, compute now
      if (ans.is_correct === null && AUTO_TYPES.includes(ans.question.question_type)) {
        const key = gradingMode === 'manual'
          ? (keyMap[ans.question_id] ?? ans.question.correct_answer)
          : ans.question.correct_answer
        const { is_correct, points_earned } = gradeAnswer(
          ans.answer_text, key, ans.question.question_type, ans.question.points
        )
        return { ...ans, is_correct, points_earned }
      }
      return ans
    })

    const totalEarned = gradedAnswers.reduce((sum, a) => sum + (a.points_earned ?? 0), 0)
    const percentage  = examInfo.total_points > 0
      ? parseFloat(((totalEarned / examInfo.total_points) * 100).toFixed(2)) : 0
    const passed = percentage >= examInfo.passing_score

    // Persist answers
    for (const a of gradedAnswers) {
      await supabase.from('answers').update({
        is_correct:    a.is_correct,
        points_earned: a.points_earned,
        feedback:      a.feedback || null,
      }).eq('id', a.id)
    }

    // Persist submission
    await supabase.from('submissions').update({
      score: totalEarned, percentage, passed, status: 'reviewed',
    }).eq('id', viewTarget.id)

    setSubmissions(prev => prev.map(s =>
      s.id === viewTarget.id
        ? { ...s, score: totalEarned, percentage, passed, status: 'reviewed' }
        : s
    ))
    setAnswers(gradedAnswers)
    setGradingSubmission(false)
    closeViewModal()
  }

  // ── Bulk grade all gradeable submissions ──────────────────────────────────
  const bulkGradeAll = async () => {
    if (!examInfo) return
    setBulkGrading(true)

    const gradeable = submissions.filter(s => ['submitted', 'graded'].includes(s.status))
    setBulkProgress({ done: 0, total: gradeable.length })

    if (gradeable.length === 0) { setBulkGrading(false); setBulkProgress(null); return }

    // Build effective key map for manual mode
    const keyMap: Record<string, string | null> = {}
    if (gradingMode === 'manual') {
      for (const e of answerKey) keyMap[e.question_id] = e.correct_answer
    }

    for (let i = 0; i < gradeable.length; i++) {
      const sub = gradeable[i]

      type BulkAnsRaw = {
        id: string
        question_id: string | null
        answer_text: string | null
        questions: { question_type: string; points: number; correct_answer: string | null } | null
      }

      const { data: ansData } = await supabase
        .from('answers')
        .select('id, question_id, answer_text, questions:question_id ( question_type, points, correct_answer )')
        .eq('submission_id', sub.id)

      if (!ansData) { setBulkProgress({ done: i + 1, total: gradeable.length }); continue }

      let totalEarned = 0
      for (const row of ansData as unknown as BulkAnsRaw[]) {
        const q    = row.questions
        if (!q)  continue
        const key  = gradingMode === 'manual'
          ? (keyMap[row.question_id ?? ''] ?? q.correct_answer)
          : q.correct_answer
        const { is_correct, points_earned } = gradeAnswer(
          row.answer_text, key, q.question_type as QuestionType, q.points
        )
        totalEarned += points_earned
        await supabase.from('answers').update({ is_correct, points_earned }).eq('id', row.id)
      }

      const percentage = examInfo.total_points > 0
        ? parseFloat(((totalEarned / examInfo.total_points) * 100).toFixed(2)) : 0
      const passed = percentage >= examInfo.passing_score

      await supabase.from('submissions').update({
        score: totalEarned, percentage, passed, status: 'reviewed',
      }).eq('id', sub.id)

      setSubmissions(prev => prev.map(s =>
        s.id === sub.id ? { ...s, score: totalEarned, percentage, passed, status: 'reviewed' } : s
      ))
      setBulkProgress({ done: i + 1, total: gradeable.length })
    }

    setBulkGrading(false)
    setBulkProgress(null)
  }

  // ── Release results ───────────────────────────────────────────────────────
  // Requires: ALTER TABLE submissions ADD COLUMN IF NOT EXISTS released_at timestamptz;
  const releaseResults = async () => {
    setReleasing(true)
    const reviewed = submissions.filter(s => s.status === 'reviewed')
    const now = new Date().toISOString()

    for (const sub of reviewed) {
      await supabase.from('submissions')
        .update({ status: 'released', released_at: now } as Record<string, unknown>)
        .eq('id', sub.id)
    }

    setSubmissions(prev => prev.map(s =>
      s.status === 'reviewed' ? { ...s, status: 'released' } : s
    ))
    setReleasing(false)
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => submissions.filter(sub => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || sub.student.full_name.toLowerCase().includes(q)
      || sub.student.email.toLowerCase().includes(q)
      || (sub.student.student_id ?? '').toLowerCase().includes(q)
    return matchSearch && (statusFilter === 'all' || sub.status === statusFilter)
  }), [submissions, search, statusFilter])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const initials       = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const reviewedCount  = submissions.filter(s => s.status === 'reviewed').length
  const gradeableCount = submissions.filter(s => ['submitted', 'graded'].includes(s.status)).length

  const answerStats = useMemo(() => ({
    correct:   answers.filter(a => a.is_correct === true).length,
    incorrect: answers.filter(a => a.is_correct === false).length,
    pending:   answers.filter(a => a.is_correct === null).length,
    total:     answers.length,
  }), [answers])

  const previewScore = useMemo(() => {
    if (!examInfo || answers.length === 0) return null
    const earned = answers.reduce((sum, a) => sum + (a.points_earned ?? 0), 0)
    const pct    = examInfo.total_points > 0 ? (earned / examInfo.total_points) * 100 : 0
    return { earned, pct, passed: pct >= examInfo.passing_score }
  }, [answers, examInfo])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><ClipboardList size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Submissions</h1>
              <p className={s.headingSub}>{submissions.length} total · Grading &amp; Release</p>
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

      {/* ══ Grading Control Panel ══ */}
      <div className={s.gradingPanel}>
        <div className={s.gradingPanelLeft}>

          {/* Mode toggle */}
          <div className={s.modeBlock}>
            <span className={s.modeLabel}><Settings size={12} /> Mode</span>
            <div className={s.modeToggle}>
              <button
                className={`${s.modeBtn} ${gradingMode === 'auto' ? s.modeBtnActive : ''}`}
                onClick={() => handleModeChange('auto')}
                disabled={savingMode}
              >
                <Zap size={12} /> Auto
              </button>
              <button
                className={`${s.modeBtn} ${gradingMode === 'manual' ? s.modeBtnActiveManual : ''}`}
                onClick={() => handleModeChange('manual')}
                disabled={savingMode}
              >
                <Pencil size={12} /> Manual
              </button>
            </div>
            <span className={s.modeHint}>
              {gradingMode === 'auto' ? 'Uses stored correct answers' : 'Faculty overrides answer key'}
            </span>
          </div>

          {/* Answer key editor toggle */}
          {gradingMode === 'manual' && (
            <button
              className={s.answerKeyToggle}
              onClick={async () => {
                if (answerKey.length === 0) await loadAnswerKey()
                setShowAnswerKey(v => !v)
              }}
              disabled={answerKeyLoading}
            >
              {answerKeyLoading
                ? <Loader2 size={12} className={s.spinner} />
                : <Pencil size={12} />}
              {showAnswerKey ? 'Hide' : 'Edit'} Answer Key
            </button>
          )}
        </div>

        <div className={s.gradingPanelRight}>
          {/* Bulk grade */}
          <button
            className={s.btnGrade}
            onClick={bulkGradeAll}
            disabled={bulkGrading || gradeableCount === 0}
            title={gradeableCount === 0 ? 'No gradeable submissions' : `Grade ${gradeableCount} submissions`}
          >
            {bulkGrading
              ? <><Loader2 size={13} className={s.spinner} /> {bulkProgress?.done}/{bulkProgress?.total}</>
              : <><Users size={13} /> Grade All ({gradeableCount})</>}
          </button>

          {/* Release */}
          <button
            className={s.btnRelease}
            onClick={releaseResults}
            disabled={releasing || reviewedCount === 0}
            title={reviewedCount === 0 ? 'No reviewed submissions to release' : `Release ${reviewedCount} results`}
          >
            {releasing
              ? <><Loader2 size={13} className={s.spinner} /> Releasing…</>
              : <><Send size={13} /> Release ({reviewedCount})</>}
          </button>
        </div>
      </div>

      {/* Manual Answer Key Panel */}
      {gradingMode === 'manual' && showAnswerKey && answerKey.length > 0 && (
        <div className={s.answerKeyPanel}>
          <div className={s.answerKeyHeader}>
            <span className={s.answerKeyTitle}><Pencil size={12} /> Manual Answer Key</span>
            <span className={s.answerKeyHint}>Overrides stored answers for grading. Leave blank to use original.</span>
            <button className={s.answerKeyResetBtn} onClick={loadAnswerKey} title="Reset to stored answers">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <div className={s.answerKeyGrid}>
            {answerKey.map((entry, i) => (
              <div key={entry.question_id} className={s.answerKeyRow}>
                <span className={s.answerKeyQNum}>Q{entry.order_number ?? i + 1}</span>
                <span className={s.answerKeyQText}>{entry.question_text.slice(0, 60)}{entry.question_text.length > 60 ? '…' : ''}</span>
                <input
                  className={s.answerKeyInput}
                  value={entry.correct_answer ?? ''}
                  placeholder="e.g. A, true, answer…"
                  onChange={e => setAnswerKey(prev => prev.map(k =>
                    k.question_id === entry.question_id
                      ? { ...k, correct_answer: e.target.value || null }
                      : k
                  ))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status pills */}
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
      </div>

      {/* Filters */}
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
          <select className={s.filterSelect} value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as SubmissionStatus | 'all'); setPage(1) }}>
            <option value="all">All Status</option>
            {(Object.entries(STATUS_CONFIG) as [SubmissionStatus, typeof STATUS_CONFIG[SubmissionStatus]][]).map(([k, v]) =>
              <option key={k} value={k}>{v.label}</option>
            )}
          </select>
        </div>
        <p className={s.resultCount}><strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Submitted</th>
                <th>Time</th>
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
                    {[70, 90, 60, 80, 50].map((w, j) => <td key={j}><div className={`${s.skeleton} ${s.skelText}`} style={{ width: w }} /></td>)}
                    <td><div className={s.skelActions}><div className={`${s.skeleton} ${s.skelBtn}`} /></div></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><ClipboardList size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No submissions found</p>
                    <p className={s.emptySub}>Submissions appear once students begin the exam.</p>
                  </div>
                </td></tr>
              ) : paginated.map(sub => {
                const cfg      = STATUS_CONFIG[sub.status]
                const canGrade = ['submitted', 'graded', 'reviewed'].includes(sub.status)
                return (
                  <tr key={sub.id} className={`${s.tableRow} ${sub.status === 'released' ? s.tableRowReleased : ''}`}>
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
                          className={canGrade ? s.actionGrade : s.actionView}
                          title={canGrade ? 'View & Grade' : 'View'}
                          onClick={() => openViewModal(sub)}
                        >
                          {canGrade ? <Pencil size={13} /> : <Eye size={13} />}
                        </button>
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
          VIEW / GRADE MODAL
      ══════════════════════════════════════════ */}
      {viewTarget && (
        <div className={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeViewModal() }}>
          <div className={s.viewModal}>

            {/* Modal header */}
            <div className={s.viewModalHeader}>
              <div className={s.viewModalStudentInfo}>
                <div className={s.viewModalAvatar}>{initials(viewTarget.student.full_name)}</div>
                <div>
                  <h2 className={s.viewModalName}>{viewTarget.student.full_name}</h2>
                  <p className={s.viewModalMeta}>
                    {viewTarget.student.email}
                    {viewTarget.student.student_id && <> · ID: {viewTarget.student.student_id}</>}
                    {viewTarget.submitted_at && <> · {fmtDate(viewTarget.submitted_at)}</>}
                  </p>
                </div>
              </div>
              <div className={s.viewModalHeaderRight}>
                {previewScore !== null && (
                  <div className={`${s.previewScore} ${previewScore.passed ? s.previewScorePass : s.previewScoreFail}`}>
                    {previewScore.pct.toFixed(1)}% · {previewScore.passed ? 'PASS' : 'FAIL'}
                  </div>
                )}
                <span className={`${s.statusBadge} ${s[`statusBadge_${STATUS_CONFIG[viewTarget.status].color}`]}`}>
                  {STATUS_CONFIG[viewTarget.status].label}
                </span>
                <button className={s.modalClose} onClick={closeViewModal}><X size={16} /></button>
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
              ) : answers.map((ans, idx) => {
                const q = ans.question
                if (!q) return null

                const Icon        = TYPE_ICONS[q.question_type]
                const isManual    = !AUTO_TYPES.includes(q.question_type)
                const isPending   = ans.is_correct === null
                const isCorrect   = ans.is_correct === true
                const isWrong     = ans.is_correct === false
                const canOverride = ['submitted', 'graded', 'reviewed'].includes(viewTarget.status)

                // Resolve the effective correct answer for display
                const effectiveCorrect = gradingMode === 'manual'
                  ? (answerKey.find(k => k.question_id === ans.question_id)?.correct_answer ?? q.correct_answer)
                  : q.correct_answer

                return (
                  <div key={ans.id} className={`${s.answerCard} ${
                    isPending ? s.answerPending :
                    isCorrect ? s.answerCorrect :
                    isWrong   ? s.answerWrong   : ''
                  }`}>
                    {/* Q header */}
                    <div className={s.answerCardHeader}>
                      <div className={s.answerQNum}>Q{q.order_number ?? idx + 1}</div>
                      <div className={s.answerQText}>{q.question_text}</div>
                      <div className={s.answerMeta}>
                        <span className={s.answerTypePill}><Icon size={10} />{q.question_type.replace(/_/g, ' ')}</span>
                        <span className={s.answerPointsPill}>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className={s.answerCardBody}>
                      {/* MCQ */}
                      {q.question_type === 'multiple_choice' && q.options && (
                        <div className={s.mcqOptions}>
                          {q.options.map(opt => {
                            const isStudentAns = ans.answer_text === opt.label
                            const isCorrectOpt = effectiveCorrect === opt.label
                            return (
                              <div key={opt.label} className={`${s.mcqOpt} ${
                                isCorrectOpt && isStudentAns ? s.mcqOptCorrect :
                                isStudentAns && !isCorrectOpt ? s.mcqOptWrong :
                                isCorrectOpt && !isStudentAns ? s.mcqOptCorrectUnchosen : ''
                              }`}>
                                <span className={s.mcqOptLabel}>{opt.label}</span>
                                <span>{opt.text}</span>
                                {isStudentAns && <span className={s.mcqOptTag}>Student</span>}
                                {isCorrectOpt && !isStudentAns && <span className={s.mcqOptTagCorrect}>Correct</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* T/F */}
                      {q.question_type === 'true_false' && (
                        <div className={s.tfAnswerRow}>
                          <span className={s.tfAnswerLabel}>Student:</span>
                          <span className={`${s.tfAnswerValue} ${ans.answer_text === effectiveCorrect ? s.tfCorrect : s.tfWrong}`}>
                            {ans.answer_text ? ans.answer_text.charAt(0).toUpperCase() + ans.answer_text.slice(1) : '—'}
                          </span>
                          {ans.answer_text !== effectiveCorrect && <>
                            <span className={s.tfAnswerLabel}>&nbsp;· Correct:</span>
                            <span className={s.tfCorrect}>
                              {effectiveCorrect ? effectiveCorrect.charAt(0).toUpperCase() + effectiveCorrect.slice(1) : '—'}
                            </span>
                          </>}
                        </div>
                      )}

                      {/* Text types */}
                      {['short_answer', 'essay', 'fill_blank'].includes(q.question_type) && (
                        <div className={s.textAnswer}>
                          <p className={s.textAnswerLabel}>Student&apos;s Answer:</p>
                          <div className={s.textAnswerBox}>
                            {ans.answer_text || <span className={s.na}>No answer provided</span>}
                          </div>
                          {effectiveCorrect && q.question_type === 'fill_blank' && (
                            <p className={s.textAnswerExpected}>Expected: <strong>{effectiveCorrect}</strong></p>
                          )}
                        </div>
                      )}

                      {/* Manual grading controls */}
                      {canOverride && (isManual || gradingMode === 'manual') && (
                        <div className={s.manualGradeRow}>
                          <span className={s.manualGradeLabel}>Mark:</span>
                          <button
                            className={`${s.markBtn} ${isCorrect ? s.markBtnCorrect : ''}`}
                            onClick={() => handleAnswerCorrectToggle(ans.id, true)}
                          ><ThumbsUp size={11} /> Correct</button>
                          <button
                            className={`${s.markBtn} ${isWrong ? s.markBtnWrong : ''}`}
                            onClick={() => handleAnswerCorrectToggle(ans.id, false)}
                          ><ThumbsDown size={11} /> Wrong</button>
                          <div className={s.pointsControl}>
                            <input
                              type="number"
                              className={s.pointsInput}
                              min={0}
                              max={q.points}
                              value={ans.points_earned ?? 0}
                              onChange={e => handlePointsChange(ans.id, Number(e.target.value))}
                            />
                            <span className={s.pointsMax}>/ {q.points} pts</span>
                          </div>
                        </div>
                      )}

                      {/* Status pill row */}
                      <div className={s.answerStatusRow}>
                        {isPending
                          ? <span className={s.pendingPill}><MinusCircle size={11} /> Pending Review</span>
                          : isCorrect
                          ? <span className={s.correctPill}><ThumbsUp size={11} /> Correct · {ans.points_earned ?? q.points} pts</span>
                          : <span className={s.wrongPill}><ThumbsDown size={11} /> Incorrect · 0 pts</span>}
                        {q.explanation && (
                          <span className={s.explanationPill}>💡 Has explanation</span>
                        )}
                      </div>

                      {q.explanation && <div className={s.explanationBox}>{q.explanation}</div>}

                      {/* Feedback input */}
                      {canOverride && (
                        <input
                          className={s.feedbackInput}
                          placeholder="Feedback for this answer (optional)…"
                          value={ans.feedback}
                          onChange={e => handleFeedbackChange(ans.id, e.target.value)}
                        />
                      )}
                      {ans.feedback && !canOverride && (
                        <div className={s.feedbackBox}><strong>Feedback:</strong> {ans.feedback}</div>
                      )}

                      {/* AI placeholder for essays */}
                      {q.question_type === 'essay' && isPending && (
                        <div className={s.aiFuturePlaceholder}>
                          {/* FUTURE: sendToPythonService(ans.answer_text) */}
                          🤖 AI-assisted grading coming soon
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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
                <button className={s.btnSecondary} onClick={closeViewModal} disabled={gradingSubmission}>Close</button>
                {['submitted', 'graded', 'reviewed'].includes(viewTarget.status) && (
                  <button className={s.btnGrade} onClick={gradeSubmission} disabled={gradingSubmission}>
                    {gradingSubmission
                      ? <><Loader2 size={13} className={s.spinner} /> Saving…</>
                      : <><Save size={13} /> Save &amp; Mark Reviewed</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}