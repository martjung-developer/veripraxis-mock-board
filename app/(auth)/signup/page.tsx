// app/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, GraduationCap, BookOpen } from 'lucide-react'
import {
  formSwap, photoPanel, authSubmitBtn,
  authPage, formFields, formFieldItem, errorBanner,
} from '@/animations/auth/authAnimations'
import { signIn, signUp }   from '@/lib/auth/actions'
import { signInWithGoogle } from '@/lib/auth/client-actions'
import { SIGNUP_ROLES }     from '@/lib/types/auth'
import type { SignupRole }  from '@/lib/types/auth'
import LegalModal from '@/components/auth/LegalModal'
import styles from '../auth.module.css'

type DocType = 'terms' | 'privacy' | null

const PHOTOS = {
  login:  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=85',
  signup: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=85',
}

const ROLE_ICONS: Record<SignupRole, React.ElementType> = {
  student: GraduationCap,
  faculty: BookOpen,
}

const GRADUATION_CAP_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"
    viewBox="0 0 24 24" fill="none"
    stroke="white" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
  </svg>
`

export default function SignupPage() {
  const router = useRouter()
  const [mode,      setMode]      = useState<'login' | 'signup'>('signup')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [legalOpen, setLegalOpen] = useState<DocType>(null)

  function switchMode(next: 'login' | 'signup') {
    setShowPw(false)
    setError(null)
    setMode(next)
    router.replace(next === 'login' ? '/login' : '/signup')
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd     = new FormData(e.currentTarget)
    const result = await signIn(
      fd.get('email')    as string,
      fd.get('password') as string,
    )
    setLoading(false)
    if (!result.success) { setError(result.error); return }
    router.push(result.redirectTo)
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd     = new FormData(e.currentTarget)
    const role   = fd.get('role') as SignupRole
    const result = await signUp(
      fd.get('fullName') as string,
      fd.get('email')    as string,
      fd.get('password') as string,
      role,
    )
    setLoading(false)
    if (!result.success) { setError(result.error); return }

    const Swal = (await import('sweetalert2')).default
    await Swal.fire({
      html: `
        <div style="padding: 8px 0 4px">
          <div style="
            width: 80px; height: 80px; border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px;
            box-shadow: 0 8px 32px rgba(99,102,241,0.35);
          ">
            ${GRADUATION_CAP_SVG}
          </div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0 0 10px; letter-spacing: -0.02em;">Welcome to VeriPraxis!</h2>
          <p style="font-size: 0.925rem; color: #64748b; margin: 0 0 6px; line-height: 1.5;">Your account has been created successfully.</p>
          <p style="font-size: 0.875rem; font-weight: 600; background: linear-gradient(135deg, #3b82f6, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">Let's ace your board exam</p>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Go to Dashboard →',
      confirmButtonColor: '#4f46e5',
      background: '#ffffff',
      customClass: { popup: 'swal-popup-custom', confirmButton: 'swal-btn-custom' },
      allowOutsideClick: false,
      width: 360,
      padding: '2rem',
      showClass: { popup: 'swal-fade-in'  },
      hideClass: { popup: 'swal-fade-out' },
    })

    const destination = role === 'student' ? '/student/dashboard' : result.redirectTo
    router.push(destination)
  }

  async function handleGoogle() {
    setError(null)
    const result = await signInWithGoogle()
    if (!result.success) setError(result.error)
  }

  return (
    // ── Page entrance fade-up ──
    <motion.div className={styles.authPage} {...authPage}>

      {/* ── SWEET ALERT CUSTOM STYLES ── */}
      <style>{`
        .swal-popup-custom { border-radius: 20px !important; box-shadow: 0 25px 60px rgba(0,0,0,0.15) !important; border: 1px solid rgba(99,102,241,0.12) !important; }
        .swal-btn-custom { border-radius: 10px !important; font-weight: 600 !important; font-size: 0.9rem !important; padding: 10px 28px !important; letter-spacing: 0.01em !important; box-shadow: 0 4px 14px rgba(79,70,229,0.4) !important; transition: all 0.2s ease !important; }
        .swal-btn-custom:hover { transform: translateY(-1px) !important; box-shadow: 0 6px 20px rgba(79,70,229,0.5) !important; }
        .swal-fade-in  { animation: swalFadeIn  0.3s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .swal-fade-out { animation: swalFadeOut 0.2s ease-in !important; }
        @keyframes swalFadeIn  { from { opacity: 0; transform: scale(0.85) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes swalFadeOut { from { opacity: 1; transform: scale(1);    } to { opacity: 0; transform: scale(0.95); } }
      `}</style>

      {/* ── LEGAL MODAL ── */}
      <LegalModal open={legalOpen} onClose={() => setLegalOpen(null)} />

      {/* ── LEFT — FORM PANEL ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`form-${mode}`} className={styles.formPanel} {...formSwap}>
          <div className={styles.formInner}>

            <div className={styles.formTopRow}>
              <Image
                src="/images/veripraxis-logo.png"
                alt="VeriPraxis"
                width={0} height={32}
                style={{ width: 'auto', height: 32 }}
                priority
              />
              <Link href="/" className={styles.backLink}>
                <ArrowLeft size={13} strokeWidth={2.5} /> Back to site
              </Link>
            </div>

            <div className={styles.modeTabs}>
              <button
                className={`${styles.modeTab} ${mode === 'login'  ? styles.modeTabActive : ''}`}
                onClick={() => switchMode('login')}
              >Log In</button>
              <button
                className={`${styles.modeTab} ${mode === 'signup' ? styles.modeTabActive : ''}`}
                onClick={() => switchMode('signup')}
              >Sign Up</button>
              <motion.div
                className={styles.modeTabIndicator}
                animate={{ left: mode === 'login' ? 0 : '50%' }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>

            {/* ── Error banner spring-shake ── */}
            <AnimatePresence>
              {error && (
                <motion.div className={styles.errorBanner} {...errorBanner}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {mode === 'login' ? (
              <LoginForm
                loading={loading} showPw={showPw} setShowPw={setShowPw}
                onSubmit={handleLogin} onGoogle={handleGoogle}
                onSwitch={() => switchMode('signup')}
              />
            ) : (
              <SignupForm
                loading={loading} showPw={showPw} setShowPw={setShowPw}
                roleIcons={ROLE_ICONS}
                onSubmit={handleSignup} onGoogle={handleGoogle}
                onSwitch={() => switchMode('login')}
                onOpenLegal={setLegalOpen}
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── RIGHT — PHOTO PANEL ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`photo-${mode}`} className={styles.photoPannel} {...photoPanel}>
          <Image
            src={PHOTOS[mode]}
            alt={mode === 'login' ? 'Students studying' : 'Student at desk'}
            fill style={{ objectFit: 'cover' }} priority
          />
          <div className={styles.photoOverlay} />
          <div className={styles.photoContent}>
            {mode === 'login' ? (
              <>
                <div className={styles.photoTagline}>
                  Welcome back, <span className={styles.photoTaglineAccent}>reviewee.</span>
                </div>
                <p className={styles.photoSub}>
                  Your progress, analytics, and mock exams are waiting. Continue where you left off.
                </p>
              </>
            ) : (
              <>
                <div className={styles.photoTagline}>
                  Your board exam{' '}
                  <span className={styles.photoTaglineAccent}>success</span>{' '}
                  starts here.
                </div>
                <p className={styles.photoSub}>
                  Join thousands of Filipino reviewees who passed their PRC licensure exams using VeriPraxis.
                </p>
              </>
            )}
            <div className={styles.photoStats}>
              {[
                { value: '10K+', label: 'Reviewees' },
                { value: '94%',  label: 'Pass Rate'  },
                { value: '12',   label: 'Programs'   },
              ].map((s) => (
                <div key={s.label} className={styles.photoStat}>
                  <div className={styles.photoStatValue}>{s.value}</div>
                  <div className={styles.photoStatLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

    </motion.div>
  )
}

/* ── Shared sub-components ── */

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.googleBtn} onClick={onClick}>
      <svg className={styles.googleIcon} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  )
}

function LoginForm({ loading, showPw, setShowPw, onSubmit, onGoogle, onSwitch }: {
  loading: boolean; showPw: boolean; setShowPw: (v: boolean) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onGoogle: () => void; onSwitch: () => void
}) {
  return (
    <motion.form className={styles.form} onSubmit={onSubmit}
      style={{ marginTop: '1.75rem' }} {...formFields}>

      <motion.div className={styles.fieldGroup} {...formFieldItem}>
        <label className={styles.label} htmlFor="login-email">Email Address</label>
        <div className={styles.inputWrap}>
          <Mail size={15} strokeWidth={2} className={styles.inputIcon} />
          <input id="login-email" name="email" type="email" className={styles.input}
            placeholder="you@email.com" required autoComplete="email" />
        </div>
      </motion.div>

      <motion.div className={styles.fieldGroup} {...formFieldItem}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className={styles.label} htmlFor="login-password">Password</label>
          <Link href="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
        </div>
        <div className={styles.inputWrap}>
          <Lock size={15} strokeWidth={2} className={styles.inputIcon} />
          <input id="login-password" name="password" type={showPw ? 'text' : 'password'}
            className={styles.input} placeholder="Your password"
            required autoComplete="current-password" />
          <button type="button" className={styles.inputToggle} onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
          </button>
        </div>
      </motion.div>

      <motion.div className={styles.checkRow} {...formFieldItem}>
        <input type="checkbox" id="remember" className={styles.checkbox} />
        <label htmlFor="remember" className={styles.checkLabel}>Remember me for 30 days</label>
      </motion.div>

      <motion.div {...formFieldItem}>
        <motion.button type="submit" className={styles.submitBtn} disabled={loading} {...authSubmitBtn}>
          {loading ? 'Signing in…' : <> Log In <ArrowRight size={15} strokeWidth={2.5} /></>}
        </motion.button>
      </motion.div>

      <motion.div className={styles.divider} {...formFieldItem}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>or continue with</span>
        <div className={styles.dividerLine} />
      </motion.div>

      <motion.div {...formFieldItem}>
        <GoogleButton onClick={onGoogle} />
      </motion.div>

      <motion.p className={styles.switchPrompt} {...formFieldItem}>
        Don&apos;t have an account?{' '}
        <button type="button" className={styles.switchBtn} onClick={onSwitch}>Sign up free →</button>
      </motion.p>

    </motion.form>
  )
}

function SignupForm({ loading, showPw, setShowPw, roleIcons, onSubmit, onGoogle, onSwitch, onOpenLegal }: {
  loading: boolean; showPw: boolean; setShowPw: (v: boolean) => void
  roleIcons: Record<SignupRole, React.ElementType>
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onGoogle: () => void; onSwitch: () => void
  onOpenLegal: (doc: 'terms' | 'privacy') => void
}) {
  const [role,     setRole]     = useState<SignupRole>('student')
  const [password, setPassword] = useState('')
  const [agreed,   setAgreed]   = useState(false)

  function getStrength(pw: string) {
    if (!pw)            return null
    if (pw.length < 6)  return 'weak'
    if (pw.length < 10) return 'fair'
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 'strong'
    return 'good'
  }

  const strength      = getStrength(password)
  const strengthClass = strength
    ? styles[`strength${strength.charAt(0).toUpperCase()}${strength.slice(1)}`] : ''

  return (
    <motion.form className={styles.form} onSubmit={onSubmit}
      style={{ marginTop: '1.75rem' }} {...formFields}>
      <input type="hidden" name="role" value={role} />

      <motion.div className={styles.fieldGroup} {...formFieldItem}>
        <span className={styles.label}>I am a</span>
        <div className={styles.roleRow}>
          {SIGNUP_ROLES.map(({ value, label }) => {
            const Icon = roleIcons[value]
            return (
              <button key={value} type="button"
                className={`${styles.roleBtn} ${role === value ? styles.roleBtnActive : ''}`}
                onClick={() => setRole(value)}
              >
                <Icon size={15} strokeWidth={1.75} />
                {label}
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.35rem' }}>
          {SIGNUP_ROLES.find(r => r.value === role)?.description}
        </p>
      </motion.div>

      <motion.div className={styles.fieldGroup} {...formFieldItem}>
        <label className={styles.label} htmlFor="signup-name">Full Name</label>
        <div className={styles.inputWrap}>
          <Mail size={15} strokeWidth={2} className={styles.inputIcon} />
          <input id="signup-name" name="fullName" type="text" className={styles.input}
            placeholder="Juan dela Cruz" required autoComplete="name" />
        </div>
      </motion.div>

      <motion.div className={styles.fieldGroup} {...formFieldItem}>
        <label className={styles.label} htmlFor="signup-email">Email Address</label>
        <div className={styles.inputWrap}>
          <Mail size={15} strokeWidth={2} className={styles.inputIcon} />
          <input id="signup-email" name="email" type="email" className={styles.input}
            placeholder="you@email.com" required autoComplete="email" />
        </div>
      </motion.div>

      <motion.div className={styles.fieldGroup} {...formFieldItem}>
        <label className={styles.label} htmlFor="signup-password">Password</label>
        <div className={styles.inputWrap}>
          <Lock size={15} strokeWidth={2} className={styles.inputIcon} />
          <input id="signup-password" name="password" type={showPw ? 'text' : 'password'}
            className={styles.input} placeholder="Min. 8 characters"
            value={password} onChange={(e) => setPassword(e.target.value)}
            required autoComplete="new-password" />
          <button type="button" className={styles.inputToggle} onClick={() => setShowPw(!showPw)}>
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
      </motion.div>

      <motion.div className={styles.checkRow} {...formFieldItem}>
        <input type="checkbox" id="terms" className={styles.checkbox}
          checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
        <label htmlFor="terms" className={styles.checkLabel}>
          I agree to the{' '}
          <button type="button" className={styles.switchBtn} onClick={() => onOpenLegal('terms')}>
            Terms of Service
          </button>
          {' '}and{' '}
          <button type="button" className={styles.switchBtn} onClick={() => onOpenLegal('privacy')}>
            Privacy Policy
          </button>
        </label>
      </motion.div>

      <motion.div {...formFieldItem}>
        <motion.button type="submit" className={styles.submitBtn}
          disabled={loading || !agreed} {...authSubmitBtn}>
          {loading ? 'Creating account…'
            : <> Create Account <ArrowRight size={15} strokeWidth={2.5} /></>}
        </motion.button>
      </motion.div>

      <motion.div className={styles.divider} {...formFieldItem}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>or sign up with</span>
        <div className={styles.dividerLine} />
      </motion.div>

      <motion.div {...formFieldItem}>
        <GoogleButton onClick={onGoogle} />
      </motion.div>

      <motion.p className={styles.switchPrompt} {...formFieldItem}>
        Already have an account?{' '}
        <button type="button" className={styles.switchBtn} onClick={onSwitch}>Log in →</button>
      </motion.p>

    </motion.form>
  )
}