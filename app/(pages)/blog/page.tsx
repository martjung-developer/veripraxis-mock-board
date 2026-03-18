// app/(pages)/blog/page.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Clock, ArrowRight, Tag, Rss } from 'lucide-react'
import { heroContainer, heroItem, revealUp } from '@/animations/presets/publicPage'
import {
  postsContainer, postCard, featuredCard, filterRow, newsletter,
} from '@/animations/blog/blogAnimations'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import styles from './blog.module.css'

const CATEGORIES = ['All', 'Study Tips', 'Exam Updates', 'Success Stories', 'Wellness']

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  'Study Tips':      { color: '#1d4ed8', bg: '#eff6ff' },
  'Exam Updates':    { color: '#15803d', bg: '#f0fdf4' },
  'Success Stories': { color: '#92400e', bg: '#fffbeb' },
  'Wellness':        { color: '#7c3aed', bg: '#faf5ff' },
}

const FEATURED_POST = {
  photo:     'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80',
  photoAlt:  'Student studying with notebook',
  category:  'Study Tips',
  date:      'Feb 20, 2025',
  readTime:  '6 min read',
  title:     'The 90-Day Study Plan That Helped 10,000 Reviewees Pass Their PRC Boards',
  excerpt:   'A structured, science-backed approach to your final 3 months before exam day — covering when to review, how to practice, and how to handle exam-day nerves.',
  href:      '/blog/90-day-study-plan',
}

