'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import PageShell from '@/components/layout/PageShell'
import styles from './contact.module.css'

/* ✅ Public page presets */
import {
  pageEntry,
  heroContainer,
  heroItem,
  revealUp,
} from '@/animations/presets/publicPage'

/* ✅ Contact-specific animations */
import {
  channelsCol,
  formCol,
  channelsContainer,
  channelCard,
  formContainer,
  formField,
} from '@/animations/contact/contactAnimations'

const CHANNELS = [
  { icon: '📧', title: 'Email Support', value: 'support@veripraxis.ph', note: 'We reply within 24 hours' },
  { icon: '💬', title: 'Live Chat', value: 'Chat available on the platform', note: 'Mon–Fri, 9AM–6PM PHT' },
  { icon: '📱', title: 'Facebook Page', value: 'facebook.com/veripraxis', note: 'DMs answered daily' },
  { icon: '📣', title: 'Community Forum', value: 'Join our reviewee Discord', note: '3,500+ active members' },
]

const OFFICE_HOURS = [
  { day: 'Monday – Friday', time: '9:00 AM – 6:00 PM PHT' },
  { day: 'Saturday', time: '10:00 AM – 3:00 PM PHT' },
  { day: 'Sunday', time: 'Closed' },
]

const TOPICS = [
  'General Inquiry',
  'Technical Support',
  'Billing / Subscription',
  'Content / Question Error',
  'Partnership',
  'Press / Media',
]

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <PageShell>
      <motion.main {...pageEntry} className={styles.page}>
        {/* ───────────────── HERO ───────────────── */}
        <motion.section {...heroContainer} className={styles.hero}>
          <motion.span {...heroItem} className={styles.heroLabel}>
            Contact Us
          </motion.span>
          <motion.h1 {...heroItem} className={styles.heroTitle}>
            We&apos;re here to help
          </motion.h1>
          <motion.p {...heroItem} className={styles.heroSub}>
            Whether it&apos;s a technical issue, a billing question, or just a suggestion —
            reach out and we&apos;ll get back to you as soon as possible.
          </motion.p>
        </motion.section>

        {/* ───────────────── CHANNELS & FORM ───────────────── */}
        <div className={styles.main}>
          {/* Channels */}
          <motion.section {...channelsCol} className={styles.channelsCol}>
            <span className={styles.colLabel}>Get in Touch</span>
            <h2 className={styles.colTitle}>Choose your preferred channel</h2>
            <p className={styles.colSub}>
              Multiple ways to reach us — pick the one that&apos;s most convenient for you.
            </p>

            <motion.div {...channelsContainer} className={styles.channels}>
              {CHANNELS.map((ch) => (
                <motion.div
                  key={ch.title}
                  {...channelCard}
                  className={styles.channelCard}
                >
                  <div className={styles.channelIcon}>{ch.icon}</div>
                  <div className={styles.channelText}>
                    <div className={styles.channelTitle}>{ch.title}</div>
                    <div className={styles.channelValue}>{ch.value}</div>
                    <div className={styles.channelNote}>{ch.note}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div {...revealUp(0.2)} className={styles.officeHours}>
              <div className={styles.officeHoursTitle}>🕐 Office Hours</div>
              {OFFICE_HOURS.map((row) => (
                <div key={row.day} className={styles.officeHoursRow}>
                  <span className={styles.officeHoursDay}>{row.day}</span>
                  <span>{row.time}</span>
                </div>
              ))}
            </motion.div>
          </motion.section>

          {/* Form */}
          <motion.section {...formCol} className={styles.formCard}>
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className={styles.success}
                >
                  <div className={styles.successIcon}>✅</div>
                  <h3 className={styles.formTitle}>Message sent!</h3>
                  <p className={styles.formSub}>
                    We&apos;ll get back to you within 24 hours.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h2 className={styles.formTitle}>Send us a message</h2>
                  <p className={styles.formSub}>
                    Fill out the form and we&apos;ll respond promptly.
                  </p>

                  <motion.form onSubmit={handleSubmit} {...formContainer}>
                    <motion.div {...formField} className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>First Name</label>
                        <input required className={styles.formInput} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Last Name</label>
                        <input required className={styles.formInput} />
                      </div>
                    </motion.div>

                    <motion.div {...formField} className={styles.formGroup}>
                      <label className={styles.formLabel}>Email Address</label>
                      <input type="email" required className={styles.formInput} />
                    </motion.div>

                    <motion.div {...formField} className={styles.formGroup}>
                      <label className={styles.formLabel}>Topic</label>
                      <select required className={styles.formSelect}>
                        <option value="">Select a topic…</option>
                        {TOPICS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </motion.div>

                    <motion.div {...formField} className={styles.formGroup}>
                      <label className={styles.formLabel}>Message</label>
                      <textarea required className={styles.formTextarea} />
                    </motion.div>

                    <motion.button
                      type="submit"
                      className={styles.submitBtn}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      Send Message →
                    </motion.button>

                    <p className={styles.formNote}>
                      We respect your privacy. Your information is never shared.
                    </p>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </motion.main>
    </PageShell>
  )
}