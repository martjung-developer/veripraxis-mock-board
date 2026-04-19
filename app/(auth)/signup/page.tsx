// app/(auth)/signup/page.tsx
'use client'

import { useState }        from 'react'
import Image               from 'next/image'
import Link                from 'next/link'
import { useRouter }       from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { MoleculeBackground } from '@/animations/auth/MoleculeBackground'
import { signUpStudent, signInWithGoogle, signInWithFacebook } from '@/lib/services/auth/'
import {
  validateStudentIdInput,
  validateFullName,
  validateEmail,
  validateYearLevel,
  getPasswordStrength,
  isProgramCode,
  getProgramLabel,
  getYearLabel,
  extractErrorMessage,
} from '@/lib/utils/auth'
import {
  PROGRAMS,
  YEAR_LEVEL_OPTIONS,
  INITIAL_SIGNUP_STATE,
} from '@/lib/types/auth/'
import type { SignupState, ProgramCode, YearLevel } from '@/lib/types/auth/'
import styles from '../auth.module.css'

// ── Step titles ────────────────────────────────────────────────────────────

const STEP_META: Record<SignupState['step'], { title: string; subtitle: string }> = {
  id:          { title: "Let's get started",   subtitle: 'Enter your school-issued Student ID'           },
  credentials: { title: 'Create your account',  subtitle: 'Enter your name, email, and a secure password' },
  program:     { title: 'Choose your program',   subtitle: 'Select your program and current year level'    },
  otp:         { title: 'Confirm & create',      subtitle: 'Review your details before we create your account' },
}

const STEP_ORDER: SignupState['step'][] = ['id', 'credentials', 'program', 'otp']

