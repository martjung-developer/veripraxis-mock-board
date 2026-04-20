// lib/hooks/auth/useSignup.ts
// ─────────────────────────────────────────────────────────────────────────────
// Encapsulates every piece of state and logic for the student signup wizard.
// Zero JSX — returns plain values and callbacks consumed by components.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useRouter }             from 'next/navigation'
import {
  signUpStudent,
  signInWithGoogle,
  signInWithFacebook,
} from '@/lib/services/auth'
import {
  validateStudentIdInput,
  validateFullName,
  validateEmail,
  validateYearLevel,
  extractErrorMessage,
  getPasswordStrength,
} from '@/lib/utils/auth/'
import {
  INITIAL_SIGNUP_STATE,
} from '@/lib/types/auth/'
import type {
  SignupState,
  SignupStep,
  ProgramCode,
  YearLevel,
} from '@/lib/types/auth/'

// ── Return shape ──────────────────────────────────────────────────────────────
export interface UseSignupReturn {
  // State
  state:      SignupState
  stepIndex:  number
  loading:    boolean
  error:      string | null
  showPw:     boolean

  // Derived
  strength:   ReturnType<typeof getPasswordStrength>

  // Patch + UI helpers
  patch:      (partial: Partial<SignupState>) => void
  togglePw:   () => void
  clearError: () => void

  // Step navigation
  goBack:                  () => void
  handleIdNext:            () => void
  handleCredentialsNext:   () => void
  handleProgramNext:       () => void
  handleSignup:            () => Promise<void>

  // Social auth
  handleGoogle:   () => Promise<void>
  handleFacebook: () => Promise<void>
}

// ── STEP_ORDER constant (single source of truth) ──────────────────────────────
const STEPS: SignupStep[] = ['id', 'credentials', 'program', 'otp']
export { STEPS as SIGNUP_STEPS }

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSignup(): UseSignupReturn {
  const router = useRouter()

  const [state,   setState]   = useState<SignupState>(INITIAL_SIGNUP_STATE)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [showPw,  setShowPw]  = useState(false)

  const stepIndex = STEPS.indexOf(state.step)
  const strength  = getPasswordStrength(state.password)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const patch = useCallback((partial: Partial<SignupState>) => {
    setState((prev) => ({ ...prev, ...partial }))
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])
  const togglePw   = useCallback(() => setShowPw((v) => !v), [])

  // ── Navigation ───────────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    if (stepIndex === 0) { router.push('/login'); return }
    patch({ step: STEPS[stepIndex - 1] })
  }, [stepIndex, router, patch])

  // ── Step 1 ───────────────────────────────────────────────────────────────────

  const handleIdNext = useCallback(() => {
    const err = validateStudentIdInput(state.studentId)
    if (err) { setError(err); return }
    patch({ step: 'credentials' })
  }, [state.studentId, patch])

  // ── Step 2 ───────────────────────────────────────────────────────────────────

  const handleCredentialsNext = useCallback(() => {
    const nameErr = validateFullName(state.fullName)
    if (nameErr) { setError(nameErr); return }

    const emailErr = validateEmail(state.email)
    if (emailErr) { setError(emailErr); return }

    if (state.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    patch({ step: 'program' })
  }, [state.fullName, state.email, state.password, patch])

  // ── Step 3 ───────────────────────────────────────────────────────────────────

  const handleProgramNext = useCallback(() => {
    if (!state.programCode) { setError('Please select your program.'); return }

    const yrErr = validateYearLevel(state.yearLevel)
    if (yrErr) { setError(yrErr); return }

    patch({ step: 'otp' })
  }, [state.programCode, state.yearLevel, patch])

  // ── Final submit ──────────────────────────────────────────────────────────────

  const handleSignup = useCallback(async () => {
    if (!state.programCode)                 { setError('Invalid program.'); return }
    if (state.yearLevel === null)           { setError('Year level is required.'); return }

    setLoading(true)
    setError(null)

    try {
      const result = await signUpStudent(
        state.studentId,
        state.fullName,
        state.email,
        state.password,
        state.programCode as ProgramCode,
        state.yearLevel   as YearLevel,
      )
      if (!result.success) { setError(result.error); return }

      sessionStorage.setItem('verify_email', state.email)
      router.push('/verify-email')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [state, router])

  // ── Social auth ───────────────────────────────────────────────────────────────

  const handleGoogle = useCallback(async () => {
    setError(null)
    const result = await signInWithGoogle()
    if (!result.success) setError(result.error)
  }, [])

  const handleFacebook = useCallback(async () => {
    setError(null)
    const result = await signInWithFacebook()
    if (!result.success) setError(result.error)
  }, [])

  return {
    state, stepIndex, loading, error, showPw, strength,
    patch, togglePw, clearError, goBack,
    handleIdNext, handleCredentialsNext, handleProgramNext, handleSignup,
    handleGoogle, handleFacebook,
  }
}