// app/(dashboard)/student/dashboard/DashboardClient.tsx
'use client'

import { type FC, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ClipboardList, BookOpen, FileText, BarChart2,
  Trophy, Flame, ChevronRight, Clock, TrendingUp,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import {
  dashboardPage, section,
  statsGrid, statCard,
  quickGrid, quickItem,
  card, cardHover,
} from '@/animations/dashboard/dashboardAnimations'
import styles from '../student/dashboard/dashboard.module.css'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
interface LiveStats {
  examsTaken:   number   // submitted + graded
  pendingCount: number   // status === 'submitted' (awaiting faculty grading)
  gradedCount:  number   // status === 'graded' (faculty has graded)
  bestScore:    number | null  // from graded submissions only
  reviewersDone: number  // practice exam submissions
  streak:       number   // consecutive active days
}

interface RecentActivity {
  id:           string
  exam_title:   string
  exam_type:    'mock' | 'practice'
  submitted_at: string | null
  status:       string
  percentage:   number | null
  passed:       boolean | null
}

// ── Quick Actions ──────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { href: '/student/mock-exams',      icon: ClipboardList, label: 'Take a Mock Exam',  desc: 'Timed simulation',   color: '#1d4ed8', bg: '#eff6ff' },
  { href: '/student/reviews',         icon: BookOpen,      label: 'Start a Reviewer',  desc: 'Practice questions', color: '#047857', bg: '#ecfdf5' },
  { href: '/student/study-materials', icon: FileText,      label: 'Study Materials',   desc: 'Read & learn',       color: '#6d28d9', bg: '#f5f3ff' },
  { href: '/student/progress',        icon: TrendingUp,    label: 'View Progress',     desc: 'Track your growth',  color: '#b45309', bg: '#fffbeb' },
  { href: '/student/results',         icon: Trophy,        label: 'Past Results',      desc: 'See your scores',    color: '#be123c', bg: '#fff1f2' },
  { href: '/student/profile',         icon: BarChart2,     label: 'My Profile',        desc: 'Update your info',   color: '#0e7490', bg: '#ecfeff' },
] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0
  const daySet = new Set(dates.map((d) => d.slice(0, 10)))
  const sorted = Array.from(daySet).sort().reverse()
  const today  = new Date(); today.setHours(0, 0, 0, 0)
  let streak = 0; let cursor = new Date(today)
  for (const day of sorted) {
    const d = new Date(day); d.setHours(0, 0, 0, 0)
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86_400_000)
    if (diff === 0 || diff === 1) { streak++; cursor = d } else break
  }
  return streak
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  firstName: string
  greeting:  string
}

// ── Component ──────────────────────────────────────────────────────────────────