const POSTS = [
  {
    photo:    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80',
    photoAlt: 'Nursing professional reviewing materials',
    category: 'Exam Updates', date: 'Feb 14, 2025', readTime: '4 min read',
    title: 'PRC NLE 2025 Schedule & Coverage: What Nursing Reviewees Need to Know',
    excerpt: 'Updated test blueprint, changes to the passing score, and which nursing specializations carry the most weight this year.',
    href: '/blog/nle-2025-updates',
  },
  {
    photo:    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
    photoAlt: 'Engineering circuit board',
    category: 'Success Stories', date: 'Feb 10, 2025', readTime: '5 min read',
    title: "From Failing Twice to Passing with Flying Colors: Mark's Story",
    excerpt: 'ECE graduate Mark Reyes shares how he restructured his review strategy after two failed attempts and finally passed.',
    href: '/blog/mark-success-story',
  },
  {
    photo:    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80',
    photoAlt: 'Books stacked on desk',
    category: 'Study Tips', date: 'Feb 5, 2025', readTime: '7 min read',
    title: 'Active Recall vs. Passive Reading: Which Works Better for Board Exams?',
    excerpt: 'The cognitive science behind effective studying — and why simply re-reading your notes might be hurting your retention.',
    href: '/blog/active-recall-board-exams',
  },
  {
    photo:    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80',
    photoAlt: 'Person resting at desk',
    category: 'Wellness', date: 'Jan 28, 2025', readTime: '4 min read',
    title: 'Sleep, Stress & Exam Performance: A Guide for the Final Week',
    excerpt: "What to do — and what absolutely not to do — in the 7 days before your board exam.",
    href: '/blog/sleep-stress-exam',
  },
  {
    photo:    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
    photoAlt: 'Accountant reviewing documents',
    category: 'Exam Updates', date: 'Jan 20, 2025', readTime: '5 min read',
    title: 'PRC CPA Board Exam 2025: Coverage Changes You Should Not Ignore',
    excerpt: "The Professional Regulation Commission updated the CPA exam coverage. Here's a full breakdown with affected topics.",
    href: '/blog/cpa-2025-coverage',
  },
  {
    photo:    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80',
    photoAlt: 'Students studying together',
    category: 'Study Tips', date: 'Jan 15, 2025', readTime: '6 min read',
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
    <>
      <Navbar />

      <main className={styles.page}>

        {/* ── HERO ── */}
        <section className={styles.hero}>
          <div className={styles.heroBg}>
            <Image
              src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1400&q=80"
              alt="Library books"
              fill style={{ objectFit: 'cover' }}
              priority
            />
            <div className={styles.heroBgOverlay} />
          </div>

          <div className={styles.heroInner}>
            <motion.div {...heroContainer} className={styles.heroContent}>
              <motion.span {...heroItem} className={styles.heroBadge}>
                <Rss size={11} strokeWidth={2.5} />
                VeriPraxis Blog
              </motion.span>
              <motion.h1 {...heroItem} className={styles.heroTitle}>
                Insights for the{' '}
                <span className={styles.heroAccent}>serious reviewee.</span>
              </motion.h1>
              <motion.p {...heroItem} className={styles.heroSub}>
                Study strategies, PRC exam updates, success stories, and wellness
                tips — all designed to help you pass.
              </motion.p>

              {/* Filter pills */}
              <motion.div {...filterRow} className={styles.filterRow}>
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
            </motion.div>
          </div>
        </section>

        {/* ── FEATURED POST ── */}
        {activeCategory === 'All' && (
          <section className={styles.featuredSection}>
            <div className={styles.featuredInner}>
              <div className={styles.featuredLabel}>
                <Tag size={12} strokeWidth={2.5} />
                Featured Article
              </div>
              <motion.div {...featuredCard}>
                <Link href={FEATURED_POST.href} className={styles.featuredCard}>
                  {/* Photo */}
                  <div className={styles.featuredPhoto}>
                    <Image
                      src={FEATURED_POST.photo}
                      alt={FEATURED_POST.photoAlt}
                      fill style={{ objectFit: 'cover' }}
                    />
                    <div className={styles.featuredPhotoOverlay} />
                    <div className={styles.featuredPhotoContent}>
                      <span
                        className={styles.postCategoryBadge}
                        style={{
                          color: CATEGORY_COLORS[FEATURED_POST.category]?.color,
                          background: CATEGORY_COLORS[FEATURED_POST.category]?.bg,
                        }}
                      >
                        {FEATURED_POST.category}
                      </span>
                    </div>
                  </div>
                  {/* Body */}
                  <div className={styles.featuredBody}>
                    <div className={styles.postMeta}>
                      <span className={styles.postDate}>{FEATURED_POST.date}</span>
                      <span className={styles.postDot}>·</span>
                      <Clock size={12} strokeWidth={2} />
                      <span className={styles.postReadTime}>{FEATURED_POST.readTime}</span>
                    </div>
                    <h2 className={styles.featuredTitle}>{FEATURED_POST.title}</h2>
                    <p className={styles.featuredExcerpt}>{FEATURED_POST.excerpt}</p>
                    <div className={styles.readMoreLink}>
                      Read article <ArrowRight size={14} strokeWidth={2.5} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>
          </section>
        )}

        {/* ── POSTS GRID ── */}
        <section className={styles.postsSection}>
          <div className={styles.postsSectionInner}>
            {activeCategory !== 'All' && (
              <motion.div {...revealUp()} className={styles.categoryHeader}>
                <span
                  className={styles.categoryHeaderBadge}
                  style={{
                    color: CATEGORY_COLORS[activeCategory]?.color ?? '#1d4ed8',
                    background: CATEGORY_COLORS[activeCategory]?.bg ?? '#eff6ff',
                  }}
                >
                  {activeCategory}
                </span>
                <span className={styles.categoryHeaderCount}>
                  {filtered.length} article{filtered.length !== 1 ? 's' : ''}
                </span>
              </motion.div>
            )}

            <motion.div className={styles.postsGrid} {...postsContainer}>
              {filtered.map((post) => (
                <motion.div key={post.href} className={styles.postCard} {...postCard}>
                  <Link href={post.href} className={styles.postCardLink}>
                    {/* Photo */}
                    <div className={styles.postCardPhoto}>
                      <Image
                        src={post.photo}
                        alt={post.photoAlt}
                        fill style={{ objectFit: 'cover' }}
                      />
                      <div className={styles.postCardPhotoOverlay} />
                      <span
                        className={styles.postCategoryBadge}
                        style={{
                          color: CATEGORY_COLORS[post.category]?.color,
                          background: CATEGORY_COLORS[post.category]?.bg,
                        }}
                      >
                        {post.category}
                      </span>
                    </div>
                    {/* Body */}
                    <div className={styles.postCardBody}>
                      <div className={styles.postMeta}>
                        <span className={styles.postDate}>{post.date}</span>
                        <span className={styles.postDot}>·</span>
                        <Clock size={11} strokeWidth={2} />
                        <span className={styles.postReadTime}>{post.readTime}</span>
                      </div>
                      <h3 className={styles.postCardTitle}>{post.title}</h3>
                      <p className={styles.postCardExcerpt}>{post.excerpt}</p>
                      <div className={styles.readMoreLink}>
                        Read more <ArrowRight size={13} strokeWidth={2.5} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── NEWSLETTER ── */}
        <section className={styles.newsletterSection}>
          <div className={styles.newsletterBg}>
            <Image
              src="https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1400&q=80"
              alt="Open notebook and pen"
              fill style={{ objectFit: 'cover' }}
            />
            <div className={styles.newsletterBgOverlay} />
          </div>
          <motion.div className={styles.newsletterInner} {...newsletter}>
            <span className={styles.newsletterBadge}>
              <Rss size={11} strokeWidth={2.5} />
              Weekly Newsletter
            </span>
            <h2 className={styles.newsletterTitle}>Stay ahead of the curve</h2>
            <p className={styles.newsletterSub}>
              Get exam updates, study tips, and new articles delivered to your
              inbox every week. No spam, unsubscribe anytime.
            </p>
            <div className={styles.newsletterForm}>
              <input
                type="email"
                placeholder="your@email.com"
                className={styles.newsletterInput}
              />
              <button className={styles.newsletterBtn}>
                Subscribe <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
            <p className={styles.newsletterNote}>
              Joined by 3,000+ reviewees. Free forever.
            </p>
          </motion.div>
        </section>

      </main>

      <Footer />
    </>
  )
}