// lib/hooks/student/mock-exams/useMockExamSession.ts

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@/lib/context/AuthContext'
import {
  fetchExamById,
  fetchQuestions,
  checkSubmittedExam,
  fetchOrCreateSubmission,
  fetchSavedAnswers,
  saveAnswer as dbSaveAnswer,
  submitExam as dbSubmitExam,
  fetchExamAttempts,
  createNewSubmission,
} from '@/lib/services/student/mock-exams/mockExams.service'
import { TIMER_WARNING, TIMER_CRITICAL, MAX_TAB_VIOLATIONS } from '@/lib/constants/student/mock-exams/mock-exams'
import type {
  ExamMeta, Question, AnswerMap, StateMap, QState, ExamAttempt,
} from '@/lib/types/student/mock-exams/mock-exams'

type SaveStatus = 'idle' | 'saving' | 'saved'

export interface ExamSessionState {
  // loading / error
  loading:          boolean
  error:            string | null
  // exam data
  exam:             ExamMeta | null
  questions:        Question[]
  // submission
  submissionId:     string | null
  // navigation
  current:          number
  setCurrent:       (i: number) => void
  // answers + state
  answers:          AnswerMap
  qStates:          StateMap
  handleAnswer:     (qId: string, value: string) => void
  handleSkip:       () => void
  handleFlag:       () => void
  jumpToUnanswered: () => void
  // timer
  timeLeft:         number
  timerWarning:     boolean
  timerCritical:    boolean
  // modals
  showConfirm:      boolean
  setShowConfirm:   (v: boolean) => void
  showResume:       boolean
  confirmResume:    () => void
  confirmRestart:   () => Promise<void>
  showAttemptHistory: boolean
  setShowAttemptHistory: (v: boolean) => void
  attempts:         ExamAttempt[]
  // submission
  submitted:        boolean
  submitting:       boolean
  doSubmit:         () => Promise<void>
  // auto-save
  saveStatus:       SaveStatus
  // anti-cheat
  tabViolations:    number
  // stats
  answeredCount:    number
  skippedCount:     number
  unansweredCount:  number
}

