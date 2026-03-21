// app/(auth)/reset-password/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import styles from '../auth.module.css'

function getStrength(pw: string): null | 'weak' | 'fair' | 'good' | 'strong' {
  if (!pw) return null
  if (pw.length < 6) return 'weak'
  if (pw.length < 10) return 'fair'
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw) && pw.length >= 10) return 'strong'
  return 'good'
}

export default function ResetPasswordPage() {
  const [showPw,   setShowPw]   = useState(false)
  const [showPw2,  setShowPw2]  = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const strength = getStrength(password)
  const strengthClass = strength
    ? styles[`strength${strength.charAt(0).toUpperCase()}${strength.slice(1)}`]
    : ''
  const mismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mismatch) return
    setLoading(true)
    // TODO: supabase.auth.updateUser({ password })
    // then redirect to /login
    setTimeout(() => { setLoading(false); setDone(true) }, 1400)
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
            {!done ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className={styles.formTitle}>Set new password</h1>
                <p className={styles.formSubtitle}>
                  Choose a strong password to keep your account secure.
                </p>

                <form className={styles.form} onSubmit={handleSubmit}>

                  {/* New password */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="password">New Password</label>
                    <div className={styles.inputWrap}>
                      <Lock size={15} strokeWidth={2} className={styles.inputIcon} />
                      <input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" className={styles.inputToggle} onClick={() => setShowPw(v => !v)}>
                        {showPw ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                      </button>
                    </div>
                    {strength && (
                      <>
                        <div className={`${styles.strengthRow} ${strengthClass}`}>
                          {[...Array(4)].map((_, i) => <div key={i} className={styles.strengthBar} />)}
                        </div>
                        <div className={`${styles.strengthRow} ${strengthClass}`}>
                          <span className={styles.strengthLabel}>
                            {{ weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' }[strength]}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Confirm */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="confirm">Confirm Password</label>
                    <div className={styles.inputWrap}>
                      <Lock size={15} strokeWidth={2} className={styles.inputIcon} />
                      <input
                        id="confirm"
                        type={showPw2 ? 'text' : 'password'}
                        className={`${styles.input} ${mismatch ? styles.inputError : ''}`}
                        placeholder="Repeat your password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" className={styles.inputToggle} onClick={() => setShowPw2(v => !v)}>
                        {showPw2 ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                      </button>
                    </div>
                    {mismatch && (
                      <span className={styles.errorMsg}>Passwords don&apos;t match</span>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || mismatch || !password}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    {loading ? 'Updating…' : 'Set New Password'}
                  </motion.button>
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
                <h1 className={styles.formTitle}>Password updated!</h1>
                <p className={styles.formSubtitle}>
                  Your password has been changed successfully.
                  You can now log in with your new password.
                </p>
                <Link href="/login" className={styles.submitBtn}>
                  Go to Login
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── RIGHT — PHOTO ── */}
      <div className={styles.photoPannel}>
        <Image
          src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&q=85"
          alt="Library resources"
          fill
          className={styles.photoImg}
          priority
        />
        <div className={styles.photoOverlay} />
        <div className={styles.photoContent}>
          <div className={styles.photoTagline}>
            Set a{' '}
            <span className={styles.photoTaglineAccent}>strong</span>{' '}
            new password.
          </div>
          <p className={styles.photoSub}>
            Use at least 10 characters with uppercase letters
            and numbers for maximum security.
          </p>
        </div>
      </div>

    </div>
  )
}