function strengthClass(
  s: ReturnType<typeof getPasswordStrength>,
  mod: Record<string, string>,
): string {
  if (!s) return ''
  return mod[`strength${s.charAt(0).toUpperCase()}${s.slice(1)}`] ?? ''
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter()

  const [state,   setState]   = useState<SignupState>(INITIAL_SIGNUP_STATE)
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const stepIndex           = STEP_ORDER.indexOf(state.step)
  const { title, subtitle } = STEP_META[state.step]
  const strength            = getPasswordStrength(state.password)

  function patch(partial: Partial<SignupState>) {
    setState((prev) => ({ ...prev, ...partial }))
    setError(null)
  }

  function goBack() {
    if (stepIndex === 0) { router.push('/login'); return }
    patch({ step: STEP_ORDER[stepIndex - 1] })
  }

  // ── Step validators ────────────────────────────────────────────────────

  function handleIdNext() {
    const err = validateStudentIdInput(state.studentId)
    if (err) { setError(err); return }
    patch({ step: 'credentials' })
  }

  function handleCredentialsNext() {
    const nameErr  = validateFullName(state.fullName)
    if (nameErr)                       { setError(nameErr); return }
    const emailErr = validateEmail(state.email)
    if (emailErr)                      { setError(emailErr); return }
    if (state.password.length < 8)     { setError('Password must be at least 8 characters.'); return }
    patch({ step: 'program' })
  }

  function handleProgramNext() {
    if (!state.programCode)            { setError('Please select your program.'); return }
    const yrErr = validateYearLevel(state.yearLevel)
    if (yrErr)                         { setError(yrErr); return }
    patch({ step: 'otp' })
  }

  // ── Final submit ───────────────────────────────────────────────────────

  async function handleSignup() {
    if (!isProgramCode(state.programCode))  { setError('Invalid program.'); return }
    if (!state.yearLevel)                   { setError('Year level is required.'); return }

    setLoading(true); setError(null)

    try {
      const result = await signUpStudent(
        state.studentId,
        state.fullName,
        state.email,
        state.password,
        state.programCode as ProgramCode,
        state.yearLevel,
      )
      if (!result.success) { setError(result.error); setLoading(false); return }
      sessionStorage.setItem('verify_email', state.email)
      router.push('/verify-email')
    } catch (err) {
      setError(extractErrorMessage(err))
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    const result = await signInWithGoogle()
    if (!result.success) setError(result.error)
  }

  async function handleFacebook() {
    setError(null)
    const result = await signInWithFacebook()
    if (!result.success) setError(result.error)
  }

  // ── Back button (shared style) ─────────────────────────────────────────

  const backBtnStyle: React.CSSProperties = {
    flex:           '0 0 auto',
    padding:        '0.65rem 0.85rem',
    background:     '#f1f5f9',
    border:         '1px solid #e2e8f0',
    borderRadius:   10,
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <MoleculeBackground />

      <div className={styles.authPage}>
        <motion.div
          className={styles.card}
          key={state.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* ── Logo ── */}
          <div className={styles.logoWrap}>
            <Image
              src="/images/veripraxis-logo.png"
              alt="VeriPraxis"
              height={44}
              width={160}
              className={styles.logoImg}
              priority
            />
          </div>

          {/* ── Step indicator dots ── */}
          <div className={styles.stepRow}>
            {STEP_ORDER.map((s, i) => (
              <div
                key={s}
                className={[
                  styles.stepDot,
                  i === stepIndex ? styles.stepDotActive : '',
                  i  < stepIndex  ? styles.stepDotDone  : '',
                ].join(' ')}
              />
            ))}
          </div>

          <h1
            className={styles.heading}
            dangerouslySetInnerHTML={{ __html: title }}
          />
          <p className={styles.subheading}>{subtitle}</p>

          {/* Student-only notice on first step */}
          {state.step === 'id' && (
            <div style={{
              display:      'flex',
              alignItems:   'flex-start',
              gap:          '0.4rem',
              padding:      '0.55rem 0.8rem',
              marginBottom: '0.75rem',
              background:   '#f0fdf4',
              border:       '1px solid #bbf7d0',
              borderRadius: '9px',
              fontSize:     '0.75rem',
              color:        '#15803d',
              fontWeight:   500,
            }}>
              <CheckCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              Student registration only. Faculty &amp; admin accounts are managed by your institution.
            </div>
          )}

          {/* ── Error banner ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                className={styles.errorBanner}
                style={{ marginBottom: '0.75rem' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ STEP 1: Student ID ══ */}
          {state.step === 'id' && (
            <div className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="student-id">Student ID</label>
                <input
                  id="student-id"
                  className={styles.input}
                  type="text"
                  placeholder="STU-YYYYNNNNN  (e.g. STU-202400123)"
                  value={state.studentId}
                  onChange={(e) => patch({ studentId: e.target.value })}
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className={styles.fieldHint}>
                  Format: STU-YYYYNNNNN — issued by your school
                </span>
              </div>

              <motion.button
                type="button"
                className={styles.submitBtn}
                onClick={handleIdNext}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.985 }}
              >
                Continue <ArrowRight size={15} strokeWidth={2.5} />
              </motion.button>

              <div className={styles.divider}>
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>Or sign up with</span>
                <div className={styles.dividerLine} />
              </div>

              <div className={styles.socialGroup}>
                <button type="button" className={styles.googleBtn} onClick={handleGoogle}>
                  <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button type="button" className={styles.facebookBtn} onClick={handleFacebook}>
                  <svg className={styles.facebookIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M24 12.073C24 5.406 18.627 0 12 0S0 5.406 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.532-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
              </div>

              <p className={styles.switchPrompt}>
                Already have an account?{' '}
                <Link href="/login" className={styles.switchLink}>Log in</Link>
              </p>
            </div>
          )}

          {/* ══ STEP 2: Full Name + Credentials ══ */}
          {state.step === 'credentials' && (
            <div className={styles.form}>

              {/* Full Name — NEW */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="signup-fullname">Full Name</label>
                <input
                  id="signup-fullname"
                  className={styles.input}
                  type="text"
                  placeholder="e.g. Juan Dela Cruz"
                  value={state.fullName}
                  onChange={(e) => patch({ fullName: e.target.value })}
                  autoComplete="name"
                  spellCheck={false}
                />
                <span className={styles.fieldHint}>Enter your first and last name as it appears on school records.</span>
              </div>

              {/* Email */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="signup-email">Email Address</label>
                <input
                  id="signup-email"
                  className={styles.input}
                  type="email"
                  placeholder="you@email.com"
                  value={state.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="signup-password">Password</label>
                <div className={styles.inputWrap}>
                  <input
                    id="signup-password"
                    className={styles.input}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={state.password}
                    onChange={(e) => patch({ password: e.target.value })}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.inputToggle}
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw
                      ? <EyeOff size={15} strokeWidth={2} />
                      : <Eye   size={15} strokeWidth={2} />
                    }
                  </button>
                </div>
                {strength && (
                  <div className={`${styles.strengthRow} ${strengthClass(strength, styles as Record<string, string>)}`}>
                    {[0, 1, 2, 3].map((i) => <div key={i} className={styles.strengthBar} />)}
                    <span className={styles.strengthLabel}>
                      {{ weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' }[strength]}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={goBack} style={backBtnStyle}>
                  <ArrowLeft size={15} color="#64748b" />
                </button>
                <motion.button
                  type="button"
                  className={styles.submitBtn}
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={handleCredentialsNext}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                >
                  Continue <ArrowRight size={15} strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>
          )}

          {/* ══ STEP 3: Program + Year Level ══ */}
          {state.step === 'program' && (
            <div className={styles.form}>

              {/* Program grid */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Program</label>
                <div className={styles.programGrid}>
                  {PROGRAMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className={[
                        styles.programBtn,
                        state.programCode === p.value ? styles.programBtnActive : '',
                      ].join(' ')}
                      onClick={() => patch({ programCode: p.value })}
                    >
                      {p.value}
                    </button>
                  ))}
                </div>
                {state.programCode && (
                  <p style={{
                    fontSize:   '0.75rem',
                    color:      '#6366f1',
                    fontWeight: 500,
                    textAlign:  'center',
                    margin:     '0.35rem 0 0',
                  }}>
                    {getProgramLabel(state.programCode as ProgramCode)}
                  </p>
                )}
              </div>

              {/* Year Level — NEW */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Year Level</label>
                <div style={{
                  display:             'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap:                 '0.4rem',
                }}>
                  {YEAR_LEVEL_OPTIONS.map((yr) => (
                    <button
                      key={yr.value}
                      type="button"
                      onClick={() => patch({ yearLevel: yr.value })}
                      style={{
                        padding:      '0.5rem 0.25rem',
                        borderRadius: '9px',
                        border:       `1.5px solid ${state.yearLevel === yr.value ? '#6366f1' : '#e2e8f0'}`,
                        background:   state.yearLevel === yr.value ? '#eef2ff' : '#fff',
                        color:        state.yearLevel === yr.value ? '#4338ca' : '#475569',
                        fontFamily:   'inherit',
                        fontSize:     '0.75rem',
                        fontWeight:   state.yearLevel === yr.value ? 700 : 500,
                        cursor:       'pointer',
                        transition:   'all 0.15s ease',
                        textAlign:    'center',
                      }}
                    >
                      {yr.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={goBack} style={backBtnStyle}>
                  <ArrowLeft size={15} color="#64748b" />
                </button>
                <motion.button
                  type="button"
                  className={styles.submitBtn}
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={handleProgramNext}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                >
                  Continue <ArrowRight size={15} strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>
          )}

          {/* ══ STEP 4: Summary + Submit ══ */}
          {state.step === 'otp' && (
            <div className={styles.form}>
              <div style={{
                background:    '#f8fafc',
                border:        '1px solid #e2e8f0',
                borderRadius:  10,
                padding:       '0.85rem 1rem',
                display:       'flex',
                flexDirection: 'column',
                gap:           '0.4rem',
              }}>
                {[
                  { label: 'Student ID',  value: state.studentId  },
                  { label: 'Full Name',   value: state.fullName   },
                  { label: 'Email',       value: state.email      },
                  {
                    label: 'Program',
                    value: isProgramCode(state.programCode)
                      ? getProgramLabel(state.programCode as ProgramCode)
                      : '—',
                  },
                  {
                    label: 'Year Level',
                    value: getYearLabel(state.yearLevel),
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.79rem' }}
                  >
                    <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', margin: 0 }}>
                A verification code will be sent to your email after account creation.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={goBack} style={backBtnStyle}>
                  <ArrowLeft size={15} color="#64748b" />
                </button>
                <motion.button
                  type="button"
                  className={styles.submitBtn}
                  style={{ flex: 1, marginTop: 0 }}
                  disabled={loading}
                  onClick={handleSignup}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                >
                  {loading
                    ? 'Creating account…'
                    : <> Create Account <ArrowRight size={15} strokeWidth={2.5} /></>
                  }
                </motion.button>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </>
  )
}