// app/(pages)/programs/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { heroContainer, heroItem } from '@/animations/presets/publicPage'
import {
  programsContainer, programCard,
  filterRow, statsStrip, statItem, ctaSection,
} from '@/animations/programs/programsAnimations'
import PageShell from '@/components/layout/PageShell'
import styles from './programs.module.css'

type Category = 'All' | 'Health' | 'Engineering' | 'Business' | 'Education'

interface Program {
  code:      string
  name:      string
  emoji:     string
  bg:        string
  category:  Omit<Category, 'All'>
  desc:      string
  questions: string
  passRate:  string
  status:    'available' | 'coming'
}

const PROGRAMS: Program[] = [
  {
    code: 'NLE',  name: 'Nurse Licensure Exam',
    emoji: '🏥',  bg: '#eff6ff',  category: 'Health',
    desc: 'Comprehensive NLE prep covering all 8 nursing subjects with 3,000+ validated questions.',
    questions: '3,000+', passRate: '94%', status: 'available',
  },
  {
    code: 'ECE',  name: 'Electronics Engineering',
    emoji: '📡',  bg: '#f0fdf4',  category: 'Engineering',
    desc: 'ECE board exam coverage across Mathematics, EST, GEAS, and Electronics subjects.',
    questions: '2,000+', passRate: '91%', status: 'available',
  },
  {
    code: 'CPA',  name: 'Certified Public Accountant',
    emoji: '📊',  bg: '#fef9c3',  category: 'Business',
    desc: 'Full CPA board coverage: FAR, AFAR, MAS, Tax, Audit, and RegLaw with detailed rationales.',
    questions: '1,500+', passRate: '89%', status: 'available',
  },
  {
    code: 'LET',  name: 'Licensure Exam for Teachers',
    emoji: '🎓',  bg: '#fdf4ff',  category: 'Education',
    desc: 'LET preparation for both Elementary and Secondary education majors, all fields.',
    questions: '1,200+', passRate: '92%', status: 'available',
  },
  {
    code: 'EE',   name: 'Electrical Engineering',
    emoji: '⚡',  bg: '#fff7ed',  category: 'Engineering',
    desc: 'EE board exam prep: Power Systems, Machines, Electronics, and Circuit Theory.',
    questions: '1,800+', passRate: '90%', status: 'available',
  },
  {
    code: 'MD',   name: 'Medical Board Exam',
    emoji: '🩺',  bg: '#fef2f2',  category: 'Health',
    desc: 'Philippine Medical Board comprehensive review across all major clinical subjects.',
    questions: '800+', passRate: '88%', status: 'available',
  },
  {
    code: 'PharmD', name: 'Pharmacy Licensure Exam',
    emoji: '💊',  bg: '#f0fdf4',  category: 'Health',
    desc: 'Pharmacist board exam prep covering Pharmaceutical Sciences, Clinical Pharmacy, and more.',
    questions: '600+', passRate: '—', status: 'coming',
  },
  {
    code: 'ME',   name: 'Mechanical Engineering',
    emoji: '⚙️',  bg: '#f8fafc',  category: 'Engineering',
    desc: 'ME board exam coverage: Mathematics, Machine Design, Thermodynamics, and Power Plant.',
    questions: '1,000+', passRate: '—', status: 'coming',
  },
  {
    code: 'Arch', name: 'Architecture Licensure Exam',
    emoji: '🏛️',  bg: '#fdf4ff',  category: 'Engineering',
    desc: 'Architecture board exam prep: Design & Planning, Building Technology, and History.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
]

const STATS = [
  { value: '12',      label: 'PRC Programs'     },
  { value: '15,000+', label: 'Practice Questions' },
  { value: '94%',     label: 'Avg Pass Rate'    },
  { value: 'Q3 2025', label: 'Next Program Drop' },
]

const CATEGORIES: Category[] = ['All', 'Health', 'Engineering', 'Business', 'Education']

export default function ProgramsPage() {
  const [active, setActive] = useState<Category>('All')

  const filtered = active === 'All'
    ? PROGRAMS
    : PROGRAMS.filter((p) => p.category === active)

  return (
    <PageShell padded={false}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <motion.div {...heroContainer}>
          <motion.div {...heroItem} className={styles.heroBadge}>📋 Exam Programs</motion.div>
          <motion.h1 {...heroItem} className={styles.heroTitle}>
            Prep for your{' '}
            <span className={styles.heroAccent}>specific board exam</span>
          </motion.h1>
          <motion.p {...heroItem} className={styles.heroSub}>
            Veripraxis covers 12 PRC licensure programs with program-specific question banks,
            analytics, and study plans — all in one platform.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Stats Strip ── */}
      <div className={styles.statsStrip}>
        <motion.div className={styles.statsInner} {...statsStrip}>
          {STATS.map((s) => (
            <motion.div key={s.label} className={styles.statItem} {...statItem}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Filter ── */}
      <div className={styles.filterSection}>
        <div className={styles.filterLabel}>Filter by category</div>
        <motion.div {...filterRow} className={styles.filterRow}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${active === cat ? styles.filterBtnActive : ''}`}
              onClick={() => setActive(cat)}
            >
              {cat}
            </button>
          ))}
        </motion.div>
      </div>

      {/* ── Programs Grid ── */}
      <section className={styles.programsSection}>
        <motion.div className={styles.programsGrid} {...programsContainer}>
          {filtered.map((prog) => (
            <motion.div
              key={prog.code}
              className={styles.programCard}
              {...programCard}
            >
              <div
                className={styles.cardHeader}
                style={{ background: prog.bg }}
              >
                <span className={styles.cardEmoji}>{prog.emoji}</span>
                <span className={`${styles.cardStatusBadge} ${prog.status === 'available' ? styles.statusAvailable : styles.statusComing}`}>
                  {prog.status === 'available' ? 'Available' : 'Coming Soon'}
                </span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardCode}>{prog.code}</div>
                <div className={styles.cardName}>{prog.name}</div>
                <p className={styles.cardDesc}>{prog.desc}</p>
                <div className={styles.cardMeta}>
                  <div className={styles.cardMetaItem}>
                    <strong>{prog.questions}</strong>
                    Questions
                  </div>
                  <div className={styles.cardMetaItem}>
                    <strong>{prog.passRate}</strong>
                    Pass Rate
                  </div>
                </div>
                {prog.status === 'available' ? (
                  <Link href="/register" className={styles.cardCta}>
                    Start Reviewing →
                  </Link>
                ) : (
                  <span className={styles.cardCtaDisabled}>Notify Me When Ready</span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <motion.div {...ctaSection}>
          <h2 className={styles.ctaTitle}>Don&apos;t see your program?</h2>
          <p className={styles.ctaSub}>
            We&apos;re adding new programs every quarter. Let us know which one you need and we&apos;ll
            prioritize it.
          </p>
          <div className={styles.ctaActions}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/contact" className={styles.btnPrimary}>Request a Program</Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/register" className={styles.btnGhost}>Browse Available Exams</Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </PageShell>
  )
}