// app/(auth)/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import styles from '../auth.module.css'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // TODO: supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })
    setTimeout(() => { setLoading(false); setSent(true) }, 1400)
  }

  return (
    <div className={styles.authPage}>

      {/* ── LEFT — FORM ── */}
      <div className={styles.formPanel}>
        <motion.div
          className={styles.formInner}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className={styles.formTopRow}>
            <Image src="/images/veripraxis-logo.png" alt="VeriPraxis" width={120} height={34} priority />
            <Link href="/login" className={styles.backLink}>
              <ArrowLeft size={13} strokeWidth={2.5} /> Back to login
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className={styles.formTitle}>Forgot password?</h1>
                <p className={styles.formSubtitle}>
                  Enter your email and we&apos;ll send you a reset link.
                  It expires in 1 hour.
                </p>

                <form className={styles.form} onSubmit={handleSubmit}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="email">Email Address</label>
                    <div className={styles.inputWrap}>
                      <Mail size={15} strokeWidth={2} className={styles.inputIcon} />
                      <input
                        id="email"
                        type="email"
                        className={styles.input}
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    {loading ? 'Sending…' : (
                      <>Send Reset Link <ArrowRight size={15} strokeWidth={2.5} /></>
                    )}
                  </motion.button>

                  <div style={{ textAlign: 'center' }}>
                    <Link href="/login" className={styles.forgotLink}>← Back to login</Link>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <CheckCircle size={52} color="#22c55e" strokeWidth={1.5} />
                </div>
                <h1 className={styles.formTitle}>Check your email</h1>
                <p className={styles.formSubtitle}>
                  We sent a password reset link to{' '}
                  <strong style={{ color: '#e2e8f0' }}>{email}</strong>.
                  Check your spam folder if you don&apos;t see it.
                </p>
                <div className={styles.successBox} style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    Wrong email?{' '}
                    <button
                      className={styles.resendBtn}
                      style={{ display: 'inline', fontSize: '0.82rem' }}
                      onClick={() => { setSent(false); setEmail('') }}
                    >
                      Try a different one
                    </button>
                  </span>
                </div>
                <Link href="/login" className={styles.submitBtn}>
                  Back to Login
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── RIGHT — PHOTO ── */}
      <div className={styles.photoPannel}>
        <Image
          src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=85"
          alt="Books on desk"
          fill
          className={styles.photoImg}
          priority
        />
        <div className={styles.photoOverlay} />
        <div className={styles.photoContent}>
          <div className={styles.photoTagline}>
            Happens to the{' '}
            <span className={styles.photoTaglineAccent}>best</span>{' '}
            of us.
          </div>
          <p className={styles.photoSub}>
            A quick reset and you&apos;ll be back to reviewing
            in no time. Your progress is safe.
          </p>
        </div>
      </div>

    </div>
  )
}