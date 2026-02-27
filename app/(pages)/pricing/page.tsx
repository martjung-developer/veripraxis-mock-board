// app/(pages)/pricing/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { heroContainer, heroItem, revealUp } from '@/animations/presets/publicPage'
import {
  pricingCardsContainer, pricingCard,
  checklistContainer, checklistItem,
  toggleRow, faqContainer, faqItem, ctaSection,
} from '@/animations/pricing/pricingAnimations'
import { faqAnswer } from '@/animations/presets/publicPage'
import PageShell from '@/components/layout/PageShell'
import styles from './pricing.module.css'

const FREE_FEATURES = [
  '3 full-length mock exams per month',
  'Basic score summary',
  '100 question bank items per month',
  'Access to 1 exam program',
]

const PRO_FEATURES = [
  'Unlimited mock exams',
  'Full detailed analytics & heatmaps',
  'Unlimited question bank access',
  'All 12 PRC exam programs',
  'Answer rationales for every question',
  'Downloadable PDF performance reports',
  'Adaptive difficulty mode',
  'Priority email & chat support',
]

const COMPARISON = [
  { feature: 'Full-length mock exams',     free: '3/month',   pro: 'Unlimited'  },
  { feature: 'Question bank access',       free: '100/month', pro: 'Unlimited'  },
  { feature: 'Exam programs',              free: '1',         pro: 'All 12'     },
  { feature: 'Answer rationales',          free: false,       pro: true         },
  { feature: 'Subject heatmap analytics',  free: false,       pro: true         },
  { feature: 'Score trend charts',         free: false,       pro: true         },
  { feature: 'Downloadable PDF reports',   free: false,       pro: true         },
  { feature: 'Adaptive difficulty mode',   free: false,       pro: true         },
  { feature: 'Priority support',           free: false,       pro: true         },
]

const FAQS = [
  { q: 'Can I switch from Free to Pro at any time?',
    a: 'Yes — upgrade or downgrade from your account settings at any time. When you upgrade, your Pro access starts immediately.' },
  { q: 'Is the annual plan really worth it?',
    a: 'Absolutely. The annual plan saves you ₱999 versus paying monthly for 12 months — that\'s more than 2 months free.' },
  { q: 'What payment methods do you accept?',
    a: 'We accept GCash, Maya, major credit/debit cards, and bank transfer through Paymongo. All transactions are encrypted and secure.' },
  { q: 'Do you offer refunds?',
    a: 'Yes — we offer a 7-day money-back guarantee for first-time Pro subscribers, no questions asked.' },
  { q: 'Can review centers get group pricing?',
    a: 'Yes! We have special pricing for review centers and bulk enrollments. Contact us at support@veripraxis.ph for a quote.' },
]

