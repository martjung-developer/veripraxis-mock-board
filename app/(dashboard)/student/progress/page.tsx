// app/(dashboard)/student/progress/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText, TrendingUp, Trophy, Flame, Clock, CheckCircle2,
  BookOpen, Star, Zap, Award, Target, BarChart2, Lock,
  AlertTriangle, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './progress.module.css'


const STAT_CARD_STAGGER = 0.055

function staggeredFadeUp(index: number): React.CSSProperties {
  return { animationDelay: `${index * STAT_CARD_STAGGER}s`, animationFillMode: 'both' }
}

function animatedBarDuration(pct: number): string {
  const base  = 0.7
  const extra = Math.min(pct / 100, 1) * 0.5
  return `${(base + extra).toFixed(2)}s cubic-bezier(0.16, 1, 0.3, 1)`
}

function achieveDelay(index: number): string {
  return `${index * 0.04}s`
}

function buildAnimatedCounters(averageScore: number, passRate: number) {
  return {
    animatedAverageScore: Math.round(averageScore * 10) / 10,
    animatedPassRate:     Math.round(passRate),
    counterDurationMs:    900 + Math.min(averageScore, 100) * 4,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Types ─────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

type FilterRange = '7d' | '30d' | 'all'

// All possible submission statuses stored in the DB
type SubmissionStatus = 'in_progress' | 'submitted' | 'graded' | 'released'

interface RecentExamItem {
  id:          string
  title:       string
  category:    string | null
  submittedAt: string | null
  score:       number | null   // only populated for 'released' status
  passed:      boolean | null  // only populated for 'released' status
  status:      SubmissionStatus
}

interface TimelinePoint  { date: string; score: number }
interface CategoryAvg    { label: string; score: number }

interface ProgressMetrics {
  examsTaken:          number  // all terminal submissions (submitted+graded+released)
  averageScore:        number  // from released only
  highestScore:        number  // from released only
  highestScoreTitle:   string
  passRate:            number  // from released only
  studyStreakDays:     number  // from all submitted_at dates
  totalStudyHours:     number  // from all time_spent_seconds
  totalPassed:         number  // from released
  totalFailed:         number  // from released
  pendingCount:        number  // submitted + graded (not yet released)
  scoreTimeline:       TimelinePoint[]
  categoryAverages:    CategoryAvg[]
  recentItems:         RecentExamItem[]
  hasData:             boolean
  animatedAverageScore: number
  animatedPassRate:     number
  counterDurationMs:   number
}

// Raw row shapes coming from Supabase
interface RawSubmission {
  id:                 string
  exam_id:            string | null
  submitted_at:       string | null
  time_spent_seconds: number | null
  status:             SubmissionStatus
  percentage:         number | null
  passed:             boolean | null
  created_at:         string
}
interface RawExam     { id: string; title: string; category_id: string | null }
interface RawCategory { id: string; name:  string }

// ─────────────────────────────────────────────────────────────────────────────
// ── Pure helpers ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function computeStreak(submissions: RawSubmission[]): number {
  if (!submissions.length) return 0
  // Use submitted_at or created_at to track active days
  const daySet = new Set<string>()
  for (const s of submissions) daySet.add((s.submitted_at ?? s.created_at).slice(0, 10))
  const days   = Array.from(daySet).sort().reverse()
  const today  = new Date(); today.setHours(0, 0, 0, 0)
  let streak = 0; let cursor = new Date(today)
  for (const day of days) {
    const d = new Date(day); d.setHours(0, 0, 0, 0)
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86_400_000)
    if (diff === 0 || diff === 1) { streak++; cursor = d } else break
  }
  return streak
}

function buildTimeline(submissions: RawSubmission[]): TimelinePoint[] {
  // Only plot points for released submissions (score is confirmed)
  return submissions
    .filter((s) => s.status === 'released' && s.percentage !== null && s.submitted_at !== null)
    .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime())
    .map((s) => ({ date: s.submitted_at!.slice(0, 10), score: Math.round(s.percentage!) }))
}

