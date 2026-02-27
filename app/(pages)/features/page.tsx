// app/(pages)/features/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { heroContainer, heroItem, revealUp } from '@/animations/presets/publicPage'
import { cardsContainer, featureCard, splitText, splitVisual, featureListContainer, featureListItem, ctaSection } from '@/animations/features/featuresAnimations'
import PageShell from '@/components/layout/PageShell'
import styles from './features.module.css'

const OVERVIEW = [
  { icon: '📝', title: 'Realistic Mock Exams',     desc: 'Full-length, PRC-format timed exams that mirror the real board exam experience — same item count, same structure, same pressure.' },
  { icon: '📊', title: 'Detailed Analytics',        desc: 'Score trends, subject-by-subject breakdowns, and weak-area heatmaps so you always know exactly what to work on next.' },
  { icon: '🧠', title: 'Comprehensive Question Bank', desc: 'Thousands of curated, expert-validated questions updated quarterly to reflect the latest PRC exam patterns and coverage.' },
  { icon: '⏱️', title: 'Adaptive Difficulty',       desc: 'Our smart engine adjusts question difficulty in real time based on your performance, keeping you in the optimal learning zone.' },
  { icon: '📱', title: 'Study Anywhere',             desc: 'Fully responsive web app — review on your laptop at home or squeeze in practice questions on your phone during commutes.' },
  { icon: '💾', title: 'Progress Saved',             desc: 'All your exam history, scores, and notes are saved to your account. Resume where you left off anytime, on any device.' },
]

const SPLIT_FEATURES = [
  {
    label:   'Exam Engine',
    title:   "Practice like it's the real thing",
    desc:    'Our exam engine mirrors the PRC format exactly — timed, structured, and pressure-tested. Every session builds the mental stamina you need for exam day.',
    emoji:   '⏱️',
    bg:      'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
    items: [
      { icon: '✅', title: 'Official PRC Format',       desc: 'Question count, time limits, and subject weighting match the actual board exam.' },
      { icon: '⏸️', title: 'Pause & Resume',            desc: 'Life happens — pause your exam and pick it up later without losing progress.' },
      { icon: '🔀', title: 'Item Randomization',        desc: 'Questions and choices are shuffled every session so you can never memorize order.' },
    ],
  },
  {
    label:   'Analytics',
    title:   'Know exactly where you stand',
    desc:    "Stop guessing what to study. Our analytics pinpoint your exact weak areas, track your improvement over time, and tell you when you're ready.",
    emoji:   '📈',
    bg:      'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
    items: [
      { icon: '📉', title: 'Score Trends',              desc: 'See how your scores change across sessions with clear progress charts.' },
      { icon: '🗂️', title: 'Subject Heatmap',           desc: 'Visual breakdown of performance across every subject area and subtopic.' },
      { icon: '📄', title: 'Downloadable Reports',      desc: 'Export your full performance report as a PDF — share with your review group or tutor.' },
    ],
  },
]

const COMPARISON = [
  { feature: 'Full-length mock exams',     free: true,  pro: true  },
  { feature: 'Question bank access',       free: '100/month', pro: 'Unlimited' },
  { feature: 'Score breakdown',            free: true,  pro: true  },
  { feature: 'Answer rationales',          free: false, pro: true  },
  { feature: 'Subject heatmap analytics',  free: false, pro: true  },
  { feature: 'Score trend charts',         free: false, pro: true  },
  { feature: 'Downloadable PDF reports',   free: false, pro: true  },
  { feature: 'Adaptive difficulty mode',   free: false, pro: true  },
  { feature: 'Priority support',           free: false, pro: true  },
]

export default function FeaturesPage() {
  return (
    <PageShell padded={false}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <motion.div {...heroContainer}>
          <motion.div {...heroItem} className={styles.heroBadge}>✨ Platform Features</motion.div>
          <motion.h1 {...heroItem} className={styles.heroTitle}>
            Everything you need to{' '}
            <span className={styles.heroAccent}>pass on the first try</span>
          </motion.h1>
          <motion.p {...heroItem} className={styles.heroSub}>
            Veripraxis combines realistic mock exams, intelligent analytics, and a comprehensive
            question bank into one focused review platform.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Overview Cards ── */}
      <section className={styles.overviewSection}>
        <motion.div {...revealUp()}>
          <span className={styles.sectionLabel}>What&#39;s Included</span>
          <h2 className={styles.sectionTitle}>Built for serious reviewees</h2>
          <p className={styles.sectionSub}>
            Every feature is designed around one goal: maximizing your chance of passing your
            PRC board exam.
          </p>
        </motion.div>

        <motion.div className={styles.overviewGrid} {...cardsContainer}>
          {OVERVIEW.map((item) => (
            <motion.div key={item.title} className={styles.overviewCard} {...featureCard}>
              <div className={styles.cardIcon}>{item.icon}</div>
              <div className={styles.cardTitle}>{item.title}</div>
              <p className={styles.cardDesc}>{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Split Sections ── */}
      {SPLIT_FEATURES.map((feat, i) => {
        const isEven = i % 2 === 0
        const Inner = (
          <>
            <motion.div {...splitText(isEven)}>
              <span className={styles.sectionLabel}>{feat.label}</span>
              <h2 className={styles.sectionTitle}>{feat.title}</h2>
              <p className={styles.sectionSub}>{feat.desc}</p>
              <motion.div className={styles.featureList} {...featureListContainer}>
                {feat.items.map((it) => (
                  <motion.div key={it.title} className={styles.featureListItem} {...featureListItem}>
                    <div className={styles.featureListIcon}>{it.icon}</div>
                    <div className={styles.featureListText}>
                      <div className={styles.featureListTitle}>{it.title}</div>
                      <div className={styles.featureListDesc}>{it.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              className={styles.splitVisual}
              style={{ background: feat.bg }}
              {...splitVisual(!isEven)}
            >
              {feat.emoji}
            </motion.div>
          </>
        )

        return isEven ? (
          <section key={feat.label} className={styles.splitSection}>
            <div className={styles.splitRow}>{Inner}</div>
          </section>
        ) : (
          <div key={feat.label} className={styles.splitAlt}>
            <div className={styles.splitAltInner}>
              <div className={styles.splitRowReverse}>{Inner}</div>
            </div>
          </div>
        )
      })}

      {/* ── Free vs Pro Comparison ── */}
      <section className={styles.comparisonSection}>
        <motion.div className={styles.sectionHeaderCenter} {...revealUp()}>
          <span className={styles.sectionLabel}>Free vs Pro</span>
          <h2 className={styles.sectionTitle}>Compare plans at a glance</h2>
        </motion.div>

        <motion.div {...revealUp(0.1)}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature}>
                    <td className={styles.featureName}>{row.feature}</td>
                    <td>
                      {typeof row.free === 'boolean'
                        ? <span className={row.free ? styles.checkYes : styles.checkNo}>{row.free ? '✓' : '—'}</span>
                        : row.free}
                    </td>
                    <td>
                      {typeof row.pro === 'boolean'
                        ? <span className={row.pro ? styles.checkYes : styles.checkNo}>{row.pro ? '✓' : '—'}</span>
                        : row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <motion.div {...ctaSection}>
          <h2 className={styles.ctaTitle}>Ready to experience it?</h2>
          <p className={styles.ctaSub}>
            Start for free — no credit card required. Upgrade when you&#39;re ready for the full experience.
          </p>
          <div className={styles.ctaActions}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/register" className={styles.btnPrimary}>Start Free Today</Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/pricing" className={styles.btnGhost}>See Pricing</Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </PageShell>
  )
}