export default function PricingPage() {
  const [annual, setAnnual]   = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const monthlyPrice = 299
  const annualPrice  = Math.round(monthlyPrice * 10 / 12)  // ~249

  return (
    <PageShell>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <motion.div {...heroContainer}>
          <motion.span {...heroItem} className={styles.heroLabel}>Pricing</motion.span>
          <motion.h1 {...heroItem} className={styles.heroTitle}>
            Simple, honest pricing
          </motion.h1>
          <motion.p {...heroItem} className={styles.heroSub}>
            Start for free. Upgrade when you want the full exam experience. No hidden fees,
            no confusing tiers.
          </motion.p>

          {/* ── Billing Toggle ── */}
          <motion.div {...toggleRow} className={styles.toggleRow}>
            <span className={`${styles.toggleLabel} ${!annual ? styles.toggleLabelActive : ''}`}>
              Monthly
            </span>
            <button
              className={styles.toggle}
              onClick={() => setAnnual((a) => !a)}
              aria-label="Toggle billing period"
            >
              <motion.span
                className={styles.toggleKnob}
                animate={{ left: annual ? 25 : 3 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              />
            </button>
            <span className={`${styles.toggleLabel} ${annual ? styles.toggleLabelActive : ''}`}>
              Annual
            </span>
            {annual && <span className={styles.saveBadge}>Save 17%</span>}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className={styles.pricingSection}>
        <motion.div className={styles.pricingGrid} {...pricingCardsContainer}>
          {/* Free Card */}
          <motion.div className={styles.card} {...pricingCard}>
            <div className={styles.planName}>Free</div>
            <p className={styles.planDesc}>Perfect for exploring Veripraxis before committing.</p>
            <div className={styles.priceRow}>
              <span className={styles.priceCurrency}>₱</span>
              <span className={styles.priceAmount}>0</span>
              <span className={styles.pricePeriod}>/ forever</span>
            </div>
            <div className={styles.divider} />
            <ul className={styles.featuresList}>
              {FREE_FEATURES.map((f) => (
                <li key={f} className={styles.featuresItem}>
                  <span className={styles.checkIcon}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
              <Link href="/register" className={styles.ctaFree}>Get Started Free</Link>
            </motion.div>
          </motion.div>

          {/* Pro Card */}
          <motion.div className={`${styles.card} ${styles.cardFeatured}`} {...pricingCard}>
            <div className={styles.planBadge}>⭐ Most Popular</div>
            <div className={styles.planName}>Pro</div>
            <p className={styles.planDesc}>Everything you need to pass — unlimited, unrestricted.</p>
            <div className={styles.priceRow}>
              <span className={styles.priceCurrency}>₱</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={annual ? 'annual' : 'monthly'}
                  className={styles.priceAmount}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {annual ? annualPrice : monthlyPrice}
                </motion.span>
              </AnimatePresence>
              <span className={styles.pricePeriod}>/ month</span>
            </div>
            {annual && (
              <p className={styles.priceNote}>Billed ₱{annualPrice * 12}/year</p>
            )}
            <div className={styles.divider} />
            <ul className={styles.featuresList}>
              {PRO_FEATURES.map((f) => (
                <li key={f} className={styles.featuresItem}>
                  <span className={styles.checkIcon}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
              <Link href="/register?plan=pro" className={styles.ctaPro}>
                Start Pro {annual ? '(Annual)' : '(Monthly)'}
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 7-day guarantee */}
        <motion.div className={styles.guarantee} {...revealUp(0.15)}>
          <span className={styles.guaranteeIcon}>🛡️</span>
          <p className={styles.guaranteeText}>
            <strong>7-day money-back guarantee</strong> on your first Pro subscription.
            No questions asked.
          </p>
        </motion.div>
      </section>

      {/* ── Full Comparison ── */}
      <section className={styles.comparisonSection}>
        <motion.div className={styles.sectionHeaderCenter} {...revealUp()}>
          <span className={styles.sectionLabel}>Full Comparison</span>
          <h2 className={styles.sectionTitle}>Free vs Pro — side by side</h2>
        </motion.div>
        <motion.div {...revealUp(0.1)}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Feature</th><th>Free</th><th>Pro</th>
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

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <motion.h2 className={styles.faqSectionTitle} {...revealUp()}>
          Pricing FAQs
        </motion.h2>
        <motion.div {...faqContainer}>
          {FAQS.map((f, i) => (
            <motion.div
              key={i}
              className={`${styles.faqItem} ${openFaq === i ? styles.faqItemOpen : ''}`}
              {...faqItem}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{f.q}</span>
                <motion.svg
                  className={styles.faqChevron}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  animate={{ rotate: openFaq === i ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <path d="m6 9 6 6 6-6" />
                </motion.svg>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div {...faqAnswer}>
                    <div className={styles.faqAnswerInner}>{f.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <motion.div {...ctaSection}>
          <h2 className={styles.ctaTitle}>Start your review today</h2>
          <p className={styles.ctaSub}>Join 50,000+ reviewees preparing smarter with Veripraxis.</p>
          <div className={styles.ctaActions}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/register" className={styles.btnPrimary}>Get Started Free</Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/features" className={styles.btnGhost}>Explore Features</Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </PageShell>
  )
}