function buildCategoryAverages(
  submissions: RawSubmission[],
  examCategoryMap: Map<string, string>,
): CategoryAvg[] {
  const buckets = new Map<string, number[]>()
  // Only use released scores for category averages
  for (const s of submissions) {
    if (!s.exam_id || s.percentage === null || s.status !== 'released') continue
    const cat    = examCategoryMap.get(s.exam_id) ?? 'Other'
    const bucket = buckets.get(cat) ?? []
    bucket.push(s.percentage)
    buckets.set(cat, bucket)
  }
  return Array.from(buckets.entries())
    .map(([label, scores]) => ({
      label,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.score - a.score)
}

function sliceTimeline(timeline: TimelinePoint[], range: FilterRange): TimelinePoint[] {
  if (range === 'all' || timeline.length === 0) return timeline
  const days   = range === '7d' ? 7 : 30
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days)
  const filtered = timeline.filter((p) => new Date(p.date) >= cutoff)
  return filtered.length > 0 ? filtered : timeline.slice(-Math.min(days, timeline.length))
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Achievement definitions ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function buildAchievements(m: ProgressMetrics) {
  return [
    { Icon: Target,    iconColor: '#3b82f6', iconBg: '#eff6ff', name: 'First Exam',    desc: 'Completed your first mock exam',   earned: m.examsTaken >= 1         },
    { Icon: Flame,     iconColor: '#ef4444', iconBg: '#fef2f2', name: '7-Day Streak',  desc: 'Studied 7 consecutive days',       earned: m.studyStreakDays >= 7     },
    { Icon: Star,      iconColor: '#f59e0b', iconBg: '#fffbeb', name: 'Perfect Score', desc: 'Scored 100% on any exam',          earned: m.highestScore >= 100      },
    { Icon: Trophy,    iconColor: '#f59e0b', iconBg: '#fffbeb', name: 'High Achiever', desc: 'Average score above 85%',          earned: m.averageScore >= 85       },
    { Icon: BookOpen,  iconColor: '#8b5cf6', iconBg: '#f5f3ff', name: 'Dedicated',     desc: 'Studied more than 10 hours total', earned: m.totalStudyHours >= 10   },
    { Icon: Zap,       iconColor: '#10b981', iconBg: '#f0fdf4', name: 'On a Roll',     desc: 'Passed 5 or more exams',           earned: m.totalPassed >= 5        },
    { Icon: Award,     iconColor: '#3b82f6', iconBg: '#eff6ff', name: 'Consistent',    desc: 'Taken 10 or more exams',           earned: m.examsTaken >= 10        },
    { Icon: BarChart2, iconColor: '#10b981', iconBg: '#f0fdf4', name: 'Ready to Pass', desc: 'Pass rate above 70%',              earned: m.passRate >= 70          },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SVG Line Chart ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function LineChart({ data }: { data: TimelinePoint[] }) {
  const W = 520; const H = 155
  const P = { top: 18, right: 12, bottom: 26, left: 30 }

  if (data.length < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
        Not enough data for this range yet.
      </div>
    )
  }

  const scores    = data.map((d) => d.score)
  const minV      = Math.min(...scores) - 8
  const maxV      = Math.max(...scores) + 8
  const xFn       = (i: number) => P.left + (i / (data.length - 1)) * (W - P.left - P.right)
  const yFn       = (v: number) => P.top + ((maxV - v) / (maxV - minV)) * (H - P.top - P.bottom)
  const polyPts   = data.map((d, i) => `${xFn(i)},${yFn(d.score)}`).join(' ')
  const areaClose = `${xFn(data.length - 1)},${H - P.bottom} ${xFn(0)},${H - P.bottom}`
  const gridVals  = [60, 70, 80, 90]
  const showIdx   = data.length <= 8
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 3), Math.floor(2 * (data.length - 1) / 3), data.length - 1]
  const fmtDate   = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.lineSvg} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
        </linearGradient>
      </defs>
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={P.left} x2={W - P.right} y1={yFn(v)} y2={yFn(v)} stroke="#f1f5f9" strokeWidth="1" />
          <text x={P.left - 5} y={yFn(v) + 4} fill="#94a3b8" fontSize="9" textAnchor="end">{v}</text>
        </g>
      ))}
      {showIdx.map((i) => (
        <text key={i} x={xFn(i)} y={H - P.bottom + 14} fill="#94a3b8" fontSize="9" textAnchor="middle">
          {fmtDate(data[i].date)}
        </text>
      ))}
      <polygon points={`${polyPts} ${areaClose}`} fill="url(#lineArea)" />
      <polyline points={polyPts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        return (
          <g key={i}>
            <circle cx={xFn(i)} cy={yFn(d.score)} r={isLast ? 5 : 3}
              fill={isLast ? '#3b82f6' : '#fff'} stroke="#3b82f6" strokeWidth="2" />
            {isLast && (
              <text x={xFn(i)} y={yFn(d.score) - 9} fill="#3b82f6" fontSize="10" fontWeight="700" textAnchor="middle">
                {d.score}%
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SVG Donut Chart ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface DonutSlice { label: string; pct: number; color: string }

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const R = 42; const CX = 56; const CY = 56; const CIRC = 2 * Math.PI * R
  const arcs = slices.reduce((acc, s, i) => {
    const cumPct = slices.slice(0, i).reduce((sum, sl) => sum + sl.pct, 0)
    acc.push({ ...s, dash: (s.pct / 100) * CIRC, offset: CIRC - cumPct * (CIRC / 100) })
    return acc
  }, [] as Array<DonutSlice & { dash: number; offset: number }>)

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 112 112" className={styles.donutSvg}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        {arcs.map((a, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={a.color}
            strokeWidth="12"
            strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
            strokeDashoffset={a.offset}
            transform={`rotate(-90 ${CX} ${CY})`} />
        ))}
        <text x={CX} y={CY - 4}  textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="700">100%</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fill="#94a3b8" fontSize="7.5">of time</text>
      </svg>
      <div className={styles.donutLegend}>
        {slices.map((s) => (
          <div key={s.label} className={styles.legendRow}>
            <span className={styles.legendDot}  style={{ background: s.color }} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendPct}  >{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Skeleton ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.statCard} style={{ gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className={styles.skeleton} style={{ width: 40, height: 40, borderRadius: 10 }} />
        <div className={styles.skeleton} style={{ width: 44, height: 22, borderRadius: 99 }} />
      </div>
      <div className={styles.skeleton} style={{ width: '50%', height: 28 }} />
      <div className={styles.skeleton} style={{ width: '70%', height: 12 }} />
      <div className={styles.skeleton} style={{ width: '55%', height: 10 }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Status Badge ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status, passed }: { status: SubmissionStatus; passed: boolean | null }) {
  if (status === 'in_progress') {
    return (
      <span className={styles.badge} style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
        In Progress
      </span>
    )
  }
  if (status === 'submitted') {
    return (
      <span className={styles.badge} style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
        Submitted
      </span>
    )
  }
  if (status === 'graded') {
    return (
      <span className={styles.badge} style={{ background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' }}>
        Under Review
      </span>
    )
  }
  // released — show pass/fail
  if (passed === true)  return <span className={`${styles.badge} ${styles.badgePassed}`}>Passed</span>
  if (passed === false) return <span className={`${styles.badge} ${styles.badgeFailed}`}>Failed</span>
  return <span className={`${styles.badge}`} style={{ background: '#f0f5fa', color: '#64748b', border: '1px solid #e2e8f0' }}>Released</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Constants ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

const STUDY_DIST: DonutSlice[] = [
  { label: 'Mock Exams',      pct: 50, color: '#3b82f6' },
  { label: 'Practice Exams',  pct: 30, color: '#f59e0b' },
  { label: 'Study Materials', pct: 20, color: '#10b981' },
]

// ─────────────────────────────────────────────────────────────────────────────
// ── Page ───────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const supabase = useMemo(() => createClient(), [])

  const [metrics, setMetrics] = useState<ProgressMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [filter,  setFilter]  = useState<FilterRange>('30d')

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setError('Not authenticated.'); setLoading(false); return }

    const { data: studentRow, error: stuErr } = await supabase
      .from('students').select('id').eq('id', user.id).single()
    if (stuErr || !studentRow) { setError('Student record not found.'); setLoading(false); return }
    const studentId: string = (studentRow as { id: string }).id

    // ── Fetch ALL submissions across ALL statuses ──────────────────────────
    // in_progress : student started but hasn't submitted yet
    // submitted   : student submitted; awaiting faculty review
    // graded      : faculty graded internally (not yet released)
    // released    : faculty released; student can see score
    //
    // We fetch all so the progress page gives a full picture of activity.
    // Scores (percentage, passed) are only shown for 'released' items.
    const { data: subRows, error: subErr } = await supabase
      .from('submissions')
      .select('id, exam_id, submitted_at, time_spent_seconds, status, percentage, passed, created_at')
      .eq('student_id', studentId)
      .in('status', ['in_progress', 'submitted', 'graded', 'released'] as SubmissionStatus[])
      .order('submitted_at', { ascending: false })

    if (subErr) { setError('Could not load your submissions.'); setLoading(false); return }

    const submissions = (subRows ?? []) as RawSubmission[]

    // ── Empty path ─────────────────────────────────────────────────────────
    if (submissions.length === 0) {
      const ctrs = buildAnimatedCounters(0, 0)
      setMetrics({
        examsTaken: 0, averageScore: 0, highestScore: 0,
        highestScoreTitle: '—', passRate: 0, studyStreakDays: 0,
        totalStudyHours: 0, totalPassed: 0, totalFailed: 0,
        pendingCount: 0,
        scoreTimeline: [], categoryAverages: [], recentItems: [],
        hasData: false, ...ctrs,
      })
      setLoading(false); return
    }

    // 4. Exam + category metadata
    const examIds = [...new Set(submissions.map((s) => s.exam_id).filter((id): id is string => id !== null))]
    let exams:      RawExam[]     = []
    let categories: RawCategory[] = []

    if (examIds.length > 0) {
      const { data: examRows } = await supabase
        .from('exams').select('id, title, category_id').in('id', examIds)
      exams = (examRows ?? []) as RawExam[]

      const catIds = [...new Set(exams.map((e) => e.category_id).filter((id): id is string => id !== null))]
      if (catIds.length > 0) {
        const { data: catRows } = await supabase
          .from('exam_categories').select('id, name').in('id', catIds)
        categories = (catRows ?? []) as RawCategory[]
      }
    }

    const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]))
    const examMap         = new Map(exams.map((e) => [e.id, e]))
    const examCategoryMap = new Map<string, string>()
    for (const exam of exams) {
      examCategoryMap.set(
        exam.id,
        exam.category_id ? (categoryNameMap.get(exam.category_id) ?? 'Other') : 'Other',
      )
    }

    // ── Compute metrics ────────────────────────────────────────────────────
    // "examsTaken" = any terminal action (exclude in_progress)
    const terminalSubs = submissions.filter((s) => s.status !== 'in_progress')

    // Released submissions are the only ones with confirmed scores
    const releasedSubs = submissions.filter((s) => s.status === 'released')
    const withScore    = releasedSubs.filter((s) => s.percentage !== null)
    const passedSubs   = releasedSubs.filter((s) => s.passed === true)
    const failedSubs   = releasedSubs.filter((s) => s.passed === false)

    // Pending = submitted + graded (not yet visible to student)
    const pendingCount = submissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length

    const averageScore = withScore.length
      ? withScore.reduce((sum, s) => sum + s.percentage!, 0) / withScore.length : 0
    const highestScore = withScore.length
      ? Math.max(...withScore.map((s) => s.percentage!)) : 0
    const passRate     = releasedSubs.length
      ? (passedSubs.length / releasedSubs.length) * 100 : 0

    const highestSub = withScore.reduce<RawSubmission | null>(
      (best, s) => (!best || s.percentage! > best.percentage! ? s : best), null
    )
    const highestScoreTitle = highestSub?.exam_id
      ? (examMap.get(highestSub.exam_id)?.title ?? '—') : '—'

    // Total study time across ALL submissions (time spent is always recorded)
    const totalStudySecs = submissions.reduce((sum, s) => sum + (s.time_spent_seconds ?? 0), 0)

    // Streak: use all submission dates regardless of status
    const streakSource = submissions.filter(
      (s) => s.status !== 'in_progress' && (s.submitted_at ?? s.created_at)
    )

    // Recent items — last 5 terminal submissions
    const recentItems: RecentExamItem[] = terminalSubs.slice(0, 5).map((s) => {
      const exam = s.exam_id ? examMap.get(s.exam_id) : undefined
      const isReleased = s.status === 'released'
      return {
        id:          s.id,
        title:       exam?.title ?? 'Unknown Exam',
        category:    exam?.category_id ? (categoryNameMap.get(exam.category_id) ?? null) : null,
        submittedAt: s.submitted_at,
        // Only expose score when released
        score:       isReleased && s.percentage !== null ? Math.round(s.percentage) : null,
        passed:      isReleased ? s.passed : null,
        status:      s.status,
      }
    })

    const ctrs = buildAnimatedCounters(averageScore, passRate)

    setMetrics({
      examsTaken:          terminalSubs.length,
      averageScore:        Math.round(averageScore * 10) / 10,
      highestScore:        Math.round(highestScore * 10) / 10,
      highestScoreTitle,
      passRate:            Math.round(passRate * 10) / 10,
      studyStreakDays:     computeStreak(streakSource),
      totalStudyHours:     Math.round((totalStudySecs / 3600) * 10) / 10,
      totalPassed:         passedSubs.length,
      totalFailed:         failedSubs.length,
      pendingCount,
      scoreTimeline:       buildTimeline(submissions),
      categoryAverages:    buildCategoryAverages(submissions, examCategoryMap),
      recentItems,
      hasData:             true,
      ...ctrs,
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived ────────────────────────────────────────────────────────────────

  const visibleTimeline = useMemo(() =>
    metrics ? sliceTimeline(metrics.scoreTimeline, filter) : [], [metrics, filter])

  const achievements = useMemo(() =>
    metrics ? buildAchievements(metrics) : [], [metrics])

  const earnedCount = achievements.filter((a) => a.earned).length
  const isEmpty     = !loading && metrics && !metrics.hasData

  const statCards = useMemo(() => {
    if (!metrics) return []
    return [
      {
        Icon: FileText,     iconColor: '#3b82f6', iconBg: '#eff6ff',
        label: 'Exams Taken',   value: String(metrics.examsTaken),
        trend: metrics.examsTaken > 0 ? `${metrics.examsTaken} total` : '—',
        trendPositive: metrics.examsTaken > 0 ? true : null,
        sub: 'submitted or graded',
      },
      {
        Icon: TrendingUp,   iconColor: '#10b981', iconBg: '#f0fdf4',
        label: 'Average Score', value: metrics.averageScore > 0 ? `${metrics.averageScore}%` : '—',
        trend: metrics.averageScore >= 75 ? 'Good' : metrics.averageScore > 0 ? 'Needs work' : 'No releases yet',
        trendPositive: metrics.averageScore >= 75 ? true : metrics.averageScore > 0 ? false : null,
        sub: 'released exams only',
      },
      {
        Icon: Trophy,       iconColor: '#f59e0b', iconBg: '#fffbeb',
        label: 'Highest Score', value: metrics.highestScore > 0 ? `${metrics.highestScore}%` : '—',
        trend: '—', trendPositive: null as boolean | null,
        sub: metrics.highestScoreTitle,
      },
      {
        Icon: Flame,        iconColor: '#ef4444', iconBg: '#fef2f2',
        label: 'Study Streak',  value: `${metrics.studyStreakDays}d`,
        trend: metrics.studyStreakDays >= 7 ? '🔥 On fire' : 'Keep going',
        trendPositive: metrics.studyStreakDays >= 3 ? true : null,
        sub: 'consecutive days',
      },
      {
        Icon: Clock,        iconColor: '#8b5cf6', iconBg: '#f5f3ff',
        label: 'Study Time',    value: `${metrics.totalStudyHours}h`,
        trend: metrics.totalStudyHours > 0 ? `+${metrics.totalStudyHours}h` : '—',
        trendPositive: metrics.totalStudyHours > 0 ? true : null,
        sub: 'total across exams',
      },
      {
        Icon: CheckCircle2, iconColor: '#10b981', iconBg: '#f0fdf4',
        label: 'Pass Rate',     value: metrics.passRate > 0 ? `${metrics.passRate}%` : '—',
        trend: metrics.passRate >= 70 ? 'Great' : metrics.passRate >= 50 ? 'Fair' : metrics.passRate > 0 ? 'Low' : 'Pending',
        trendPositive: metrics.passRate >= 70 ? true : metrics.passRate >= 50 ? null : metrics.passRate > 0 ? false : null,
        sub: `${metrics.totalPassed} of ${metrics.examsTaken} passed`,
      },
    ]
  }, [metrics])

  const FILTER_OPTIONS: { label: string; value: FilterRange }[] = [
    { label: '7 Days',   value: '7d'  },
    { label: '30 Days',  value: '30d' },
    { label: 'All Time', value: 'all' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>My Progress</h1>
          <p className={styles.pageSubtitle}>Track your performance and improvement over time</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={styles.filterBtn}
            onClick={fetchData}
            disabled={loading}
            title="Refresh data"
            style={{ padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <div className={styles.filterGroup}>
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                className={`${styles.filterBtn} ${filter === f.value ? styles.filterBtnActive : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Pending notice ── */}
      {!loading && metrics && metrics.pendingCount > 0 && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #fde68a',
          borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '0.5rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}>
          <Clock size={15} color="#d97706" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0 }}>
            <strong>{metrics.pendingCount}</strong> submission{metrics.pendingCount > 1 ? 's' : ''} pending faculty review — scores will appear once released.
          </p>
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className={styles.emptyState}>
          <BarChart2 size={40} strokeWidth={1.4} color="#cbd5e1" />
          <p className={styles.emptyTitle}>No exam data yet</p>
          <p className={styles.emptyText}>
            Take your first mock exam and your progress will appear here.
          </p>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className={styles.statsGrid}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card, idx) => (
            <div key={card.label} className={styles.statCard} style={staggeredFadeUp(idx)}>
              <div className={styles.statTop}>
                <div className={styles.statIcon} style={{ background: card.iconBg }}>
                  <card.Icon size={18} color={card.iconColor} strokeWidth={2} />
                </div>
                {card.trendPositive === null
                  ? <span className={styles.trendNeutral}>{card.trend}</span>
                  : card.trendPositive
                    ? <span className={styles.trendUp}>{card.trend}</span>
                    : <span className={styles.trendDown}>{card.trend}</span>}
              </div>
              <div className={styles.statValue}>{card.value}</div>
              <div className={styles.statLabel}>{card.label}</div>
              <div className={styles.statSub}>{card.sub}</div>
            </div>
          ))}
      </div>

      {/* ── Line chart + Bar chart ── */}
      {!isEmpty && (
        <div className={styles.row2}>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Performance Over Time</span>
              <span className={styles.cardHint}>score % (released exams)</span>
            </div>
            <div className={styles.lineWrap}>
              {loading
                ? <div className={styles.skeleton} style={{ width: '100%', height: 155, borderRadius: 8 }} />
                : <LineChart data={visibleTimeline} />}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Scores by Subject</span>
              <span className={styles.cardHint}>avg %</span>
            </div>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={styles.skeleton} style={{ height: 24, borderRadius: 8, marginBottom: '0.85rem' }} />
                ))
              : metrics?.categoryAverages.length === 0
                ? <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>No subject data yet.</p>
                : (
                  <div className={styles.barList}>
                    {(metrics?.categoryAverages ?? []).map((item, idx) => (
                      <div key={item.label} className={styles.barRow}>
                        <div className={styles.barLabelWrap}>
                          <span className={styles.barDot} style={{ background: BAR_COLORS[idx % BAR_COLORS.length] }} />
                          <span className={styles.barLabel}>{item.label}</span>
                        </div>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{
                              width: `${item.score}%`,
                              background: BAR_COLORS[idx % BAR_COLORS.length],
                              transition: `width ${animatedBarDuration(item.score)}`,
                            }}
                          />
                        </div>
                        <span className={styles.barValue} style={{ color: BAR_COLORS[idx % BAR_COLORS.length] }}>
                          {item.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
          </div>

        </div>
      )}

      {/* ── Recent exams + Donut ── */}
      {!isEmpty && (
        <div className={styles.row2wide}>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Recent Exams</span>
              <span className={styles.cardHint}>last 5 attempts</span>
            </div>
            {loading
              ? <div className={styles.skeleton} style={{ height: 160, borderRadius: 8 }} />
              : metrics?.recentItems.length === 0
                ? <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No recent exams.</p>
                : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Exam</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(metrics?.recentItems ?? []).map((item) => (
                          <tr key={item.id}>
                            <td>
                              <p className={styles.examTitle}>{item.title}</p>
                              {item.category && <p className={styles.examCategory}>{item.category}</p>}
                            </td>
                            <td>
                              {/* Score only shown for released submissions */}
                              {item.score !== null
                                ? <span className={styles.scoreVal} style={{ color: item.score >= 75 ? '#10b981' : '#ef4444' }}>
                                    {item.score}<span className={styles.scoreTotal}>/100</span>
                                  </span>
                                : <span className={styles.scoreTotal}>—</span>}
                            </td>
                            <td>
                              <StatusBadge status={item.status} passed={item.passed} />
                            </td>
                            <td>
                              <span className={styles.examDate}>
                                {item.submittedAt
                                  ? new Date(item.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                                  : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Study Distribution</span>
            </div>
            {loading
              ? <div className={styles.skeleton} style={{ height: 120, borderRadius: 8 }} />
              : <DonutChart slices={STUDY_DIST} />}
          </div>

        </div>
      )}

      {/* ── Achievements ── */}
      {!isEmpty && (
        <div className={styles.card} style={{ marginTop: '1rem' }}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Achievements</span>
            <span className={styles.cardHint}>
              {loading ? '…' : `${earnedCount} of ${achievements.length} earned`}
            </span>
          </div>
          <div className={styles.achieveGrid}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.skeleton} style={{ height: 140, borderRadius: 13 }} />
                ))
              : achievements.map((a, i) => (
                <div
                  key={a.name}
                  className={`${styles.achieveCard} ${!a.earned ? styles.achieveLocked : ''}`}
                  style={{ animationDelay: achieveDelay(i), animationFillMode: 'both' }}
                >
                  <div className={styles.achieveIcon} style={{ background: a.iconBg }}>
                    {a.earned
                      ? <a.Icon size={20} color={a.iconColor} strokeWidth={2} />
                      : <Lock   size={16} color="#94a3b8"     strokeWidth={2} />}
                  </div>
                  <p className={styles.achieveName}>{a.name}</p>
                  <p className={styles.achieveDesc}>{a.desc}</p>
                  <span className={`${styles.achieveBadge} ${a.earned ? styles.badgePassed : styles.achieveBadgeLocked}`}>
                    {a.earned ? 'Earned' : 'Locked'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  )
}