const DashboardClient: FC<Props> = ({ firstName, greeting }) => {
  const supabase = useMemo(() => createClient(), [])

  const [stats,          setStats]          = useState<LiveStats>({
    examsTaken: 0, pendingCount: 0, gradedCount: 0,
    bestScore: null, reviewersDone: 0, streak: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [progressPcts,   setProgressPcts]   = useState({ mock: 0, practice: 0 })
  const [loadingStats,   setLoadingStats]   = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingStats(false); return }

      // ✅ Only valid statuses: 'submitted' | 'graded'
      // 'in_progress' intentionally excluded — not yet submitted
      const { data: subs } = await supabase
        .from('submissions')
        .select('id, exam_id, status, percentage, passed, submitted_at')
        .eq('student_id', user.id)   // ← security: own data only
        .in('status', ['submitted', 'graded'])
        .order('submitted_at', { ascending: false })

      const rows = (subs ?? []) as {
        id:           string
        exam_id:      string | null
        status:       string
        percentage:   number | null
        passed:       boolean | null
        submitted_at: string | null
      }[]

      if (!rows.length) { setLoadingStats(false); return }

      // Exam metadata (title + type) — batch fetch
      const examIds = [...new Set(rows.map((r) => r.exam_id).filter(Boolean))] as string[]
      const { data: examRows } = await supabase
        .from('exams')
        .select('id, title, exam_type')
        .in('id', examIds)

      const examMap = new Map(
        (examRows ?? []).map((e: { id: string; title: string; exam_type: string }) => [e.id, e])
      )

      // ── Classify by type ──────────────────────────────────────────────────────
      const mockSubs     = rows.filter((r) => examMap.get(r.exam_id ?? '')?.exam_type === 'mock')
      const practiceSubs = rows.filter((r) => examMap.get(r.exam_id ?? '')?.exam_type === 'practice')

      // ── Classify by status ────────────────────────────────────────────────────
      // 'submitted' = awaiting faculty grading
      // 'graded'    = faculty has set score/percentage/passed
      const pendingCount = rows.filter((r) => r.status === 'submitted').length
      const gradedCount  = rows.filter((r) => r.status === 'graded').length

      // ✅ Best score: ONLY from 'graded' submissions (percentage is meaningful)
      // 'submitted' rows have null percentage — do not include
      const gradedScores = rows
        .filter((r) => r.status === 'graded' && r.percentage !== null)
        .map((r) => r.percentage as number)
      const best = gradedScores.length ? Math.round(Math.max(...gradedScores)) : null

      // Streak based on submitted_at across all terminal statuses
      const streak = computeStreak(
        rows.map((r) => r.submitted_at).filter((d): d is string => d !== null)
      )

      setStats({
        examsTaken:    rows.length,
        pendingCount,
        gradedCount,
        bestScore:     best,
        reviewersDone: practiceSubs.length,
        streak,
      })

      // Progress percentages
      const MOCK_TARGET     = 20
      const PRACTICE_TARGET = 30
      setProgressPcts({
        mock:     Math.min(Math.round((mockSubs.length / MOCK_TARGET) * 100), 100),
        practice: Math.min(Math.round((practiceSubs.length / PRACTICE_TARGET) * 100), 100),
      })

      // ✅ Recent activity — last 5
      // Score shown ONLY for 'graded' status; 'submitted' shows "Pending"
      const recent: RecentActivity[] = rows.slice(0, 5).map((r) => {
        const ex         = examMap.get(r.exam_id ?? '')
        const isGraded   = r.status === 'graded'
        return {
          id:           r.id,
          exam_title:   ex?.title ?? 'Unknown Exam',
          exam_type:    (ex?.exam_type ?? 'mock') as 'mock' | 'practice',
          submitted_at: r.submitted_at,
          status:       r.status,
          percentage:   isGraded && r.percentage !== null ? Math.round(r.percentage) : null,
          passed:       isGraded ? r.passed : null,
        }
      })

      setRecentActivity(recent)
      setLoadingStats(false)
    }

    void fetchStats()
  }, [supabase])

  // ── Stat strip ─────────────────────────────────────────────────────────────────
  const STATS = [
    {
      icon: ClipboardList, label: 'Exams Taken',
      value: loadingStats ? '…' : String(stats.examsTaken),
      color: '#2563a8', bg: '#dbeafe', accent: '#3b82f6',
    },
    {
      icon: Trophy, label: 'Best Score',
      // ✅ Shows '—' until at least one 'graded' submission with a percentage exists
      value: loadingStats ? '…' : (stats.bestScore !== null ? `${stats.bestScore}%` : '—'),
      color: '#92600a', bg: '#fef3c7', accent: '#f59e0b',
    },
    {
      icon: BookOpen, label: 'Reviewers Done',
      value: loadingStats ? '…' : String(stats.reviewersDone),
      color: '#15693a', bg: '#d1fae5', accent: '#10b981',
    },
    {
      icon: Flame, label: 'Day Streak',
      value: loadingStats ? '…' : String(stats.streak || 1),
      color: '#b91c1c', bg: '#fee2e2', accent: '#ef4444',
    },
  ]

  const PROGRESS_ITEMS = [
    { label: 'Mock Exams Completed', pct: progressPcts.mock,     color: '#3b82f6' },
    { label: 'Reviewers Finished',   pct: progressPcts.practice, color: '#10b981' },
    { label: 'Study Materials Read', pct: 0,                     color: '#8b5cf6' },
  ]

  return (
    <motion.div className={styles.page} {...dashboardPage}>

      {/* ── Header ── */}
      <motion.div
        {...section}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem' }}
      >
        <div className={styles.header}>
          <h1 className={styles.greeting}>{greeting}, {firstName} </h1>
          <p className={styles.subGreeting}>Here&apos;s your board exam prep summary for today.</p>
        </div>
        <motion.div {...cardHover}>
          <Link href="/student/mock-exams" className={styles.ctaBtn}>
            <ClipboardList size={15} strokeWidth={2.5} />
            Start an Exam
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Hero Banner ── */}
      <motion.div className={styles.heroBanner} {...section}>
        <div className={styles.heroText}>
          <div className={styles.heroEyebrow}>Board Exam Prep</div>
          <h2 className={styles.heroTitle}>Ready to ace your<br />Licensure Exam?</h2>
          <p className={styles.heroSub}>
            Take mock exams, practice with reviewers, and track your progress where it is all in one place.
          </p>
          <Link href="/student/mock-exams" className={styles.heroCta}>
            Browse Exams <ChevronRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
        <div className={styles.heroEmoji}></div>
      </motion.div>

      {/* ✅ Pending notice — only for 'submitted' (awaiting grading) */}
      {!loadingStats && stats.pendingCount > 0 && (
        <motion.div {...section} style={{
          background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10,
          padding: '0.8rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
        }}>
          <Clock size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', margin: '0 0 2px' }}>
              {stats.pendingCount} result{stats.pendingCount > 1 ? 's' : ''} pending faculty review
            </p>
            <p style={{ fontSize: '0.77rem', color: '#b45309', margin: 0 }}>
              Scores will appear once your faculty grades your submission.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Stats ── */}
      <motion.div className={styles.statsGrid} {...section} {...statsGrid}>
        {STATS.map(({ icon: Icon, label, value, color, bg, accent }) => (
          <motion.div
            key={label}
            className={styles.statCard}
            style={{ ['--card-accent' as string]: accent }}
            {...statCard}
            {...cardHover}
          >
            <div className={styles.statIconWrap} style={{ backgroundColor: bg }}>
              <Icon size={20} color={color} strokeWidth={2} />
            </div>
            <div>
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Main Grid ── */}
      <div className={styles.mainGrid}>

        {/* LEFT */}
        <div className={styles.leftCol}>

          {/* Quick Actions */}
          <motion.div className={styles.card} {...card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Quick Actions</h2>
            </div>
            <motion.div className={styles.quickGrid} {...quickGrid}>
              {QUICK_ACTIONS.map(({ href, icon: Icon, label, desc, color, bg }) => (
                <motion.div key={href} {...quickItem} {...cardHover}>
                  <Link href={href} className={styles.quickItem}>
                    <div className={styles.quickIconWrap} style={{ backgroundColor: bg }}>
                      <Icon size={17} color={color} strokeWidth={2} />
                    </div>
                    <div>
                      <div className={styles.quickLabel}>{label}</div>
                      <div className={styles.quickDesc}>{desc}</div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div className={styles.card} {...card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Activity</h2>
              <Link href="/student/results" className={styles.cardLink}>View all →</Link>
            </div>

            {loadingStats ? (
              <div style={{ padding: '1rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>Loading…</div>
            ) : recentActivity.length === 0 ? (
              <div className={styles.emptyState}>
                <ClipboardList size={36} strokeWidth={1.5} color="#cbd5e1" />
                <p className={styles.emptyTitle}>No activity yet</p>
                <p className={styles.emptyText}>Take your first exam or reviewer to get started.</p>
                <Link href="/student/mock-exams" className={styles.emptyBtn}>Browse Exams →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.65rem',
                      padding: '0.55rem 0.75rem', background: '#f8fafc',
                      borderRadius: 9, border: '1.5px solid #edf0f5',
                    }}
                  >
                    {/* ✅ Icon logic: graded = CheckCircle/AlertCircle, submitted = Clock */}
                    {item.status === 'graded'    && item.passed === true  && <CheckCircle2 size={15} color="#059669" />}
                    {item.status === 'graded'    && item.passed === false  && <AlertCircle  size={15} color="#dc2626" />}
                    {item.status === 'graded'    && item.passed === null   && <Clock         size={15} color="#7c3aed" />}
                    {item.status === 'submitted'                           && <Clock         size={15} color="#d97706" />}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.8rem', fontWeight: 600, color: '#0d2540', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.exam_title}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#7a8fa8', margin: 0 }}>
                        {item.exam_type === 'mock' ? 'Mock Exam' : 'Practice'} · {formatRelative(item.submitted_at)}
                      </p>
                    </div>

                    {/* ✅ Score only when graded. Submitted = "Pending" */}
                    {item.status === 'graded' && item.percentage !== null ? (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        color: item.percentage >= 75 ? '#059669' : '#dc2626',
                      }}>
                        {item.percentage}%
                      </span>
                    ) : item.status === 'submitted' ? (
                      <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>Pending</span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>—</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT */}
        <div className={styles.rightCol}>

          {/* Progress */}
          <motion.div className={styles.card} {...card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Progress Overview</h2>
              <Link href="/student/progress" className={styles.cardLink}>Details</Link>
            </div>
            {PROGRESS_ITEMS.map(({ label, pct, color }) => (
              <div key={label} className={styles.progressItem}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressLabel}>{label}</span>
                  <span className={styles.progressPct}>{pct}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <motion.div
                    className={styles.progressFill}
                    style={{ backgroundColor: color }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: [0.34, 1.1, 0.64, 1], delay: 0.3 }}
                  />
                </div>
              </div>
            ))}
            <Link href="/student/progress" className={styles.cardLink}
              style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: '0.75rem' }}>
              View detailed progress <ChevronRight size={13} />
            </Link>
          </motion.div>

          {/* Assigned */}
          <motion.div className={styles.card} {...card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Assigned to You</h2>
            </div>
            <div className={styles.assignedEmpty}>
              <Clock size={32} strokeWidth={1.5} color="#cbd5e1" />
              <p className={styles.assignedEmptyText}>No assignments yet</p>
            </div>
          </motion.div>

          {/* Tip */}
          <motion.div className={styles.tipCard} {...card}>
            <div className={styles.tipEyebrow}>Study Tip</div>
            <p className={styles.tipText}>
              Consistent daily practice beats last-minute cramming. Aim for at least one reviewer per day!
            </p>
            <Link href="/student/reviews" className={styles.tipBtn}>
              Start Reviewing →
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export default DashboardClient