// src/app/(pages)/blog/page.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

import {
  heroContainer,
  heroItem,
  revealStagger,
  revealItem,
  revealUp,
  pageEntry,
} from '@/animations/presets/publicPage'

import PageShell from '@/components/layout/PageShell'
import styles from './blog.module.css'

const CATEGORIES = ['All', 'Study Tips', 'Exam Updates', 'Success Stories', 'Wellness']

const FEATURED_POST = {
  emoji: '📚',
  bg: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
  category: 'Study Tips',
  date: 'Feb 20, 2025',
  readTime: '6 min read',
  title: 'The 90-Day Study Plan That Helped 10,000 Reviewees Pass Their PRC Boards',
  excerpt:
    'A structured, science-backed approach to your final 3 months before exam day — covering when to review, how to practice, and how to handle exam-day nerves.',
  href: '/blog/90-day-study-plan',
}

const POSTS = [
  {
    emoji: '🏥', bg: '#eff6ff', category: 'Exam Updates', date: 'Feb 14, 2025', readTime: '4 min read',
    title: 'PRC NLE 2025 Schedule & Coverage: What Nursing Reviewees Need to Know',
    excerpt: 'Updated test blueprint, changes to the passing score, and which nursing specializations carry the most weight this year.',
    href: '/blog/nle-2025-updates',
  },
  {
    emoji: '⚡', bg: '#fefce8', category: 'Success Stories', date: 'Feb 10, 2025', readTime: '5 min read',
    title: "From Failing Twice to Passing with Flying Colors: Mark's Story",
    excerpt: 'ECE graduate Mark Reyes shares how he restructured his review strategy after two failed attempts and finally passed.',
    href: '/blog/mark-success-story',
  },
  {
    emoji: '🧠', bg: '#f0fdf4', category: 'Study Tips', date: 'Feb 5, 2025', readTime: '7 min read',
    title: 'Active Recall vs. Passive Reading: Which Works Better for Board Exams?',
    excerpt: 'The cognitive science behind effective studying — and why simply re-reading your notes might be hurting your retention.',
    href: '/blog/active-recall-board-exams',
  },
  {
    emoji: '😴', bg: '#fdf4ff', category: 'Wellness', date: 'Jan 28, 2025', readTime: '4 min read',
    title: 'Sleep, Stress & Exam Performance: A Guide for the Final Week',
    excerpt: "What to do — and what absolutely not to do — in the 7 days before your board exam.",
    href: '/blog/sleep-stress-exam',
  },
  {
    emoji: '📊', bg: '#fff7ed', category: 'Exam Updates', date: 'Jan 20, 2025', readTime: '5 min read',
    title: 'PRC CPA Board Exam 2025: Coverage Changes You Should Not Ignore',
    excerpt: "The Professional Regulation Commission updated the CPA exam coverage. Here's a full breakdown with affected topics.",
    href: '/blog/cpa-2025-coverage',
  },
  {
    emoji: '🎯', bg: '#f0f9ff', category: 'Study Tips', date: 'Jan 15, 2025', readTime: '6 min read',
    title: '5 Things Top Board Passers Do Differently During Their Review',
    excerpt: 'We surveyed 500+ first-time passers to find the habits that set them apart — the results might surprise you.',
    href: '/blog/top-passers-habits',
  },
]

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = React.useState('All')

  const filtered = activeCategory === 'All'
    ? POSTS
    : POSTS.filter((p) => p.category === activeCategory)

  return (
    <PageShell>
      <motion.main {...pageEntry} className={styles.page}>
        {/* ───────────────── HERO ───────────────── */}
        <motion.section {...heroContainer} className={styles.hero}>
          <motion.span {...heroItem} className={styles.heroLabel}>
            Veripraxis Blog
          </motion.span>
          <motion.h1 {...heroItem} className={styles.heroTitle}>
            Insights for the serious reviewee
          </motion.h1>
          <motion.p {...heroItem} className={styles.heroSub}>
            Study strategies, PRC exam updates, success stories, and wellness tips — all designed
            to help you pass.
          </motion.p>
          <motion.div {...heroItem} className={styles.filterRow}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${activeCategory === cat ? styles.filterBtnActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </motion.div>
        </motion.section>

        {/* ───────────────── FEATURED POST ───────────────── */}
        {activeCategory === 'All' && (
          <motion.section {...revealUp(0.1)} className={styles.featured}>
            <Link href={FEATURED_POST.href} className={styles.featuredCard}>
              <div className={styles.featuredImgWrap} style={{ background: FEATURED_POST.bg }}>
                <span>{FEATURED_POST.emoji}</span>
              </div>
              <div className={styles.featuredBody}>
                <div className={styles.postMeta}>
                  <span className={styles.postCategory}>{FEATURED_POST.category}</span>
                  <span className={styles.postDate}>{FEATURED_POST.date}</span>
                  <span className={styles.postReadTime}>{FEATURED_POST.readTime}</span>
                </div>
                <h2 className={styles.featuredTitle}>{FEATURED_POST.title}</h2>
                <p className={styles.featuredExcerpt}>{FEATURED_POST.excerpt}</p>
                <span className={styles.readMoreLink}>Read article →</span>
              </div>
            </Link>
          </motion.section>
        )}

        {/* ───────────────── POSTS GRID ───────────────── */}
        <motion.section {...revealStagger} className={styles.postsSection}>
          <div className={styles.postsGrid}>
            {filtered.map((post) => (
              <motion.div key={post.href} {...revealItem} className={styles.postCard}>
                <Link href={post.href} className={styles.postCardLink}>
                  <div className={styles.postCardImgWrap} style={{ background: post.bg }}>
                    <span>{post.emoji}</span>
                  </div>
                  <div className={styles.postCardBody}>
                    <div className={styles.postMeta}>
                      <span className={styles.postCategory}>{post.category}</span>
                      <span className={styles.postDate}>{post.date}</span>
                      <span className={styles.postReadTime}>{post.readTime}</span>
                    </div>
                    <h3 className={styles.postCardTitle}>{post.title}</h3>
                    <p className={styles.postCardExcerpt}>{post.excerpt}</p>
                    <span className={styles.readMoreLink}>Read more →</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ───────────────── NEWSLETTER ───────────────── */}
        <motion.section {...revealUp(0.2)} className={styles.newsletter}>
          <h2 className={styles.newsletterTitle}>Stay ahead of the curve</h2>
          <p className={styles.newsletterSub}>
            Get exam updates, study tips, and new articles delivered to your inbox weekly.
          </p>
          <div className={styles.newsletterForm}>
            <input type="email" placeholder="your@email.com" className={styles.newsletterInput} />
            <button className={styles.newsletterBtn}>Subscribe</button>
          </div>
        </motion.section>
      </motion.main>
    </PageShell>
  )
}
