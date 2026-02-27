// src/app/(pages)/about/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

import {
  heroContainer,
  heroItem,
  revealStagger,
  revealItem,
  revealUp,
  statsContainer,
  statCard,
  pageEntry,
} from '@/animations/presets/publicPage'

import PageShell from '@/components/layout/PageShell'
import styles from './about.module.css'

const STATS = [
  { value: '50,000+', label: 'Reviewees Helped' },
  { value: '94%', label: 'Pass Rate' },
  { value: '12', label: 'PRC Programs' },
  { value: '2019', label: 'Year Founded' },
]

const VALUES = [
  {
    icon: '🎯',
    title: 'Accuracy First',
    desc: 'Every question is curated and validated by licensed professionals.',
  },
  {
    icon: '🤝',
    title: 'Reviewee-Centered',
    desc: 'Built by listening to actual board exam takers.',
  },
]

export default function AboutPage() {
  return (
    <PageShell>
      {/* Page entry animation */}
      <motion.main {...pageEntry} className={styles.page}>
        {/* ───────────────── HERO ───────────────── */}
        <motion.section {...heroContainer} className={styles.hero}>
          <motion.h1 {...heroItem}>
            Built for Board Exam Success
          </motion.h1>

          <motion.p {...heroItem}>
            We help reviewees pass with confidence through accuracy,
            clarity, and care.
          </motion.p>

          <motion.div {...heroItem}>
            <Link href="/pricing">View Programs</Link>
          </motion.div>
        </motion.section>

        {/* ───────────────── STATS ───────────────── */}
        <motion.section {...statsContainer} className={styles.stats}>
          {STATS.map((stat) => (
            <motion.div key={stat.label} {...statCard}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </motion.div>
          ))}
        </motion.section>

        {/* ───────────────── VALUES ───────────────── */}
        <motion.section {...revealStagger} className={styles.values}>
          {VALUES.map((value) => (
            <motion.div key={value.title} {...revealItem}>
              <span>{value.icon}</span>
              <h3>{value.title}</h3>
              <p>{value.desc}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* ───────────────── MISSION TEXT ───────────────── */}
        <motion.section
          {...revealUp(0.1)}
          className={styles.mission}
        >
          <h2>Our Mission</h2>
          <p>
            To empower every reviewee with reliable tools and
            confidence to pass their board exams.
          </p>
        </motion.section>
      </motion.main>
    </PageShell>
  )
}