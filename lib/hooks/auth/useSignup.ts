// lib/hooks/auth/useSignup.ts
// ─────────────────────────────────────────────────────────────────────────────
// Encapsulates all state and logic for the student signup wizard.
// Zero JSX — returns plain values and callbacks consumed by SignupPage.
//
// EMAIL-ONLY FLOW: after signUpStudent succeeds the page shows a success
// modal and then redirects the student to /login.
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
  validatePhone,
  validateYearLevel,
  extractErrorMessage,
  getPasswordStrength,
} from '@/lib/utils/auth'
import { INITIAL_SIGNUP_STATE } from '@/lib/types/auth/'
import type {
  SignupState,
  SignupStep,
  ProgramCode,
  YearLevel,
  AuthResult,
} from '@/lib/types/auth/'

// ── Step order (single source of truth) ──────────────────────────────────────
const STEPS: SignupStep[] = ['id', 'credentials', 'program', 'review']
export { STEPS as SIGNUP_STEPS }

// ── Return shape ──────────────────────────────────────────────────────────────
export interface UseSignupReturn {
  // State
  state:      SignupState
  stepIndex:  number
  loading:    boolean
  error:      string | null
  showPw:     boolean
  strength:   ReturnType<typeof getPasswordStrength>

  // Helpers
  patch:      (partial: Partial<SignupState>) => void
  togglePw:   () => void
  clearError: () => void

  // Navigation
  goBack: () => void

  // Step handlers
  handleIdNext:          () => void
  handleCredentialsNext: () => void
  handleProgramNext:     () => void

  // Final submit — returns AuthResult so the page can show the success modal
  handleSignupWithReturn: () => Promise<AuthResult>

  // Social auth
  handleGoogle:   () => Promise<void>
  handleFacebook: () => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSignup(): UseSignupReturn {
  const router = useRouter()

  const [state,   setState]   = useState<SignupState>(INITIAL_SIGNUP_STATE)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [showPw,  setShowPw]  = useState(false)

  const stepIndex = STEPS.indexOf(state.step)
  const strength  = getPasswordStrength(state.password)

  // ── Helpers ───────────────────────────────────────────────────────────────

  const patch = useCallback((partial: Partial<SignupState>) => {
    setState((prev) => ({ ...prev, ...partial }))
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])
  const togglePw   = useCallback(() => setShowPw((v) => !v), [])

  // ── Navigation ────────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    if (stepIndex === 0) { router.push('/login'); return }
    patch({ step: STEPS[stepIndex - 1] })
  }, [stepIndex, router, patch])

  // ── Step 1: Student ID ────────────────────────────────────────────────────

  const handleIdNext = useCallback(() => {
    const err = validateStudentIdInput(state.studentId)
    if (err) { setError(err); return }
    patch({ step: 'credentials' })
  }, [state.studentId, patch])

  // ── Step 2: Name + email + phone + password ───────────────────────────────

  const handleCredentialsNext = useCallback(() => {
    const nameErr = validateFullName(state.fullName)
    if (nameErr) { setError(nameErr); return }

    const emailErr = validateEmail(state.email)
    if (emailErr) { setError(emailErr); return }

    // Phone is optional — only validate format when non-empty
    const phoneErr = validatePhone(state.phone)
    if (phoneErr) { setError(phoneErr); return }

    if (state.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    patch({ step: 'program' })
  }, [state.fullName, state.email, state.phone, state.password, patch])

  // ── Step 3: Program + year level ─────────────────────────────────────────

  const handleProgramNext = useCallback(() => {
    if (!state.programCode) { setError('Please select your program.'); return }

    const yrErr = validateYearLevel(state.yearLevel)
    if (yrErr) { setError(yrErr); return }

    patch({ step: 'review' })
  }, [state.programCode, state.yearLevel, patch])

  // ── Step 4: Final submit ─────────────────────────────────────────────────
  // Returns AuthResult so the page layer can open the success modal without
  // the hook needing to know anything about UI.

  const handleSignupWithReturn = useCallback(async (): Promise<AuthResult> => {
    if (!state.programCode) {
      const err = 'Invalid program. Please go back and select one.'
      setError(err)
      return { success: false, error: err }
    }
    if (state.yearLevel === null) {
      const err = 'Year level is required.'
      setError(err)
      return { success: false, error: err }
    }

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
        state.phone       || undefined,
      )

      if (!result.success) {setError(result.error)}
      return result
    } catch (err) {
      const msg = extractErrorMessage(err)
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [state])

  // ── Social auth ───────────────────────────────────────────────────────────

  const handleGoogle = useCallback(async () => {
    setError(null)
    const result = await signInWithGoogle()
    if (!result.success) {setError(result.error)}
  }, [])

  const handleFacebook = useCallback(async () => {
    setError(null)
    const result = await signInWithFacebook()
    if (!result.success) {setError(result.error)}
  }, [])

  return {
    state, stepIndex, loading, error, showPw, strength,
    patch, togglePw, clearError, goBack,
    handleIdNext, handleCredentialsNext, handleProgramNext,
    handleSignupWithReturn,
    handleGoogle, handleFacebook,
  }
}