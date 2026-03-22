// app/(dashboard)/student/dashboard/DashboardClient.tsx
'use client'

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
import styles from './dashboard.module.css'

interface Stat {
  icon: React.ElementType
  label: string
  value: string
  color: string
  bg: string
  accent: string
}

interface QuickAction {
  href:  string
  icon:  React.ElementType
  label: string
  desc:  string
  color: string
  bg:    string
}

interface ProgressItem {
  label: string
  pct:   number
  color: string
}

interface Props {
  firstName:     string
  greeting:      string
  stats:         Stat[]
  quickActions:  QuickAction[]
  progressItems: ProgressItem[]
}

export default function DashboardClient({
  firstName, greeting, stats, quickActions, progressItems,
}: Props) {
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
        {stats.map(({ icon: Icon, label, value, color, bg, accent }) => (
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
              {quickActions.map(({ href, icon: Icon, label, desc, color, bg }) => (
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
            {progressItems.map(({ label, pct, color }) => (
              <div key={label} className={styles.progressItem}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressLabel}>{label}</span>
                  <span className={styles.progressPct}>{pct}%</span>
                </div>
                <div className={styles.progressTrack}>
                  {/* Animate width from 0 → pct on mount */}
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