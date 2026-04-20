// app/(auth)/signup/page.tsx
'use client'

import Link                        from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, ArrowRight, ArrowLeft,
  AlertCircle, CheckCircle, Zap,
} from 'lucide-react'
import { useSignup, SIGNUP_STEPS }  from '@/lib/hooks/auth/useSignup'
import {
  PROGRAMS,
  YEAR_LEVEL_OPTIONS,
  isProgramCode,
  getProgramLabel,
} from '@/lib/types/auth/'
import type { ProgramCode } from '@/lib/types/auth/'
import styles from '../auth.module.css'

// ── Step titles ────────────────────────────────────────────────────────────

const STEP_META = {
  id:          { title: "Let's get started",   subtitle: 'Enter your school-issued Student ID'            },
  credentials: { title: 'Create your account',  subtitle: 'Enter your name, email, and a secure password'  },
  program:     { title: 'Choose your program',   subtitle: 'Select your program and current year level'     },
  otp:         { title: 'Confirm & create',      subtitle: 'Review your details before we create your account' },
} as const

// ── Shared back-button style ───────────────────────────────────────────────

const BACK_BTN_STYLE: React.CSSProperties = {
  flex:         '0 0 auto',
  padding:      '0.65rem 0.85rem',
  background:   '#f1f5f9',
  border:       '1px solid #e2e8f0',
  borderRadius: 10,
  cursor:       'pointer',
  display:      'flex',
  alignItems:   'center',
}

// ── Password strength → CSS class ─────────────────────────────────────────

function strengthClass(s: string | null, mod: Record<string, string>): string {
  if (!s) return ''
  return mod[`strength${s.charAt(0).toUpperCase()}${s.slice(1)}`] ?? ''
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SignupPage() {
  const {
    state, stepIndex, loading, error, showPw, strength,
    patch, togglePw,
    goBack,
    handleIdNext, handleCredentialsNext, handleProgramNext, handleSignup,
    handleGoogle, handleFacebook,
  } = useSignup()

  const { title, subtitle } = STEP_META[state.step]

  return (
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
        <div className={styles.logoIcon}>
          <Zap size={22} color="#ffffff" strokeWidth={2.5} />
        </div>

        {/* ── Step indicator dots ── */}
        <div className={styles.stepRow}>
          {SIGNUP_STEPS.map((s, i) => (
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

        <h1 className={styles.heading}>{title}</h1>
        <p className={styles.subheading}>{subtitle}</p>

        {/* Student-only notice (step 1 only) */}
        {state.step === 'id' && (
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '0.4rem',
            padding:      '0.55rem 0.8rem',
            marginBottom: '1rem',
            background:   '#f0fdf4',
            border:       '1px solid #bbf7d0',
            borderRadius: '9px',
            fontSize:     '0.75rem',
            color:        '#15803d',
            fontWeight:   500,
          }}>
            <CheckCircle size={13} style={{ flexShrink: 0 }} />
            Student registration only. Faculty &amp; admin accounts are managed by your institution.
          </div>
        )}

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              className={styles.errorBanner}
              style={{ marginBottom: '0.75rem' }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
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
                placeholder="STU-YYYYNNNNN (e.g. STU-202400123)"
                value={state.studentId}
                onChange={(e) => patch({ studentId: e.target.value })}
                autoComplete="off"
                spellCheck={false}
              />
              <span className={styles.fieldHint}>Format: STU-YYYYNNNNN — issued by your school</span>
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

            <p className={styles.switchPrompt}>
              Already have an account?{' '}
              <Link href="/login" className={styles.switchLink}>Sign in</Link>
            </p>
          </div>
        )}

        {/* ══ STEP 2: Full name + email + password ══ */}
        {state.step === 'credentials' && (
          <div className={styles.form}>

            {/* Full name — added */}
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
              <span className={styles.fieldHint}>
                Enter your first and last name as it appears on school records.
              </span>
            </div>

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
                  onClick={togglePw}
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
              <button type="button" onClick={goBack} style={BACK_BTN_STYLE}>
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

        {/* ══ STEP 3: Program + year level ══ */}
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

            {/* Year level — added */}
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
              <button type="button" onClick={goBack} style={BACK_BTN_STYLE}>
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

        {/* ══ STEP 4: Summary + submit ══ */}
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
                { label: 'Student ID', value: state.studentId                                      },
                { label: 'Full Name',  value: state.fullName                                       },
                { label: 'Email',      value: state.email                                          },
                {
                  label: 'Program',
                  value: isProgramCode(state.programCode)
                    ? getProgramLabel(state.programCode as ProgramCode)
                    : '—',
                },
                {
                  label: 'Year Level',
                  value: state.yearLevel
                    ? YEAR_LEVEL_OPTIONS.find((y) => y.value === state.yearLevel)?.label ?? '—'
                    : '—',
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
             We’ll send a verification code to your email to complete registration.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={goBack} style={BACK_BTN_STYLE}>
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
  )
}