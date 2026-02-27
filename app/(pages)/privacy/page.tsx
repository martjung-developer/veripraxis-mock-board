// src/app/privacy/page.tsx
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
import styles from './privacy.module.css'

const SECTIONS = [
  { id: 'information', title: '1. Information We Collect'   },
  { id: 'use',         title: '2. How We Use Your Information' },
  { id: 'sharing',     title: '3. Information Sharing'       },
  { id: 'cookies',     title: '4. Cookies & Tracking'        },
  { id: 'security',    title: '5. Data Security'             },
  { id: 'rights',      title: '6. Your Rights'               },
  { id: 'children',    title: "7. Children's Privacy"        },
  { id: 'changes',     title: '8. Changes to This Policy'    },
  { id: 'contact',     title: '9. Contact Us'                },
]

export default function PrivacyPage() {
  return (
    <PageShell>
      <section className={styles.hero}>
        <motion.div {...legalHero}>
          <span className={styles.heroLabel}>Legal</span>
          <h1 className={styles.heroTitle}>Privacy Policy</h1>
          <p className={styles.heroMeta}>Last updated: January 1, 2025 · Effective: January 1, 2025</p>
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
            Your privacy matters to us. Veripraxis collects only what&#39;s necessary to provide and
            improve our service. We do not sell your personal data to third parties.
          </motion.div>

          <motion.section {...contentSection} className={styles.section} id="information">
            <h2 className={styles.sectionTitle}>1. Information We Collect</h2>
            <p className={styles.paragraph}>When you register and use Veripraxis, we may collect the following types of information:</p>
            <ul className={styles.list}>
              <li><strong>Account data</strong>: Your name, email address, and password (hashed).</li>
              <li><strong>Profile data</strong>: Exam program, educational background, and study goals you voluntarily provide.</li>
              <li><strong>Usage data</strong>: Exam scores, question responses, time spent, and feature interactions.</li>
              <li><strong>Device data</strong>: Browser type, operating system, IP address, and device identifiers.</li>
              <li><strong>Payment data</strong>: Processed securely via Paymongo; we do not store card numbers.</li>
            </ul>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="use">
            <h2 className={styles.sectionTitle}>2. How We Use Your Information</h2>
            <p className={styles.paragraph}>We use your information to:</p>
            <ul className={styles.list}>
              <li>Provide and maintain your account and exam sessions.</li>
              <li>Personalize your study experience and analytics dashboard.</li>
              <li>Send transactional emails (receipts, password resets, exam reminders).</li>
              <li>Send optional marketing emails — you can unsubscribe at any time.</li>
              <li>Improve our question bank, features, and overall platform quality.</li>
              <li>Comply with legal obligations and prevent fraud.</li>
            </ul>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="sharing">
            <h2 className={styles.sectionTitle}>3. Information Sharing</h2>
            <p className={styles.paragraph}>We do <strong>not</strong> sell, trade, or rent your personal information. We may share data with trusted third parties only in these circumstances:</p>
            <ul className={styles.list}>
              <li><strong>Service providers</strong>: Payment processors, email delivery, and cloud hosting under strict data processing agreements.</li>
              <li><strong>Legal requirements</strong>: If required by Philippine law or valid legal process.</li>
              <li><strong>Business transfers</strong>: In the event of a merger or acquisition, your data may transfer with appropriate notice.</li>
            </ul>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="cookies">
            <h2 className={styles.sectionTitle}>4. Cookies & Tracking</h2>
            <p className={styles.paragraph}>
              We use cookies and similar technologies to keep you logged in, remember your preferences, and analyze platform usage.
              See our <Link href="/cookies" className={styles.email}>Cookie Policy</Link> for full details.
            </p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="security">
            <h2 className={styles.sectionTitle}>5. Data Security</h2>
            <p className={styles.paragraph}>We implement industry-standard security measures including TLS encryption, hashed passwords (bcrypt), and access controls. If you believe your account has been compromised, contact us immediately.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="rights">
            <h2 className={styles.sectionTitle}>6. Your Rights</h2>
            <p className={styles.paragraph}>As a user, you have the right to:</p>
            <ul className={styles.list}>
              <li><strong>Access</strong> the personal data we hold about you.</li>
              <li><strong>Correct</strong> inaccurate or incomplete data.</li>
              <li><strong>Delete</strong> your account and associated data at any time.</li>
              <li><strong>Opt out</strong> of marketing communications.</li>
              <li><strong>Export</strong> your exam history and performance data.</li>
            </ul>
            <p className={styles.paragraph}>To exercise any of these rights, email <a href="mailto:privacy@veripraxis.ph" className={styles.email}>privacy@veripraxis.ph</a>.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="children">
            <h2 className={styles.sectionTitle}>7. Children&#39;s Privacy</h2>
            <p className={styles.paragraph}>Veripraxis is intended for users 18 years of age and older. We do not knowingly collect data from children under 18. Contact us if you believe a minor has created an account.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="changes">
            <h2 className={styles.sectionTitle}>8. Changes to This Policy</h2>
            <p className={styles.paragraph}>We may update this Privacy Policy periodically. Material changes will be communicated via email or an in-app notice.</p>
          </motion.section>

          <motion.section {...contentSection} className={styles.section} id="contact">
            <h2 className={styles.sectionTitle}>9. Contact Us</h2>
            <p className={styles.paragraph}>
              For privacy-related questions, contact our Data Privacy Officer at{' '}
              <a href="mailto:privacy@veripraxis.ph" className={styles.email}>privacy@veripraxis.ph</a>.
            </p>
          </motion.section>
        </motion.div>
      </div>

      <div className={styles.relatedLinks}>
        <div className={styles.relatedInner}>
          <div className={styles.relatedTitle}>Related Legal Documents</div>
          <motion.div className={styles.relatedGrid} {...relatedContainer}>
            {[
              { label: 'Terms of Service', href: '/terms'   },
              { label: 'Cookie Policy',    href: '/cookies' },
              { label: 'Contact Us',       href: '/contact' },
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