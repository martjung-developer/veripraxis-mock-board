// app/(auth)/verify-email/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react'
import { verifyOtp, resendVerification } from '@/lib/auth/actions'
import styles from '../auth.module.css'

const CODE_LENGTH = 6

export default function VerifyEmailPage() {
  const router = useRouter()

  const [code,      setCode]      = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading,   setLoading]   = useState(false)
  const [resendSec, setResendSec] = useState(60)
  const [email,     setEmail]     = useState<string>('')
  const [error,     setError]     = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Read email saved by signup form so we know who to verify
  useEffect(() => {
    const saved = sessionStorage.getItem('verify_email')
    if (saved) {
      setEmail(saved)
    } else {
      // No email in session — send back to signup
      router.replace('/signup')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount only

  // Countdown timer for resend button
  useEffect(() => {
    if (resendSec <= 0) return
    const t = setTimeout(() => setResendSec((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendSec])

  function handleChange(i: number, val: string) {
    const char = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = char
    setCode(next)
    setError(null)
    if (char && i < CODE_LENGTH - 1) inputsRef.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    e.preventDefault()
    const next = [...code]
    pasted.split('').forEach((c, idx) => { next[idx] = c })
    setCode(next)
    // Focus last filled box
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError(null)
    setLoading(true)

    const otp    = code.join('')
    const result = await verifyOtp(email, otp)

    setLoading(false)

    if (!result.success) {
      setError(result.error)
      // Clear code boxes so user can re-enter
      setCode(Array(CODE_LENGTH).fill(''))
      inputsRef.current[0]?.focus()
      return
    }

    // Clean up session storage and redirect to dashboard
    sessionStorage.removeItem('verify_email')
    router.push(result.redirectTo)
  }

  async function handleResend() {
    if (!email) return
    setResending(true)
    setError(null)

    const result = await resendVerification(email)
    setResending(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    // Reset countdown and clear code
    setResendSec(60)
    setCode(Array(CODE_LENGTH).fill(''))
    inputsRef.current[0]?.focus()
  }

  const isComplete = code.every(Boolean)

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
          {/* Logo + back */}
          <div className={styles.formTopRow}>
            <Image
              src="/images/veripraxis-logo.png"
              alt="VeriPraxis"
              width={0}
              height={32}
              style={{ width: 'auto', height: 32 }}
              priority
            />
            <Link href="/signup" className={styles.backLink}>
              <ArrowLeft size={13} strokeWidth={2.5} /> Back to signup
            </Link>
          </div>

          {/* Mail icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={28} color="#60a5fa" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className={styles.formTitle} style={{ textAlign: 'center' }}>
            Check your email
          </h1>
          <p className={styles.formSubtitle} style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            We sent a 6-digit code to
          </p>
          {email && (
            <p style={{
              textAlign: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#e2e8f0',
              marginBottom: '1.75rem',
            }}>
              {email}
            </p>
          )}

          {/* Error banner */}
          {error && (
            <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>

            {/* OTP inputs */}
            <div>
              <label
                className={styles.label}
                style={{ display: 'block', textAlign: 'center', marginBottom: '0.875rem' }}
              >
                Verification Code
              </label>
              <div className={styles.otpRow} onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`${styles.otpInput} ${digit ? styles.otpFilled : ''} ${error ? styles.otpError : ''}`}
                    autoFocus={i === 0}
                    aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                  />
                ))}
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !isComplete}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              {loading ? 'Verifying…' : (
                <> Verify Email <ArrowRight size={15} strokeWidth={2.5} /></>
              )}
            </motion.button>

            {/* Resend */}
            <div className={styles.resendRow}>
              Didn&apos;t receive it?{' '}
              {resendSec > 0 ? (
                <span style={{ color: '#374151' }}>Resend in {resendSec}s</span>
              ) : (
                <button
                  type="button"
                  className={styles.resendBtn}
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? (
                    'Sending…'
                  ) : (
                    <><RefreshCw size={11} strokeWidth={2.5} style={{ display: 'inline', marginRight: 3 }} />Resend code</>
                  )}
                </button>
              )}
            </div>

          </form>
        </motion.div>
      </div>

      {/* ── RIGHT — PHOTO ── */}
      <div className={styles.photoPannel}>
        <Image
          src="https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&q=85"
          alt="Open notebook with pen"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />
        <div className={styles.photoOverlay} />
        <div className={styles.photoContent}>
          <div className={styles.photoTagline}>
            One last{' '}
            <span className={styles.photoTaglineAccent}>step.</span>
          </div>
          <p className={styles.photoSub}>
            Verify your email to unlock your account and start
            your board exam review journey.
          </p>
        </div>
      </div>

    </div>
  )
}