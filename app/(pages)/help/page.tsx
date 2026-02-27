// src/app/help/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  quickLinksContainer,
  quickCard,
  faqGroups,
  faqGroup,
  faqAnswer,
} from '@/animations/help/helpAnimations'
import PageShell from '@/components/layout/PageShell'
import styles from './help.module.css'

const QUICK_LINKS = [
  { icon: '🚀', title: 'Getting Started'       },
  { icon: '💳', title: 'Billing & Plans'        },
  { icon: '📝', title: 'Taking Exams'           },
  { icon: '📊', title: 'Understanding Results'  },
]

const FAQ_CATEGORIES = [
  {
    title: 'Getting Started',
    faqs: [
      { q: 'What is Veripraxis and who is it for?',
        a: "Veripraxis is a mock exam platform designed specifically for Filipino professionals preparing for PRC licensure board exams. We currently support nursing, engineering, accountancy, and other major programs." },
      { q: 'How do I create an account?',
        a: "Click \"Sign Up Free\" on the homepage, enter your email and a password, choose your exam program, and you're in. No credit card required to start with the Free plan." },
      { q: 'Is there a free plan? What does it include?',
        a: "Yes! The Free plan gives you access to 3 full-length mock exams per month, basic score breakdowns, and limited question bank access. Upgrade to Pro for unlimited exams and detailed analytics." },
    ],
  },
  {
    title: 'Taking Exams',
    faqs: [
      { q: 'How long does a full mock exam take?',
        a: "Each exam is timed to match the real PRC format — typically 100–120 questions at 3–4 hours depending on the program. You can pause and resume if needed." },
      { q: 'Can I review my answers after finishing an exam?',
        a: "Yes. After submitting, you get a full item review showing your answer, the correct answer, and a detailed rationale for each question. Pro users also get downloadable PDF reports." },
      { q: 'Are the questions updated regularly?',
        a: "We update our question bank every quarter based on the latest PRC exam trends and reports from recent test takers. Outdated questions are flagged and replaced." },
    ],
  },
  {
    title: 'Billing & Subscriptions',
    faqs: [
      { q: 'What payment methods are accepted?',
        a: "We accept major credit/debit cards, GCash, Maya, and bank transfer via Paymongo. All transactions are secured and encrypted." },
      { q: 'Can I cancel my Pro subscription anytime?',
        a: "Absolutely. You can cancel at any time from your account settings. Your Pro access continues until the end of the current billing period — no questions asked." },
      { q: 'Do you offer student or group discounts?',
        a: "We offer discounts for registered review centers and bulk enrollments. Contact us at support@veripraxis.ph for pricing details." },
    ],
  },
  {
    title: 'Technical Issues',
    faqs: [
      { q: "The exam isn't loading — what should I do?",
        a: "Try refreshing the page or clearing your browser cache. Veripraxis works best on Chrome, Edge, or Firefox. If the issue persists, contact us via the chat widget or email support@veripraxis.ph." },
      { q: 'I found a question with an error. How do I report it?',
        a: "Every question has a \"Report Issue\" button next to it during and after an exam. Use that to flag inaccuracies, typos, or incorrect answer keys — our content team reviews reports within 48 hours." },
    ],
  },
]

export default function HelpPage() {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})
  const [search, setSearch]   = useState('')

  function toggle(key: string) {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const filtered = FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter(
      (f) =>
        search === '' ||
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.faqs.length > 0)

  return (
    <PageShell>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <motion.div variants={faqGroups.variants} initial="hidden" animate="show">
          <motion.span variants={faqGroup.variants} className={styles.heroLabel}>Help Center</motion.span>
          <motion.h1 variants={faqGroup.variants} className={styles.heroTitle}>How can we help you?</motion.h1>
          <motion.p variants={faqGroup.variants} className={styles.heroSub}>
            Browse our FAQs below or use the search to find quick answers to common questions.
          </motion.p>
          <motion.div variants={faqGroup.variants} className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Quick Links ── */}
      <motion.div className={styles.quickLinks} {...quickLinksContainer}>
        {QUICK_LINKS.map((ql) => (
          <motion.div
            key={ql.title}
            className={styles.quickCard}
            onClick={() => setSearch(ql.title)}
            {...quickCard}
          >
            <div className={styles.quickIcon}>{ql.icon}</div>
            <div className={styles.quickTitle}>{ql.title}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── FAQ Sections ── */}
      <div className={styles.faqSections}>
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--slate)' }}
          >
            No results found for &quot;<strong>{search}</strong>&quot;. Try different keywords.
          </motion.div>
        ) : (
          <motion.div {...faqGroups}>
            {filtered.map((cat) => (
              <motion.div key={cat.title} className={styles.faqGroup} {...faqGroup}>
                <div className={styles.categoryTitle}>{cat.title}</div>
                {cat.faqs.map((faq, i) => {
                  const key = `${cat.title}:${i}`
                  const isOpen = !!openMap[key]
                  return (
                    <div
                      key={key}
                      className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
                    >
                      <button className={styles.faqQuestion} onClick={() => toggle(key)}>
                        <span>{faq.q}</span>
                        <motion.svg
                          className={styles.faqChevron}
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </motion.svg>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div {...faqAnswer}>
                            <div className={styles.faqAnswerInner}>{faq.a}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Still Need Help ── */}
      <section className={styles.helpCta}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h2 className={styles.helpCtaTitle}>Still need help?</h2>
          <p className={styles.helpCtaSub}>Our support team is here Mon–Fri, 9AM–6PM PHT.</p>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/contact" className={styles.helpCtaBtn}>Contact Support →</Link>
          </motion.div>
        </motion.div>
      </section>
    </PageShell>
  )
}