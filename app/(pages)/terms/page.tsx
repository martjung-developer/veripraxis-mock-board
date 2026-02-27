// src/app/terms/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  legalHero,
  toc,
  contentBody,
  contentSection,
  relatedContainer,
  relatedBtn,
} from '@/animations/legal/legalAnimations'
import PageShell from '@/components/layout/PageShell'
import styles from './terms.module.css'

const SECTIONS = [
  { id: 'acceptance',  title: '1. Acceptance of Terms'       },
  { id: 'account',     title: '2. Account Responsibilities'  },
  { id: 'use',         title: '3. Permitted Use'             },
  { id: 'prohibited',  title: '4. Prohibited Conduct'        },
  { id: 'ip',          title: '5. Intellectual Property'     },
  { id: 'payments',    title: '6. Payments & Refunds'        },
  { id: 'disclaimer',  title: '7. Disclaimers'               },
  { id: 'liability',   title: '8. Limitation of Liability'   },
  { id: 'termination', title: '9. Termination'               },
  { id: 'governing',   title: '10. Governing Law'            },
  { id: 'contact',     title: '11. Contact'                  },
]

export default function TermsPage() {
  return (
    <PageShell>
      <section className={styles.hero}>
        <motion.div {...legalHero}>
          <span className={styles.heroLabel}>Legal</span>
          <h1 className={styles.heroTitle}>Terms of Service</h1>
          <p className={styles.heroMeta}>Last updated: January 1, 2025</p>
        </motion.div>
      </section>

      <div className={styles.layout}>
        <motion.aside className={styles.toc} {...toc}>
          <div className={styles.tocTitle}>On this page</div>
          <ul className={styles.tocList}>
            {SECTIONS.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className={styles.tocLink}>{s.title}</a></li>
            ))}
          </ul>
        </motion.aside>

        <motion.div className={styles.content} {...contentBody}>
          <motion.div {...contentSection} className={styles.highlight}>
            Please read these Terms of Service carefully before using Veripraxis. By accessing or
            using our platform, you agree to be bound by these terms.
          </motion.div>

          <motion.section {...contentSection} className={styles.section} id="acceptance">
            <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
            <p className={styles.paragraph}>By creating an account or using any feature of Veripraxis (&quot;the Platform&quot;), you agree to these Terms and our Privacy Policy. If you do not agree, please do not use the Platform.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="account">
            <h2 className={styles.sectionTitle}>2. Account Responsibilities</h2>
            <ul className={styles.list}>
              <li>You must be at least 18 years old to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must provide accurate and complete information during registration.</li>
              <li>Notify us immediately at <a href="mailto:support@veripraxis.ph" className={styles.email}>support@veripraxis.ph</a> if you suspect unauthorized access.</li>
            </ul>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="use">
            <h2 className={styles.sectionTitle}>3. Permitted Use</h2>
            <p className={styles.paragraph}>Veripraxis is licensed to you for personal, non-commercial use to prepare for PRC licensure examinations only.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="prohibited">
            <h2 className={styles.sectionTitle}>4. Prohibited Conduct</h2>
            <p className={styles.paragraph}>You agree not to:</p>
            <ul className={styles.list}>
              <li>Share, redistribute, or resell exam questions or answer keys.</li>
              <li>Use automated tools, bots, or scrapers to extract platform content.</li>
              <li>Attempt to reverse engineer or hack any part of the Platform.</li>
              <li>Create multiple accounts to circumvent usage limits.</li>
              <li>Post or transmit any harmful, offensive, or misleading content.</li>
            </ul>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="ip">
            <h2 className={styles.sectionTitle}>5. Intellectual Property</h2>
            <p className={styles.paragraph}>All content on Veripraxis — including exam questions, rationales, software, design, and branding — is the exclusive property of Veripraxis Inc. You may not reproduce or distribute any content without prior written permission.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="payments">
            <h2 className={styles.sectionTitle}>6. Payments & Refunds</h2>
            <p className={styles.paragraph}>Pro subscriptions are billed monthly or annually in Philippine Pesos (PHP). We offer a 7-day money-back guarantee for first-time Pro subscribers. After 7 days, payments are non-refundable.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="disclaimer">
            <h2 className={styles.sectionTitle}>7. Disclaimers</h2>
            <p className={styles.paragraph}>Veripraxis is not affiliated with, endorsed by, or an official product of the Professional Regulation Commission (PRC). Passing a mock exam does not guarantee passing the actual board examination.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="liability">
            <h2 className={styles.sectionTitle}>8. Limitation of Liability</h2>
            <p className={styles.paragraph}>To the maximum extent permitted by law, Veripraxis Inc. shall not be liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount you paid us in the 3 months preceding the claim.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="termination">
            <h2 className={styles.sectionTitle}>9. Termination</h2>
            <p className={styles.paragraph}>We reserve the right to suspend or terminate your account at any time for violations of these Terms. You may delete your account at any time from your account settings.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="governing">
            <h2 className={styles.sectionTitle}>10. Governing Law</h2>
            <p className={styles.paragraph}>These Terms are governed by the laws of the Republic of the Philippines. Disputes shall be subject to the exclusive jurisdiction of the courts of Pasig City, Metro Manila.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="contact">
            <h2 className={styles.sectionTitle}>11. Contact</h2>
            <p className={styles.paragraph}>Questions about these Terms? Email <a href="mailto:legal@veripraxis.ph" className={styles.email}>legal@veripraxis.ph</a>.</p>
          </motion.section>
        </motion.div>
      </div>

      <div className={styles.relatedLinks}>
        <div className={styles.relatedInner}>
          <div className={styles.relatedTitle}>Related Legal Documents</div>
          <motion.div className={styles.relatedGrid} {...relatedContainer}>
            {[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Cookie Policy',  href: '/cookies' },
              { label: 'Contact Us',     href: '/contact' },
            ].map(({ label, href }) => (
              <motion.div key={label} {...relatedBtn}>
                <Link href={href} className={styles.relatedBtn}>{label}</Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </PageShell>
  )
}