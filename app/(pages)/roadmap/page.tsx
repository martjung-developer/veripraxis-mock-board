// src/app/roadmap/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { heroContainer, heroItem } from '@/animations/presets/publicPage'

import {
  boardContainer,
  column,
  columnItems,
  itemCard,
  voteCta,
} from '@/animations/roadmap/roadmapAnimations'
import PageShell from '@/components/layout/PageShell'
import styles from './roadmap.module.css'

type Status = 'done' | 'progress' | 'planned' | 'idea'
type Tag    = 'core' | 'content' | 'ux' | 'integ'

interface RoadmapItem {
  title: string
  desc:  string
  tag:   Tag
  meta?: string
}

const COLUMNS: { id: Status; label: string; headerClass: string; titleClass: string }[] = [
  { id: 'done',     label: '✅ Shipped',     headerClass: styles.colHeaderDone,     titleClass: styles.colTitleDone     },
  { id: 'progress', label: '🔵 In Progress', headerClass: styles.colHeaderProgress, titleClass: styles.colTitleProgress },
  { id: 'planned',  label: '📋 Planned',      headerClass: styles.colHeaderPlanned,  titleClass: styles.colTitlePlanned  },
  { id: 'idea',     label: '💡 Considering',  headerClass: styles.colHeaderIdea,     titleClass: styles.colTitleIdea     },
]

const TAG_CLASS: Record<Tag, string>  = { core: styles.tagCore, content: styles.tagContent, ux: styles.tagUx, integ: styles.tagInteg }
const TAG_LABEL: Record<Tag, string>  = { core: 'Core', content: 'Content', ux: 'UX', integ: 'Integration' }

const ITEMS: Record<Status, RoadmapItem[]> = {
  done: [
    { title: 'Mock Exam Engine',         desc: 'Full PRC-format timed exams with automatic scoring and item analysis.',            tag: 'core',    meta: 'Shipped Q1 2024' },
    { title: 'Performance Dashboard',    desc: 'Charts showing score trends, weak areas, and improvement over time.',              tag: 'ux',      meta: 'Shipped Q2 2024' },
    { title: 'Nursing (NLE) Question Bank', desc: '3,000+ validated nursing questions across all major subject areas.',          tag: 'content', meta: 'Shipped Q3 2024' },
    { title: 'Pro Subscription',         desc: 'Unlimited exams, full analytics, and downloadable study materials.',               tag: 'core',    meta: 'Shipped Q4 2024' },
  ],
  progress: [
    { title: 'Engineering (ECE/EE) Bank', desc: 'Expanding our technical programs with 2,000+ ECE and EE practice questions.',   tag: 'content', meta: 'Est. Q2 2025' },
    { title: 'Adaptive Exam Mode',        desc: 'Dynamically adjusts question difficulty based on your performance in real time.', tag: 'core',    meta: 'Est. Q2 2025' },
    { title: 'Mobile App (iOS & Android)', desc: 'Native app for offline exam practice and push notifications for study reminders.', tag: 'ux',   meta: 'Est. Q3 2025' },
  ],
  planned: [
    { title: 'Accountancy (CPA) Bank',    desc: 'Full CPA subject coverage: FAR, AFAR, MAS, Tax, Audit, and RegLaw.',             tag: 'content', meta: 'Planned Q3 2025' },
    { title: 'Group Study Rooms',         desc: 'Real-time collaborative exam sessions with leaderboards for barkadas.',           tag: 'ux',      meta: 'Planned Q4 2025' },
    { title: 'AI Answer Explanations',    desc: 'Instant AI-generated rationale for every answer choice — powered by Claude.',    tag: 'integ',   meta: 'Planned Q4 2025' },
    { title: 'Review Center Partnerships', desc: 'Allow accredited review centers to distribute Veripraxis to their students.',   tag: 'core',    meta: 'Planned 2026'    },
  ],
  idea: [
    { title: 'Spaced Repetition System',  desc: 'Flashcard-based review that uses forgetting curves to resurface weak items.',    tag: 'core'    },
    { title: 'PRC Exam Schedule Tracker', desc: 'Personalized countdown and registration deadline reminders per program.',        tag: 'integ'   },
    { title: 'Video Lecture Integrations', desc: 'Link short video explanations to question topics from partner educators.',     tag: 'content' },
  ],
}

export default function RoadmapPage() {
  return (
    <PageShell padded={false}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <motion.div {...heroContainer}>
          <motion.div {...heroItem} className={styles.heroLabel}>
            🗺 Product Roadmap
          </motion.div>
          <motion.h1 {...heroItem} className={styles.heroTitle}>
            What we&#39;re building <span className={styles.heroAccent}>next</span>
          </motion.h1>
          <motion.p {...heroItem} className={styles.heroSub}>
            A transparent look at what&#39;s shipped, what&#39;s in progress, and what&#39;s coming —
            updated every quarter.
          </motion.p>
          <motion.div {...heroItem} className={styles.legend}>
            {[
              { dot: styles.dotDone,     label: 'Shipped'      },
              { dot: styles.dotProgress, label: 'In Progress'  },
              { dot: styles.dotPlanned,  label: 'Planned'      },
              { dot: styles.dotIdea,     label: 'Considering'  },
            ].map((l) => (
              <div key={l.label} className={styles.legendItem}>
                <div className={`${styles.legendDot} ${l.dot}`} />
                {l.label}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Board ── */}
      <motion.div className={styles.board} {...boardContainer}>
        {COLUMNS.map((col) => {
          const items = ITEMS[col.id]
          return (
            <motion.div key={col.id} className={styles.column} {...column}>
              <div className={`${styles.columnHeader} ${col.headerClass}`}>
                <span className={`${styles.columnTitle} ${col.titleClass}`}>{col.label}</span>
                <span className={styles.columnCount}>{items.length}</span>
              </div>
              <motion.div className={styles.columnItems} {...columnItems}>
                {items.map((item) => (
                  <motion.div key={item.title} className={styles.itemCard} {...itemCard}>
                    <div className={`${styles.itemTag} ${TAG_CLASS[item.tag]}`}>
                      {TAG_LABEL[item.tag]}
                    </div>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemDesc}>{item.desc}</div>
                    {item.meta && <div className={styles.itemMeta}>{item.meta}</div>}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ── Vote CTA ── */}
      <section className={styles.voteSection}>
        <motion.div {...voteCta}>
          <h2 className={styles.voteTitle}>Have a feature idea?</h2>
          <p className={styles.voteSub}>
            We build what our reviewees actually need. Vote on features or suggest your own.
          </p>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/contact" className={styles.voteBtn}>Submit a Feature Request →</Link>
          </motion.div>
        </motion.div>
      </section>
    </PageShell>
  )
}