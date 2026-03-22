// app/(dashboard)/student/dashboard/DashboardClient.tsx
'use client'

import type { FC } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ClipboardList, BookOpen, FileText, BarChart2,
  Trophy, Flame, ChevronRight, Clock, TrendingUp,
} from 'lucide-react'
import {
  dashboardPage, section,
  statsGrid,   statCard,
  quickGrid,   quickItem,
  card,        cardHover,
} from '@/animations/dashboard/dashboardAnimations'
import styles from '../student/dashboard/dashboard.module.css'

// ── Static data lives here (client component) so icons never cross the server boundary ──

const STATS = [
  { icon: ClipboardList, label: 'Exams Taken',    value: '0', color: '#2563a8', bg: '#dbeafe', accent: '#3b82f6' },
  { icon: Trophy,        label: 'Best Score',     value: '—', color: '#92600a', bg: '#fef3c7', accent: '#f59e0b' },
  { icon: BookOpen,      label: 'Reviewers Done', value: '0', color: '#15693a', bg: '#d1fae5', accent: '#10b981' },
  { icon: Flame,         label: 'Day Streak',     value: '1', color: '#b91c1c', bg: '#fee2e2', accent: '#ef4444' },
] as const

const QUICK_ACTIONS = [
  { href: '/student/mock-exams',      icon: ClipboardList, label: 'Take a Mock Exam',  desc: 'Timed simulation',   color: '#1d4ed8', bg: '#eff6ff' },
  { href: '/student/reviewers',       icon: BookOpen,      label: 'Start a Reviewer',  desc: 'Practice questions', color: '#047857', bg: '#ecfdf5' },
  { href: '/student/study-materials', icon: FileText,      label: 'Study Materials',   desc: 'Read & learn',       color: '#6d28d9', bg: '#f5f3ff' },
  { href: '/student/progress',        icon: TrendingUp,    label: 'View Progress',     desc: 'Track your growth',  color: '#b45309', bg: '#fffbeb' },
  { href: '/student/results',         icon: Trophy,        label: 'Past Results',      desc: 'See your scores',    color: '#be123c', bg: '#fff1f2' },
  { href: '/student/profile',         icon: BarChart2,     label: 'My Profile',        desc: 'Update your info',   color: '#0e7490', bg: '#ecfeff' },
] as const

const PROGRESS_ITEMS = [
  { label: 'Mock Exams Completed', pct: 0, color: '#3b82f6' },
  { label: 'Reviewers Finished',   pct: 0, color: '#10b981' },
  { label: 'Study Materials Read', pct: 0, color: '#8b5cf6' },
] as const

// ── Only simple primitives cross the server → client boundary ──

interface Props {
  firstName: string
  greeting:  string
}

const DashboardClient: FC<Props> = ({ firstName, greeting }) => {
  return (
    <motion.div className={styles.page} {...dashboardPage}>

      {/* ── HEADER ROW ── */}
      <motion.div
        {...section}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem' }}
      >
        <div className={styles.header}>
          <h1 className={styles.greeting}>{greeting}, {firstName} 👋</h1>
          <p className={styles.subGreeting}>Here&apos;s your board exam prep summary for today.</p>
        </div>
        <motion.div {...cardHover}>
          <Link href="/student/mock-exams" className={styles.ctaBtn}>
            <ClipboardList size={15} strokeWidth={2.5} />
            Start an Exam
          </Link>
        </motion.div>
      </motion.div>

      {/* ── HERO BANNER ── */}
      <motion.div className={styles.heroBanner} {...section}>
        <div className={styles.heroText}>
          <div className={styles.heroEyebrow}>📋 Board Exam Prep</div>
          <h2 className={styles.heroTitle}>Ready to ace your<br />PRC licensure exam?</h2>
          <p className={styles.heroSub}>
            Take mock exams, practice with reviewers, and track your progress — all in one place.
          </p>
          <Link href="/student/mock-exams" className={styles.heroCta}>
            Browse Exams <ChevronRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
        <div className={styles.heroEmoji}>🎓</div>
      </motion.div>

      {/* ── STATS ── */}
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

      {/* ── MAIN GRID ── */}
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
            <div className={styles.emptyState}>
              <ClipboardList size={36} strokeWidth={1.5} color="#cbd5e1" />
              <p className={styles.emptyTitle}>No activity yet</p>
              <p className={styles.emptyText}>Take your first exam or reviewer to get started.</p>
              <Link href="/student/mock-exams" className={styles.emptyBtn}>
                Browse Exams →
              </Link>
            </div>
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
            <div className={styles.tipEyebrow}>💡 Study Tip</div>
            <p className={styles.tipText}>
              Consistent daily practice beats last-minute cramming. Aim for at least one reviewer per day!
            </p>
            <Link href="/student/reviewers" className={styles.tipBtn}>
              Start Reviewing →
            </Link>
          </motion.div>

        </div>
      </div>

    </motion.div>
  )
}

export default DashboardClient