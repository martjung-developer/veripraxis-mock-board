// app/(pages)/roadmap/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Circle, Clock, Lightbulb,
  Tag, Cpu, BookOpen, Layers, Puzzle,
  ArrowRight, Filter,
} from 'lucide-react'
import { heroContainer, heroItem } from '@/animations/presets/publicPage'
import {
  boardContainer, column, columnItems, itemCard, voteCta,
} from '@/animations/roadmap/roadmapAnimations'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import styles from './roadmap.module.css'

type Status = 'done' | 'progress' | 'planned' | 'idea'
type Tag    = 'core' | 'content' | 'ux' | 'integ'

interface RoadmapItem {
  title: string
  desc:  string
  tag:   Tag
  meta?: string
}

const STATUS_CONFIG: Record<Status, {
  icon:        React.ElementType
  label:       string
  color:       string
  bg:          string
  border:      string
  nodeColor:   string
}> = {
  done:     { icon: CheckCircle2, label: 'Shipped',     color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', nodeColor: '#22c55e' },
  progress: { icon: Clock,        label: 'In Progress', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', nodeColor: '#3b82f6' },
  planned:  { icon: Circle,       label: 'Planned',     color: '#92400e', bg: '#fffbeb', border: '#fde68a', nodeColor: '#f59e0b' },
  idea:     { icon: Lightbulb,    label: 'Considering', color: '#6b21a8', bg: '#faf5ff', border: '#e9d5ff', nodeColor: '#a855f7' },
}

const TAG_CONFIG: Record<Tag, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  core:    { icon: Layers,   label: 'Core',        color: '#1d4ed8', bg: '#eff6ff' },
  content: { icon: BookOpen, label: 'Content',     color: '#15803d', bg: '#f0fdf4' },
  ux:      { icon: Cpu,      label: 'UX',          color: '#92400e', bg: '#fffbeb' },
  integ:   { icon: Puzzle,   label: 'Integration', color: '#6b21a8', bg: '#faf5ff' },
}

const ITEMS: Record<Status, RoadmapItem[]> = {
  done: [
    { title: 'Mock Exam Engine',            desc: 'Full PRC-format timed exams with automatic scoring and item analysis.',               tag: 'core',    meta: 'Q1 2024' },
    { title: 'Performance Dashboard',       desc: 'Charts showing score trends, weak areas, and improvement over time.',                 tag: 'ux',      meta: 'Q2 2024' },
    { title: 'Nursing (NLE) Question Bank', desc: '3,000+ validated nursing questions across all major subject areas.',                  tag: 'content', meta: 'Q3 2024' },
    { title: 'Pro Subscription',            desc: 'Unlimited exams, full analytics, and downloadable study materials.',                  tag: 'core',    meta: 'Q4 2024' },
  ],
  progress: [
    { title: 'Engineering (ECE/EE) Bank',   desc: 'Expanding our technical programs with 2,000+ ECE and EE practice questions.',        tag: 'content', meta: 'Q2 2025' },
    { title: 'Adaptive Exam Mode',          desc: 'Dynamically adjusts question difficulty based on your performance in real time.',     tag: 'core',    meta: 'Q2 2025' },
    { title: 'Mobile App (iOS & Android)',  desc: 'Native app for offline exam practice and push notifications for study reminders.',    tag: 'ux',      meta: 'Q3 2025' },
  ],
  planned: [
    { title: 'Accountancy (CPA) Bank',      desc: 'Full CPA subject coverage: FAR, AFAR, MAS, Tax, Audit, and RegLaw.',                 tag: 'content', meta: 'Q3 2025' },
    { title: 'Group Study Rooms',           desc: 'Real-time collaborative exam sessions with leaderboards for barkadas.',               tag: 'ux',      meta: 'Q4 2025' },
    { title: 'AI Answer Explanations',      desc: 'Instant AI-generated rationale for every answer choice — powered by Claude.',        tag: 'integ',   meta: 'Q4 2025' },
    { title: 'Review Center Partnerships',  desc: 'Allow accredited review centers to distribute VeriPraxis to their students.',        tag: 'core',    meta: '2026'    },
  ],
  idea: [
    { title: 'Spaced Repetition System',    desc: 'Flashcard-based review that uses forgetting curves to resurface weak items.',         tag: 'core'  },
    { title: 'PRC Exam Schedule Tracker',   desc: 'Personalized countdown and registration deadline reminders per program.',             tag: 'integ' },
    { title: 'Video Lecture Integrations',  desc: 'Link short video explanations to question topics from partner educators.',           tag: 'content' },
  ],
}

const STATUS_ORDER: Status[] = ['done', 'progress', 'planned', 'idea']

const FILTER_ALL = 'All'
type FilterOption = typeof FILTER_ALL | Status

export default function RoadmapPage() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>(FILTER_ALL)

  const visibleStatuses = activeFilter === FILTER_ALL
    ? STATUS_ORDER
    : [activeFilter as Status]

  return (
    <>
      <Navbar />

      <main className={styles.page}>

        {/* ── HERO ── */}
        <section className={styles.hero}>
          <div className={styles.heroBg}>
            <Image
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=80"
              alt="Team working on product"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
            <div className={styles.heroBgOverlay} />
          </div>

          <div className={styles.heroInner}>
            <motion.div {...heroContainer} className={styles.heroContent}>
              <motion.span {...heroItem} className={styles.heroBadge}>
                Product Roadmap
              </motion.span>
              <motion.h1 {...heroItem} className={styles.heroTitle}>
                What we&#39;re building{' '}
                <span className={styles.heroAccent}>next</span>
              </motion.h1>
              <motion.p {...heroItem} className={styles.heroSub}>
                A transparent look at what&#39;s shipped, in progress, and coming —
                updated every quarter.
              </motion.p>

              {/* Status legend */}
              <motion.div {...heroItem} className={styles.legend}>
                {STATUS_ORDER.map((s) => {
                  const cfg = STATUS_CONFIG[s]
                  return (
                    <div key={s} className={styles.legendItem}>
                      <div
                        className={styles.legendDot}
                        style={{ background: cfg.nodeColor }}
                      />
                      {cfg.label}
                    </div>
                  )
                })}
              </motion.div>
            </motion.div>

            {/* Floating stats */}
            <motion.div
              className={styles.heroStats}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.55 }}
            >
              {[
                { value: `${ITEMS.done.length}`,     label: 'Shipped' },
                { value: `${ITEMS.progress.length}`, label: 'In Progress' },
                { value: `${ITEMS.planned.length}`,  label: 'Planned' },
              ].map((s) => (
                <div key={s.label} className={styles.heroStat}>
                  <span className={styles.heroStatValue}>{s.value}</span>
                  <span className={styles.heroStatLabel}>{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── FILTER BAR ── */}
        <div className={styles.filterSection}>
          <div className={styles.filterInner}>
            <div className={styles.filterLabel}>
              <Filter size={13} strokeWidth={2} />
              Filter by status
            </div>
            <div className={styles.filterRow}>
              <button
                className={`${styles.filterBtn} ${activeFilter === FILTER_ALL ? styles.filterBtnActive : ''}`}
                onClick={() => setActiveFilter(FILTER_ALL)}
              >
                All
              </button>
              {STATUS_ORDER.map((s) => {
                const cfg = STATUS_CONFIG[s]
                return (
                  <button
                    key={s}
                    className={`${styles.filterBtn} ${activeFilter === s ? styles.filterBtnActive : ''}`}
                    style={activeFilter === s ? {
                      background: cfg.bg,
                      borderColor: cfg.border,
                      color: cfg.color,
                    } : {}}
                    onClick={() => setActiveFilter(activeFilter === s ? FILTER_ALL : s)}
                  >
                    <div
                      className={styles.filterDot}
                      style={{ background: cfg.nodeColor }}
                    />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── TIMELINE ── */}
        <div className={styles.timelineWrapper}>
          <div className={styles.timelineInner}>
            {/* Vertical line */}
            <div className={styles.timelineLine} />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                {...boardContainer}
                className={styles.timelineGroups}
              >
                {visibleStatuses.map((statusId) => {
                  const cfg   = STATUS_CONFIG[statusId]
                  const items = ITEMS[statusId]
                  const Icon  = cfg.icon

                  return (
                    <motion.div
                      key={statusId}
                      className={styles.timelineGroup}
                      {...column}
                    >
                      {/* Group header node */}
                      <div className={styles.groupHeader}>
                        <div
                          className={styles.groupNode}
                          style={{ background: cfg.nodeColor, boxShadow: `0 0 0 4px ${cfg.bg}, 0 0 0 7px ${cfg.border}` }}
                        >
                          <Icon size={14} strokeWidth={2.5} color="#fff" />
                        </div>
                        <div className={styles.groupMeta}>
                          <span
                            className={styles.groupLabel}
                            style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
                          >
                            {cfg.label}
                          </span>
                          <span className={styles.groupCount}>
                            {items.length} item{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Cards */}
                      <motion.div className={styles.groupCards} {...columnItems}>
                        {items.map((item) => {
                          const tagCfg  = TAG_CONFIG[item.tag]
                          const TagIcon = tagCfg.icon
                          return (
                            <motion.div
                              key={item.title}
                              className={styles.card}
                              style={{ borderLeftColor: cfg.nodeColor }}
                              {...itemCard}
                            >
                              <div className={styles.cardTop}>
                                <div className={styles.cardTitle}>{item.title}</div>
                                <div
                                  className={styles.cardTag}
                                  style={{ color: tagCfg.color, background: tagCfg.bg }}
                                >
                                  <TagIcon size={11} strokeWidth={2} />
                                  {tagCfg.label}
                                </div>
                              </div>
                              <p className={styles.cardDesc}>{item.desc}</p>
                              {item.meta && (
                                <div className={styles.cardMeta}>
                                  <div
                                    className={styles.cardMetaDot}
                                    style={{ background: cfg.nodeColor }}
                                  />
                                  {item.meta}
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── VOTE CTA ── */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaBg}>
            <Image
              src="https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1400&q=80"
              alt="University campus"
              fill
              style={{ objectFit: 'cover' }}
            />
            <div className={styles.ctaBgOverlay} />
          </div>
          <motion.div className={styles.ctaInner} {...voteCta}>
            <h2 className={styles.ctaTitle}>Have a feature idea?</h2>
            <p className={styles.ctaSub}>
              We build what our reviewees actually need. Vote on features or
              suggest your own — we read every request.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className={styles.btnPrimary}>
                Submit a Feature Request
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link href="/register" className={styles.btnGhost}>
                Start Reviewing Free
              </Link>
            </div>
          </motion.div>
        </section>

      </main>

      <Footer />
    </>
  )
}