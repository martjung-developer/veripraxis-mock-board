// app/(dashboard)/admin/settings/page.tsx
'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Shield, Camera, Key, Bell, Moon, LogOut,
  AlertTriangle, CheckCircle2, XCircle, Save, Eye, EyeOff, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/AuthContext'
import type { Database } from '@/lib/types/database'
import {
  containerVariants, sectionVariants, formVariants, fieldVariants,
  avatarVariants, buttonVariants, dangerButtonVariants, toastVariants,
} from '@/animations/admin/settings/settings'
import s from './settings.module.css'

type Profile    = Database['public']['Tables']['profiles']['Row']
type NavSection = 'profile' | 'password' | 'preferences' | 'danger'
type Toast      = { type: 'success' | 'error'; message: string } | null

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function getPasswordStrength(pw: string): 'weak' | 'fair' | 'strong' | null {
  if (!pw) return null
  const score = [/[A-Z]/.test(pw), /[a-z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw), pw.length >= 12].filter(Boolean).length
  if (score <= 2) return 'weak'
  if (score <= 3) return 'fair'
  return 'strong'
}

export default function SettingsPage() {
  const router   = useRouter()
  const { user, loading: authLoading } = useUser()
  const supabase = createClient()

  const [profile,        setProfile]        = useState<Profile | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [activeSection,  setActiveSection]  = useState<NavSection>('profile')
  const [toast,          setToast]          = useState<Toast>(null)

  // Profile form
  const [fullName,       setFullName]       = useState('')
  const [savingProfile,  setSavingProfile]  = useState(false)

  // Avatar
  const fileInputRef                        = useRef<HTMLInputElement>(null)
  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(null)
  const [uploadPct,      setUploadPct]      = useState<number>(0)
  const [uploading,      setUploading]      = useState(false)

  // Password
  const [currentPw,   setCurrentPw]   = useState('')
  const [newPw,        setNewPw]        = useState('')
  const [confirmPw,    setConfirmPw]    = useState('')
  const [showCurrent,  setShowCurrent]  = useState(false)
  const [showNew,      setShowNew]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [savingPw,     setSavingPw]     = useState(false)
  const pwStrength                      = getPasswordStrength(newPw)

  // Preferences (UI-only toggles — extend to persist in DB/localStorage as needed)
  const [darkMode,     setDarkMode]     = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [emailNotif,   setEmailNotif]   = useState(true)

  /* ── Role guard ── */
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    const role = (user.user_metadata?.role as string | undefined) ?? (user.app_metadata?.role as string | undefined)
    if (role !== 'admin' && role !== 'faculty') router.replace('/unauthorized')
  }, [user, authLoading, router])

  /* ── Load profile using useUser() — no duplicate auth call ── */
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single() as unknown as { data: Profile | null; error: unknown }

      if (!error && data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setAvatarUrl(data.avatar_url)
      }
      setLoading(false)
    })()
  }, [user, supabase])

  /* ── Auto-dismiss toast ── */
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  /* ── Save profile ── */
  const handleSaveProfile = useCallback(async () => {
    if (!profile) return
    setSavingProfile(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() } as unknown)
      .eq('id', profile.id)
    setSavingProfile(false)
    if (error) {
      setToast({ type: 'error', message: 'Failed to save profile. Please try again.' })
    } else {
      setProfile((p) => p ? { ...p, full_name: fullName.trim() } : p)
      setToast({ type: 'success', message: 'Profile updated successfully.' })
    }
  }, [profile, fullName, supabase])

  /* ── Upload avatar ── */
  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 2 * 1024 * 1024) { setToast({ type: 'error', message: 'Image must be smaller than 2 MB.' }); return }

    setUploading(true); setUploadPct(10)
    const ext  = file.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`

    const ticker = setInterval(() => { setUploadPct((p) => Math.min(p + 15, 85)) }, 200)
    const { error: storageError } = await supabase.storage.from('profile_images').upload(path, file, { upsert: true, contentType: file.type })
    clearInterval(ticker)

    if (storageError) { setUploading(false); setUploadPct(0); setToast({ type: 'error', message: 'Avatar upload failed.' }); return }

    const { data: { publicUrl } } = supabase.storage.from('profile_images').getPublicUrl(path)
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() } as unknown).eq('id', profile.id)

    setUploadPct(100)
    setTimeout(() => { setUploading(false); setUploadPct(0) }, 600)

    if (updateError) { setToast({ type: 'error', message: 'Failed to save avatar URL.' }) }
    else { setAvatarUrl(publicUrl); setProfile((p) => p ? { ...p, avatar_url: publicUrl } : p); setToast({ type: 'success', message: 'Avatar updated successfully.' }) }
  }, [profile, supabase])

  /* ── Change password ── */
  const handleChangePassword = useCallback(async () => {
    if (newPw !== confirmPw) { setToast({ type: 'error', message: 'New passwords do not match.' }); return }
    if (newPw.length < 8) { setToast({ type: 'error', message: 'Password must be at least 8 characters.' }); return }

    setSavingPw(true)
    const email = profile?.email ?? ''
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPw })
    if (signInError) { setSavingPw(false); setToast({ type: 'error', message: 'Current password is incorrect.' }); return }

    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) { setToast({ type: 'error', message: 'Failed to change password.' }) }
    else { setCurrentPw(''); setNewPw(''); setConfirmPw(''); setToast({ type: 'success', message: 'Password changed successfully.' }) }
  }, [currentPw, newPw, confirmPw, profile, supabase])

  /* ── Logout ── */
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [supabase])

  if (authLoading || loading) {
    return (
      <div className={s.page}>
        <div className={s.layout}>
          <div className={s.nav} />
          <div className={s.content}>{[1, 2, 3].map((i) => <div key={i} className={s.card} style={{ height: 160, background: 'var(--surface-tint)' }} />)}</div>
        </div>
      </div>
    )
  }

  if (!user || !profile) return null

  const initials = getInitials(profile.full_name ?? null, profile.email ?? 'U')

  const navItems: { key: NavSection; label: string; icon: React.ReactNode }[] = [
    { key: 'profile',     label: 'Profile',     icon: <User size={14} />          },
    { key: 'password',    label: 'Password',    icon: <Key size={14} />           },
    { key: 'preferences', label: 'Preferences', icon: <Bell size={14} />          },
    { key: 'danger',      label: 'Danger Zone', icon: <AlertTriangle size={14} /> },
  ]

  return (
    <motion.div className={s.page} variants={containerVariants} initial="hidden" animate="visible">

      {/* ── Page header ── */}
      <motion.div className={s.header} variants={sectionVariants}>
        <div className={s.headerLeft}>
          <h1 className={s.pageTitle}>Settings</h1>
          <p className={s.pageSub}>Manage your profile, security, and preferences.</p>
        </div>
      </motion.div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div className={`${s.toast} ${toast.type === 'success' ? s.toastSuccess : s.toastError}`} variants={toastVariants} initial="hidden" animate="visible" exit="exit">
            <span className={s.toastIcon}>{toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}</span>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Layout ── */}
      <div className={s.layout}>

        {/* ── Sidebar nav ── */}
        <motion.nav className={s.nav} variants={sectionVariants}>
          {navItems.map((item, idx) => (
            <div key={item.key}>
              {idx === navItems.length - 1 && <div className={s.navDivider} />}
              <button className={`${s.navItem} ${activeSection === item.key ? s.navItemActive : ''}`} onClick={() => setActiveSection(item.key)}>
                <span className={s.navIcon}>{item.icon}</span>
                {item.label}
                <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />
              </button>
            </div>
          ))}
        </motion.nav>

        {/* ── Main content ── */}
        <div className={s.content}>

          {/* ── Profile hero ── */}
          <motion.div className={s.profileHero} variants={sectionVariants}>
            <motion.div className={s.avatarWrapper} variants={avatarVariants} whileHover="hover" initial="visible" animate="visible">
              {avatarUrl
                ? <img src={avatarUrl} alt={profile.full_name ?? 'Avatar'} className={s.avatar} />
                : <div className={s.avatarFallback}>{initials}</div>
              }
            </motion.div>
            <div className={s.heroInfo}>
              <h2 className={s.heroName}>{profile.full_name || 'No name set'}</h2>
              <p className={s.heroEmail}>{profile.email}</p>
              <span className={s.heroBadge}>
                <Shield size={10} />
                {profile.role === 'admin' ? 'Administrator' : 'Faculty'}
              </span>
            </div>
          </motion.div>

          {/* ════ PROFILE ════ */}
          {activeSection === 'profile' && (
            <motion.div className={s.card} variants={sectionVariants} initial="hidden" animate="visible">
              <div className={s.cardHead}>
                <div className={s.cardTitleRow}>
                  <span className={s.cardTitleIcon}><User size={15} /></span>
                  <div><div className={s.cardTitle}>Profile Information</div><div className={s.cardSub}>Update your display name and avatar.</div></div>
                </div>
              </div>

              {/* Avatar upload */}
              <div className={s.avatarUploadRow}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {avatarUrl ? <img src={avatarUrl} alt="avatar" className={s.avatarLg} /> : <div className={s.avatarFallbackLg}>{initials}</div>}
                </div>
                <div className={s.avatarUploadInfo}>
                  <p className={s.avatarUploadTitle}>Profile photo</p>
                  <p className={s.avatarUploadHint}>JPG, PNG or WebP · Max 2 MB</p>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
                  <motion.button className={s.buttonSecondary} onClick={() => fileInputRef.current?.click()} disabled={uploading} variants={buttonVariants} whileHover="hover" whileTap="tap" initial="rest" animate="rest" style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}>
                    {uploading ? <><div className={s.spinner} style={{ borderTopColor: 'var(--primary)' }} /> Uploading…</> : <><Camera size={13} /> Change photo</>}
                  </motion.button>
                  {uploading && uploadPct > 0 && (
                    <div className={s.uploadProgress}><div className={s.uploadProgressFill} style={{ width: `${uploadPct}%` }} /></div>
                  )}
                </div>
              </div>

              {/* Profile form */}
              <motion.div className={s.form} variants={formVariants} initial="hidden" animate="visible">
                <div className={s.formGrid}>
                  <motion.div className={s.fieldGroup} variants={fieldVariants}>
                    <label className={`${s.label} ${s.labelRequired}`}>Full Name</label>
                    <input className={s.input} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" autoComplete="name" />
                  </motion.div>
                  <motion.div className={s.fieldGroup} variants={fieldVariants}>
                    <label className={s.label}><Mail size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Email Address</label>
                    <input className={`${s.input} ${s.inputReadonly}`} type="email" value={profile.email ?? ''} readOnly tabIndex={-1} />
                    <p className={s.inputHint}>Email is managed by your account provider.</p>
                  </motion.div>
                  <motion.div className={s.fieldGroup} variants={fieldVariants}>
                    <label className={s.label}><Shield size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Role</label>
                    <div className={s.roleDisplay}>
                      <span className={`${s.roleDot} ${profile.role === 'admin' ? s.roleDotAdmin : s.roleDotFaculty}`} />
                      {profile.role === 'admin' ? 'Administrator' : 'Faculty'}
                    </div>
                    <p className={s.inputHint}>Role is assigned by a system administrator.</p>
                  </motion.div>
                </div>
                <div className={s.formActions}>
                  <motion.button className={s.buttonSecondary} onClick={() => setFullName(profile.full_name ?? '')} variants={buttonVariants} whileHover="hover" whileTap="tap" initial="rest" animate="rest">Cancel</motion.button>
                  <motion.button className={s.button} onClick={handleSaveProfile} disabled={savingProfile || !fullName.trim()} variants={buttonVariants} whileHover="hover" whileTap="tap" initial="rest" animate="rest">
                    {savingProfile ? <><div className={s.spinner} /> Saving…</> : <><Save size={13} /> Save changes</>}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ════ PASSWORD ════ */}
          {activeSection === 'password' && (
            <motion.div className={s.card} variants={sectionVariants} initial="hidden" animate="visible">
              <div className={s.cardHead}>
                <div className={s.cardTitleRow}>
                  <span className={s.cardTitleIcon}><Key size={15} /></span>
                  <div><div className={s.cardTitle}>Change Password</div><div className={s.cardSub}>Use a strong, unique password you don&apos;t use elsewhere.</div></div>
                </div>
              </div>
              <motion.div className={s.form} variants={formVariants} initial="hidden" animate="visible">
                <div style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Current */}
                  <motion.div className={s.fieldGroup} variants={fieldVariants} style={{ marginBottom: 0 }}>
                    <label className={`${s.label} ${s.labelRequired}`}>Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className={s.input} type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Enter current password" autoComplete="current-password" style={{ paddingRight: '2.5rem' }} />
                      <button type="button" onClick={() => setShowCurrent((v) => !v)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }} tabIndex={-1}>
                        {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </motion.div>
                  {/* New */}
                  <motion.div className={s.fieldGroup} variants={fieldVariants} style={{ marginBottom: 0 }}>
                    <label className={`${s.label} ${s.labelRequired}`}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className={s.input} type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" style={{ paddingRight: '2.5rem' }} />
                      <button type="button" onClick={() => setShowNew((v) => !v)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }} tabIndex={-1}>
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {newPw && (
                      <>
                        <div className={s.pwStrength}><div className={`${s.pwStrengthFill} ${pwStrength === 'weak' ? s.pwStrengthWeak : pwStrength === 'fair' ? s.pwStrengthFair : s.pwStrengthStrong}`} /></div>
                        <span className={`${s.pwStrengthLabel} ${pwStrength === 'weak' ? s.pwStrengthLabelWeak : pwStrength === 'fair' ? s.pwStrengthLabelFair : s.pwStrengthLabelStrong}`}>
                          {pwStrength === 'weak' ? 'Weak password' : pwStrength === 'fair' ? 'Fair — could be stronger' : 'Strong password'}
                        </span>
                      </>
                    )}
                  </motion.div>
                  {/* Confirm */}
                  <motion.div className={s.fieldGroup} variants={fieldVariants} style={{ marginBottom: 0 }}>
                    <label className={`${s.label} ${s.labelRequired}`}>Confirm New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className={`${s.input} ${confirmPw && confirmPw !== newPw ? s.inputError : ''}`} type={showConfirm ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" style={{ paddingRight: '2.5rem' }} />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }} tabIndex={-1}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirmPw && confirmPw !== newPw && <p className={s.errorMsg}><XCircle size={11} /> Passwords do not match.</p>}
                  </motion.div>
                </div>
                <div className={s.formActions}>
                  <motion.button className={s.buttonSecondary} onClick={() => { setCurrentPw(''); setNewPw(''); setConfirmPw('') }} variants={buttonVariants} whileHover="hover" whileTap="tap" initial="rest" animate="rest">Cancel</motion.button>
                  <motion.button className={s.button} onClick={handleChangePassword} disabled={savingPw || !currentPw || !newPw || !confirmPw} variants={buttonVariants} whileHover="hover" whileTap="tap" initial="rest" animate="rest">
                    {savingPw ? <><div className={s.spinner} /> Updating…</> : <><Key size={13} /> Update password</>}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ════ PREFERENCES ════ */}
          {activeSection === 'preferences' && (
            <motion.div className={s.card} variants={sectionVariants} initial="hidden" animate="visible">
              <div className={s.cardHead}>
                <div className={s.cardTitleRow}>
                  <span className={s.cardTitleIcon}><Bell size={15} /></span>
                  <div><div className={s.cardTitle}>Preferences</div><div className={s.cardSub}>Appearance and notification settings.</div></div>
                </div>
              </div>
              {[
                { label: 'Dark Mode', desc: 'Switch the interface to a dark colour scheme.', icon: <Moon size={13} />, value: darkMode, toggle: () => setDarkMode((v) => !v) },
                { label: 'Push Notifications', desc: 'Receive in-app alerts for submissions and deadlines.', icon: <Bell size={13} />, value: notifEnabled, toggle: () => setNotifEnabled((v) => !v) },
                { label: 'Email Notifications', desc: 'Get email updates when students submit exams.', icon: <Mail size={13} />, value: emailNotif, toggle: () => setEmailNotif((v) => !v) },
              ].map((item) => (
                <div key={item.label} className={s.toggleRow}>
                  <div className={s.toggleLeft}>
                    <p className={s.toggleTitle}>{item.icon}&nbsp;{item.label}</p>
                    <p className={s.toggleDesc}>{item.desc}</p>
                  </div>
                  <button className={`${s.toggle} ${item.value ? s.toggleOn : ''}`} onClick={item.toggle} aria-label={`Toggle ${item.label}`} aria-checked={item.value} role="switch">
                    <span className={s.toggleKnob} />
                  </button>
                </div>
              ))}
              <div className={s.formActions}>
                <motion.button className={s.button} onClick={() => setToast({ type: 'success', message: 'Preferences saved.' })} variants={buttonVariants} whileHover="hover" whileTap="tap" initial="rest" animate="rest">
                  <Save size={13} /> Save preferences
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ════ DANGER ZONE ════ */}
          {activeSection === 'danger' && (
            <motion.div className={s.dangerZone} variants={sectionVariants} initial="hidden" animate="visible">
              <div className={s.dangerZoneHead}>
                <span className={s.dangerZoneIcon}><AlertTriangle size={15} color="var(--danger)" /></span>
                <div className={s.dangerZoneTitle}>Danger Zone</div>
              </div>

              <div className={s.dangerItem}>
                <div className={s.dangerItemInfo}>
                  <p className={s.dangerItemTitle}>Sign out of this account</p>
                  <p className={s.dangerItemDesc}>You will be redirected to the login page. Any unsaved changes will be lost.</p>
                </div>
                <motion.button className={s.buttonDanger} onClick={handleLogout} variants={dangerButtonVariants} whileHover="hover" whileTap="tap" initial="rest" animate="rest">
                  <LogOut size={13} /> Sign out
                </motion.button>
              </div>

              <div className={s.dangerItem}>
                <div className={s.dangerItemInfo}>
                  <p className={s.dangerItemTitle}>Delete account</p>
                  <p className={s.dangerItemDesc}>Permanently remove your account and all associated data. Contact a system administrator to proceed.</p>
                </div>
                <motion.button className={s.buttonDanger} disabled style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }} variants={dangerButtonVariants} initial="rest" animate="rest">
                  <AlertTriangle size={13} /> Delete account
                </motion.button>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  )
}