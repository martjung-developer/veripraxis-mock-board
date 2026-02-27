// src/app/cookies/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  legalHero,
  toc,
  contentBody,
  contentSection,
  relatedContainer,
  relatedBtn,
} from '@/animations/legal/legalAnimations'
import PageShell from '@/components/layout/PageShell'
import legalStyles from './cookies.module.css'
import styles from './cookies.module.css'

const SECTIONS = [
  { id: 'what',        title: '1. What Are Cookies?'      },
  { id: 'types',       title: '2. Types of Cookies We Use' },
  { id: 'third-party', title: '3. Third-Party Cookies'     },
  { id: 'manage',      title: '4. Managing Cookies'        },
  { id: 'updates',     title: '5. Policy Updates'          },
  { id: 'contact',     title: '6. Contact'                 },
]

const COOKIE_TABLE = [
  { name: 'vp_session',    type: 'Essential',  duration: 'Session', purpose: 'Keeps you logged in during your session.'        },
  { name: 'vp_auth_token', type: 'Essential',  duration: '30 days', purpose: 'Remembers your login across sessions.'            },
  { name: 'vp_prefs',      type: 'Functional', duration: '1 year',  purpose: 'Stores your exam and display preferences.'        },
  { name: '_vp_analytics', type: 'Analytics',  duration: '2 years', purpose: 'Measures platform usage and feature adoption.'    },
  { name: '_ga',           type: 'Analytics',  duration: '2 years', purpose: 'Google Analytics session tracking (if enabled).'  },
]

const TYPE_COLOR: Record<string, string> = { Essential: '#dcfce7', Functional: '#dbeafe', Analytics: '#fef3c7' }
const TYPE_TEXT:  Record<string, string> = { Essential: '#15803d', Functional: '#1d4ed8', Analytics: '#b45309' }

export default function CookiesPage() {
  const [consent, setConsent] = useState<'all' | 'essential' | null>(null)

  return (
    <PageShell>
      <section className={legalStyles.hero}>
        <motion.div {...legalHero}>
          <span className={legalStyles.heroLabel}>Legal</span>
          <h1 className={legalStyles.heroTitle}>Cookie Policy</h1>
          <p className={legalStyles.heroMeta}>Last updated: January 1, 2025</p>
        </motion.div>
      </section>

      {/* ── Consent Banner ── */}
      <AnimatePresence>
        {!consent && (
          <motion.div
            className={styles.consentBanner}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className={styles.consentText}>
              <span>🍪</span>
              <span>We use cookies to improve your experience on Veripraxis. Choose your preference below.</span>
            </div>
            <div className={styles.consentActions}>
              <motion.button
                className={styles.consentEssential}
                onClick={() => setConsent('essential')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                Essential Only
              </motion.button>
              <motion.button
                className={styles.consentAll}
                onClick={() => setConsent('all')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                Accept All
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {consent && (
          <motion.div
            className={styles.consentConfirm}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            ✅ Your cookie preferences have been saved.{' '}
            <button className={styles.consentReset} onClick={() => setConsent(null)}>
              Change preferences
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={legalStyles.layout}>
        <motion.aside className={legalStyles.toc} {...toc}>
          <div className={legalStyles.tocTitle}>On this page</div>
          <ul className={legalStyles.tocList}>
            {SECTIONS.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className={legalStyles.tocLink}>{s.title}</a></li>
            ))}
          </ul>
        </motion.aside>

        <motion.div className={legalStyles.content} {...contentBody}>
          <motion.section {...contentSection} className={legalStyles.section} id="what">
            <h2 className={legalStyles.sectionTitle}>1. What Are Cookies?</h2>
            <p className={legalStyles.paragraph}>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences, keep you signed in, and understand how you use the platform.</p>
          </motion.section>

          <motion.section {...contentSection} className={legalStyles.section} id="types">
            <h2 className={legalStyles.sectionTitle}>2. Types of Cookies We Use</h2>
            <p className={legalStyles.paragraph}>Below is a list of cookies Veripraxis may set on your device:</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cookie Name</th><th>Type</th><th>Duration</th><th>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIE_TABLE.map((row) => (
                    <tr key={row.name}>
                      <td><code className={styles.code}>{row.name}</code></td>
                      <td>
                        <span className={styles.typeBadge} style={{ background: TYPE_COLOR[row.type], color: TYPE_TEXT[row.type] }}>
                          {row.type}
                        </span>
                      </td>
                      <td>{row.duration}</td>
                      <td>{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          <motion.section {...contentSection} className={legalStyles.section} id="third-party">
            <h2 className={legalStyles.sectionTitle}>3. Third-Party Cookies</h2>
            <p className={legalStyles.paragraph}>We may use third-party services such as Google Analytics for usage measurement. These services may set their own cookies and have their own privacy policies.</p>
          </motion.section>

          <motion.section {...contentSection} className={legalStyles.section} id="manage">
            <h2 className={legalStyles.sectionTitle}>4. Managing Cookies</h2>
            <p className={legalStyles.paragraph}>You can manage or delete cookies at any time through your browser settings. Note that disabling essential cookies may prevent you from logging in or using core features.</p>
          </motion.section>

          <motion.section {...contentSection} className={legalStyles.section} id="updates">
            <h2 className={legalStyles.sectionTitle}>5. Policy Updates</h2>
            <p className={legalStyles.paragraph}>We may update this Cookie Policy as we add new features. Material changes will be communicated via an in-app notice.</p>
          </motion.section>

          <motion.section {...contentSection} className={legalStyles.section} id="contact">
            <h2 className={legalStyles.sectionTitle}>6. Contact</h2>
            <p className={legalStyles.paragraph}>
              Questions? Email{' '}
              <a href="mailto:privacy@veripraxis.ph" className={legalStyles.email}>privacy@veripraxis.ph</a>.
            </p>
          </motion.section>
        </motion.div>
      </div>

      <div className={legalStyles.relatedLinks}>
        <div className={legalStyles.relatedInner}>
          <div className={legalStyles.relatedTitle}>Related Legal Documents</div>
          <motion.div className={legalStyles.relatedGrid} {...relatedContainer}>
            {[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Contact Us', href: '/contact' },
            ].map(({ label, href }) => (
              <motion.div key={label} {...relatedBtn}>
                <Link href={href} className={legalStyles.relatedBtn}>{label}</Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </PageShell>
  )
}