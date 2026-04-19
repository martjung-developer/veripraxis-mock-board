// app/(auth)/verify-email/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Image         from 'next/image'
import Link          from 'next/link'
import { useRouter } from 'next/navigation'
import { motion }    from 'framer-motion'
import { Mail, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'
import { MoleculeBackground } from '@/animations/auth/MoleculeBackground'
import { verifyOtp, sendOtp }                       from '@/lib/services/auth/'
import { OTP_LENGTH, OTP_RESEND_COOLDOWN }          from '@/lib/constants/auth/'
import styles from '../auth.module.css'

export default function VerifyEmailPage() {
  const router = useRouter()

  const [code,      setCode]      = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading,   setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(OTP_RESEND_COOLDOWN)
  const [email,     setEmail]     = useState<string>('')
  const [error,     setError]     = useState<string | null>(null)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const saved = sessionStorage.getItem('verify_email')
    if (saved) { setEmail(saved) } else { router.replace('/signup') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function handleChange(i: number, val: string) {
    const char = val.replace(/\D/g, '').slice(-1)
    const next = [...code]; next[i] = char
    setCode(next); setError(null)
    if (char && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputsRef.current[i - 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    e.preventDefault()
    const next = [...code]
    pasted.split('').forEach((c, idx) => { next[idx] = c })
    setCode(next)
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError(null); setLoading(true)
    const result = await verifyOtp(email, code.join(''))
    setLoading(false)
    if (!result.verified) {
      setError(result.error)
      setCode(Array(OTP_LENGTH).fill(''))
      inputsRef.current[0]?.focus()
      return
    }
    sessionStorage.removeItem('verify_email')
    router.push(result.redirectTo)
  }

  async function handleResend() {
    if (!email) return
    setResending(true); setError(null)
    const result = await sendOtp(email)
    setResending(false)
    if (!result.sent) { setError(result.error); return }
    setCountdown(OTP_RESEND_COOLDOWN)
    setCode(Array(OTP_LENGTH).fill(''))
    inputsRef.current[0]?.focus()
  }

  const isComplete = code.every(Boolean)

  return (
    <>
      <MoleculeBackground />
      <div className={styles.authPage}>
        <motion.div className={styles.card}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}>

          <div className={styles.logoWrap}>
            <Image src="/images/veripraxis-logo.png" alt="VeriPraxis" height={44} width={160} className={styles.logoImg} priority />
          </div>

          {/* Email icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={22} color="#6366f1" strokeWidth={1.75} />
            </div>
          </div>

          <h1 className={styles.heading}>Check your email</h1>
          <p className={styles.subheading}>
            We sent a {OTP_LENGTH}-digit code to{' '}
            {email && <strong style={{ color: '#0f172a' }}>{email}</strong>}
          </p>

          {error && (
            <div className={styles.errorBanner} style={{ marginBottom: '0.75rem' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div>
              <label className={styles.label} style={{ display: 'block', textAlign: 'center', marginBottom: '0.75rem' }}>
                Verification Code
              </label>
              <div className={styles.otpRow} onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input key={i}
                    ref={(el) => { inputsRef.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={[
                      styles.otpInput,
                      digit ? styles.otpFilled : '',
                      error ? styles.otpError  : '',
                    ].join(' ')}
                    autoFocus={i === 0}
                    aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                  />
                ))}
              </div>
            </div>

            <motion.button type="submit" className={styles.submitBtn}
              disabled={loading || !isComplete}
              whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }}>
              {loading ? 'Verifying…' : <> Verify Email <ArrowRight size={15} strokeWidth={2.5} /></>}
            </motion.button>

            <div className={styles.resendRow}>
              Didn&apos;t receive it?{' '}
              {countdown > 0 ? (
                <span style={{ color: '#94a3b8' }}>Resend in {countdown}s</span>
              ) : (
                <button type="button" className={styles.resendBtn} onClick={handleResend} disabled={resending}>
                  {resending
                    ? 'Sending…'
                    : <><RefreshCw size={11} strokeWidth={2.5} style={{ display: 'inline', marginRight: 3 }} />Resend code</>}
                </button>
              )}
            </div>

            <p className={styles.switchPrompt}>
              Wrong email?{' '}
              <Link href="/signup" className={styles.switchLink}>Back to signup</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </>
  )
}