export function useMockExamSession(examId: string): ExamSessionState {
  const { user, loading: authLoading } = useUser()

  // ── Data ──────────────────────────────────────────────────────────────────
  const [exam,          setExam]          = useState<ExamMeta | null>(null)
  const [questions,     setQuestions]     = useState<Question[]>([])
  const [submissionId,  setSubmissionId]  = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [submitted,     setSubmitted]     = useState(false)
  const [submitting,    setSubmitting]    = useState(false)

  // ── Interaction ───────────────────────────────────────────────────────────
  const [current,       setCurrent]       = useState(0)
  const [answers,       setAnswers]       = useState<AnswerMap>({})
  const [qStates,       setQStates]       = useState<StateMap>({})
  const [timeLeft,      setTimeLeft]      = useState(0)
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [showResume,    setShowResume]    = useState(false)
  const [showAttemptHistory, setShowAttemptHistory] = useState(false)
  const [attempts,      setAttempts]      = useState<ExamAttempt[]>([])
  const [saveStatus,    setSaveStatus]    = useState<SaveStatus>('idle')
  const [tabViolations, setTabViolations] = useState(0)

  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef   = useRef<string | null>(null)
  const submittingRef  = useRef(false)
  const answersRef     = useRef<AnswerMap>({})
  const questionsRef   = useRef<Question[]>([])
  const submissionRef  = useRef<string | null>(null)
  const examRef        = useRef<ExamMeta | null>(null)
  const violationsRef  = useRef(0)

  useEffect(() => { submittingRef.current = submitting   }, [submitting])
  useEffect(() => { answersRef.current    = answers      }, [answers])
  useEffect(() => { questionsRef.current  = questions    }, [questions])
  useEffect(() => { submissionRef.current = submissionId }, [submissionId])
  useEffect(() => { examRef.current       = exam         }, [exam])

  // ── Submit (stable ref, no deps changing) ────────────────────────────────
  const doSubmit = useCallback(async () => {
    const sid = submissionRef.current
    const ex  = examRef.current
    const qs  = questionsRef.current
    const ans = answersRef.current
    if (!sid || !ex || submittingRef.current) return

    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      await dbSubmitExam(sid, startedAtRef.current ?? new Date().toISOString(), ans, qs)
      setSubmitted(true)
    } catch {
      // still mark submitted client-side to avoid loops
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }, [])

  // ── Load exam + handle resume/submitted ────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) { setError('Not authenticated.'); setLoading(false); return }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // STRICT: block if already submitted
        const existingSubmittedId = await checkSubmittedExam(user!.id, examId)
        if (existingSubmittedId) {
          if (!cancelled) { setSubmitted(true); setLoading(false) }
          return
        }

        const [examRow, qs, attemptsData] = await Promise.all([
          fetchExamById(examId),
          fetchQuestions(examId),
          fetchExamAttempts(user!.id, examId),
        ])

        if (cancelled) return

        setAttempts(attemptsData)

        const { submissionId: subId, startedAt, isResume } = await fetchOrCreateSubmission(
          user!.id, examId,
        )

        startedAtRef.current = startedAt

        if (isResume) {
          // Load saved answers first, then show resume modal
          const savedAns = await fetchSavedAnswers(subId)
          const ra: AnswerMap = {}
          const rs: StateMap  = {}
          for (const a of savedAns) {
            ra[a.question_id] = a.answer_text
            rs[a.question_id] = 'answered'
          }
          if (!cancelled) {
            setAnswers(ra)
            setQStates(rs)
            setShowResume(true)
          }
        }

        if (!cancelled) {
          setExam(examRow as ExamMeta)
          setQuestions(qs)
          setSubmissionId(subId)

          const totalSecs = (examRow as ExamMeta).duration_minutes * 60
          const elapsed   = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
          setTimeLeft(Math.max(0, totalSecs - elapsed))
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load exam.')
          setLoading(false)
        }
      }
    }

    void load()
    return () => { cancelled = true }
  }, [authLoading, user?.id, examId])

  // ── Resume handlers ────────────────────────────────────────────────────────
  const confirmResume = useCallback(() => {
    setShowResume(false)
  }, [])

  const confirmRestart = useCallback(async () => {
    if (!user) return
    setShowResume(false)
    setLoading(true)
    try {
      const { submissionId: newSid, startedAt: newStart } =
        await createNewSubmission(user.id, examId)
      startedAtRef.current = newStart
      setSubmissionId(newSid)
      setAnswers({})
      setQStates({})
      setCurrent(0)

      const examRow = examRef.current
      if (examRow) {
        setTimeLeft(examRow.duration_minutes * 60)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restart.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, examId])

  // ── Timer countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!exam || submitted || loading || showResume || timeLeft <= 0) return

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
  }, [exam, submitted, loading, showResume, doSubmit])

  // ── Anti-cheat: tab visibility ─────────────────────────────────────────────
  useEffect(() => {
    if (submitted || loading) return

    function handleVisibility() {
      if (document.hidden) {
        const newCount = violationsRef.current + 1
        violationsRef.current = newCount
        setTabViolations(newCount)

        if (newCount >= MAX_TAB_VIOLATIONS) {
          void doSubmit()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [submitted, loading, doSubmit])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (submitted || loading || showConfirm || showResume) return

    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft')  setCurrent((c) => Math.max(0, c - 1))
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(questionsRef.current.length - 1, c + 1))
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [submitted, loading, showConfirm, showResume])

  // ── Auto-save answer ───────────────────────────────────────────────────────
  const handleAnswer = useCallback((qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
    setQStates((prev) => {
      const cur     = prev[qId]
      const flagged = cur === 'flagged' || cur === 'flagged-answered'
      return { ...prev, [qId]: flagged ? 'flagged-answered' : 'answered' }
    })

    setSaveStatus('saving')
    const sid = submissionRef.current
    if (sid) {
      void dbSaveAnswer(sid, qId, value).then(() => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      })
    }
  }, [])

  const handleSkip = useCallback(() => {
    const q = questionsRef.current[current]
    if (!q) return
    setQStates((prev) => {
      const cur = prev[q.id]
      if (cur === 'answered' || cur === 'flagged-answered') return prev
      return { ...prev, [q.id]: 'skipped' }
    })
    if (current < questionsRef.current.length - 1) setCurrent((c) => c + 1)
  }, [current])

  const handleFlag = useCallback(() => {
    const q   = questionsRef.current[current]
    const ans = answersRef.current
    if (!q) return
    setQStates((prev) => {
      const cur       = prev[q.id]
      const hasAnswer = !!ans[q.id]
      if (cur === 'flagged')          return { ...prev, [q.id]: hasAnswer ? 'answered' : 'unanswered' }
      if (cur === 'flagged-answered') return { ...prev, [q.id]: 'answered' }
      if (cur === 'answered')         return { ...prev, [q.id]: 'flagged-answered' }
      return { ...prev, [q.id]: 'flagged' }
    })
  }, [current])

  const jumpToUnanswered = useCallback(() => {
    const qs  = questionsRef.current
    const ans = answersRef.current
    const idx = qs.findIndex((q) => {
      const state = qStates[q.id]
      return !ans[q.id] && state !== 'skipped' && state !== 'answered' && state !== 'flagged-answered'
    })
    if (idx !== -1) setCurrent(idx)
  }, [qStates])

  // ── Derived ────────────────────────────────────────────────────────────────
  const answeredCount = questions.filter(
    (item) => answers[item.id] || ['answered', 'flagged-answered'].includes(qStates[item.id] ?? ''),
  ).length
  const skippedCount    = Object.values(qStates).filter((s) => s === 'skipped').length
  const unansweredCount = Math.max(0, questions.length - answeredCount - skippedCount)

  return {
    loading,
    error,
    exam,
    questions,
    submissionId,
    current,
    setCurrent,
    answers,
    qStates,
    handleAnswer,
    handleSkip,
    handleFlag,
    jumpToUnanswered,
    timeLeft,
    timerWarning:  timeLeft <= TIMER_WARNING && timeLeft > TIMER_CRITICAL && timeLeft > 0,
    timerCritical: timeLeft <= TIMER_CRITICAL && timeLeft > 0,
    showConfirm,
    setShowConfirm,
    showResume,
    confirmResume,
    confirmRestart,
    showAttemptHistory,
    setShowAttemptHistory,
    attempts,
    submitted,
    submitting,
    doSubmit,
    saveStatus,
    tabViolations,
    answeredCount,
    skippedCount,
    unansweredCount,
  }
}