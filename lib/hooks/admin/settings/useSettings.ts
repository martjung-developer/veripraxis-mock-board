// lib/hooks/admin/settings/useSettings.ts
//
// Owns ALL page-level state and logic.
// Makes zero direct Supabase calls — it delegates everything to the service layer.

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/AuthContext'

import * as SettingsService from '@/lib/services/admin/settings/settings.service'

import type {
  AvatarUploadState,
  NavSection,
  PasswordFormState,
  PasswordStrength,
  PreferencesState,
  Profile,
  ProfileFormState,
  ToastState,
} from '@/lib/types/admin/settings/settings.types'

// ---------------------------------------------------------------------------
// Helpers (pure — not exported; only used inside the hook)
// ---------------------------------------------------------------------------

function deriveInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function derivePasswordStrength(pw: string): PasswordStrength | null {
  if (!pw) {
    return null
  }
  const score = [
    /[A-Z]/.test(pw),
    /[a-z]/.test(pw),
    /[0-9]/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
    pw.length >= 12,
  ].filter(Boolean).length
  if (score <= 2) {
    return 'weak'
  }
  if (score <= 3) {
    return 'fair'
  }
  return 'strong'
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseSettingsReturn {
  // Auth / loading
  authLoading: boolean
  loading: boolean

  // Data
  profile: Profile | null
  avatarUrl: string | null
  initials: string

  // Navigation
  activeSection: NavSection
  setActiveSection: (section: NavSection) => void

  // Toast
  toast: ToastState | null
  dismissToast: () => void

  // Profile form
  profileForm: ProfileFormState
  setFullName: (name: string) => void
  resetProfileForm: () => void
  handleSaveProfile: () => Promise<void>

  // Avatar
  avatarUpload: AvatarUploadState
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>

  // Password form
  passwordForm: PasswordFormState
  setCurrentPw: (v: string) => void
  setNewPw: (v: string) => void
  setConfirmPw: (v: string) => void
  toggleShowCurrent: () => void
  toggleShowNew: () => void
  toggleShowConfirm: () => void
  resetPasswordForm: () => void
  handleChangePassword: () => Promise<void>

  // Preferences
  preferences: PreferencesState
  toggleDarkMode: () => void
  toggleNotif: () => void
  toggleEmailNotif: () => void
  handleSavePreferences: () => void

  // Danger
  handleLogout: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSettings(): UseSettingsReturn {
  const router = useRouter()
  const { user, loading: authLoading } = useUser()

  // ── Core data ─────────────────────────────────────────────────────────────
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<NavSection>('profile')

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((next: ToastState) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToast(next)
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToast(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
  }, [])

  // ── Profile form ──────────────────────────────────────────────────────────
  const [fullName,      setFullName]      = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const profileForm: ProfileFormState = useMemo(
    () => ({ fullName, saving: savingProfile }),
    [fullName, savingProfile],
  )

  const resetProfileForm = useCallback(() => {
    setFullName(profile?.full_name ?? '')
  }, [profile])

  // ── Avatar ────────────────────────────────────────────────────────────────
  const [avatarUpload, setAvatarUpload] = useState<AvatarUploadState>({
    uploading: false,
    progress:  0,
    url:       null,
  })

  // ── Password form ─────────────────────────────────────────────────────────
  const [currentPw,   setCurrentPw]   = useState('')
  const [newPw,       setNewPw_]      = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPw,    setSavingPw]    = useState(false)

  // Derive strength on every newPw change — memoised to avoid re-running regex
  const pwStrength: PasswordStrength | null = useMemo(
    () => derivePasswordStrength(newPw),
    [newPw],
  )

  const setNewPw = useCallback((v: string) => setNewPw_(v), [])

  const passwordForm: PasswordFormState = useMemo(
    () => ({
      currentPw,
      newPw,
      confirmPw,
      showCurrent,
      showNew,
      showConfirm,
      saving:   savingPw,
      strength: pwStrength,
    }),
    [currentPw, newPw, confirmPw, showCurrent, showNew, showConfirm, savingPw, pwStrength],
  )

  const resetPasswordForm = useCallback(() => {
    setCurrentPw('')
    setNewPw_('')
    setConfirmPw('')
  }, [])

  const toggleShowCurrent = useCallback(() => setShowCurrent((v) => !v), [])
  const toggleShowNew     = useCallback(() => setShowNew((v) => !v), [])
  const toggleShowConfirm = useCallback(() => setShowConfirm((v) => !v), [])

  // ── Preferences ───────────────────────────────────────────────────────────
  const [preferences, setPreferences] = useState<PreferencesState>({
    darkMode:    false,
    notifEnabled: true,
    emailNotif:  true,
  })

  const toggleDarkMode   = useCallback(() => setPreferences((p) => ({ ...p, darkMode:     !p.darkMode })), [])
  const toggleNotif      = useCallback(() => setPreferences((p) => ({ ...p, notifEnabled: !p.notifEnabled })), [])
  const toggleEmailNotif = useCallback(() => setPreferences((p) => ({ ...p, emailNotif:   !p.emailNotif })), [])

  const handleSavePreferences = useCallback(() => {
    // Persist to DB / localStorage here when ready.
    showToast({ type: 'success', message: 'Preferences saved.' })
  }, [showToast])

  // ── Derived: initials ─────────────────────────────────────────────────────
  const initials = useMemo(
    () => deriveInitials(profile?.full_name ?? null, profile?.email ?? 'U'),
    [profile],
  )

  // ── Role guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) {
      return
    }
    if (!user) {
      router.replace('/login')
      return
    }

    const role =
      (user.user_metadata?.role as string | undefined) ??
      (user.app_metadata?.role  as string | undefined)

    if (role !== 'admin' && role !== 'faculty') {
      router.replace('/unauthorized')
    }
  }, [user, authLoading, router])

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false

    ;(async () => {
      const { data, error } = await SettingsService.getProfile(user.id)

      if (cancelled) {
        return
      }

      if (!error && data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setAvatarUrl(data.avatar_url ?? null)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSaveProfile = useCallback(async () => {
    if (!profile) {
      return
    }
    setSavingProfile(true)

    const { error } = await SettingsService.updateProfileName(profile.id, fullName.trim())

    setSavingProfile(false)

    if (error) {
      showToast({ type: 'error', message: 'Failed to save profile. Please try again.' })
    } else {
      setProfile((p) => (p ? { ...p, full_name: fullName.trim() } : p))
      showToast({ type: 'success', message: 'Profile updated successfully.' })
    }
  }, [profile, fullName, showToast])

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !profile) {
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        showToast({ type: 'error', message: 'Image must be smaller than 2 MB.' })
        return
      }

      setAvatarUpload({ uploading: true, progress: 10, url: null })

      const { data: publicUrl, error: uploadError } = await SettingsService.uploadAvatar(
        profile.id,
        file,
        (pct) => setAvatarUpload((prev) => ({ ...prev, progress: pct })),
      )

      if (uploadError || !publicUrl) {
        setAvatarUpload({ uploading: false, progress: 0, url: null })
        showToast({ type: 'error', message: 'Avatar upload failed.' })
        return
      }

      const { error: updateError } = await SettingsService.updateAvatarUrl(profile.id, publicUrl)

      // Brief pause so the 100% bar is visible before hiding
      setTimeout(() => {
        setAvatarUpload({ uploading: false, progress: 0, url: publicUrl })
      }, 600)

      if (updateError) {
        showToast({ type: 'error', message: 'Failed to save avatar URL.' })
      } else {
        setAvatarUrl(publicUrl)
        setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p))
        showToast({ type: 'success', message: 'Avatar updated successfully.' })
      }
    },
    [profile, showToast],
  )

  const handleChangePassword = useCallback(async () => {
    if (newPw !== confirmPw) {
      showToast({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    if (newPw.length < 8) {
      showToast({ type: 'error', message: 'Password must be at least 8 characters.' })
      return
    }

    setSavingPw(true)

    const { error: verifyError } = await SettingsService.verifyPassword(
      profile?.email ?? '',
      currentPw,
    )

    if (verifyError) {
      setSavingPw(false)
      showToast({ type: 'error', message: 'Current password is incorrect.' })
      return
    }

    const { error } = await SettingsService.updatePassword(newPw)

    setSavingPw(false)

    if (error) {
      showToast({ type: 'error', message: 'Failed to change password.' })
    } else {
      resetPasswordForm()
      showToast({ type: 'success', message: 'Password changed successfully.' })
    }
  }, [currentPw, newPw, confirmPw, profile, showToast, resetPasswordForm])

  const handleLogout = useCallback(async () => {
    await SettingsService.logout()
    window.location.href = '/login'
  }, [])

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    authLoading,
    loading,

    profile,
    avatarUrl,
    initials,

    activeSection,
    setActiveSection,

    toast,
    dismissToast,

    profileForm,
    setFullName,
    resetProfileForm,
    handleSaveProfile,

    avatarUpload,
    handleAvatarChange,

    passwordForm,
    setCurrentPw,
    setNewPw,
    setConfirmPw,
    toggleShowCurrent,
    toggleShowNew,
    toggleShowConfirm,
    resetPasswordForm,
    handleChangePassword,

    preferences,
    toggleDarkMode,
    toggleNotif,
    toggleEmailNotif,
    handleSavePreferences,

    handleLogout,
  }
}