// app/(dashboard)/admin/students/create/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/AuthContext'
import styles from './create.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Program { id: string; code: string; name: string }

interface FormData {
  full_name:  string
  email:      string
  password:   string
  student_id: string
  program_id: string
  year_level: string
  school:     string
}

interface FormErrors {
  full_name?:  string
  email?:      string
  password?:   string
  student_id?: string
  program_id?: string
  year_level?: string
  general?:    string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.full_name.trim())  errors.full_name  = 'Full name is required.'
  if (!form.email.trim())      errors.email      = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (!form.password)          errors.password   = 'Password is required.'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  return errors
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CreateStudentPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useUser()

  const [programs, setPrograms] = useState<Program[]>([])
  const [form, setForm]         = useState<FormData>({
    full_name: '', email: '', password: '',
    student_id: '', program_id: '', year_level: '', school: '',
  })
  const [errors,   setErrors]   = useState<FormErrors>({})
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)

  // ── Auth ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login')
  }, [authLoading, user, router])

  // ── Fetch programs ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('programs')
      .select('id, code, name')
      .order('code', { ascending: true })
      .then(({ data }) => setPrograms((data ?? []) as Program[]))
  }, [supabase])

  // ── Field handler ─────────────────────────────────────────────────────────────
  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    setErrors({})

    // 1. Check for duplicate email in profiles
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', form.email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      setErrors({ email: 'A user with this email already exists.' })
      setSaving(false)
      return
    }

    // 2. Create auth user via admin API (service role needed in production)
    //    In client-side we use signUp — this creates the auth user and triggers
    //    the handle_new_user trigger to create the profile row.
    //    NOTE: In production, use a server action or API route with service_role key
    //    to bypass email confirmation.
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email:    form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          full_name: form.full_name.trim(),
          role:      'student',
        },
      },
    })

    if (signUpErr || !signUpData.user) {
      setErrors({ general: signUpErr?.message ?? 'Failed to create user account.' })
      setSaving(false)
      return
    }

    const newUserId = signUpData.user.id

    // 3. Upsert profile (in case trigger already created it, or create manually)
    await supabase
      .from('profiles')
      .upsert({
        id:        newUserId,
        email:     form.email.trim().toLowerCase(),
        full_name: form.full_name.trim(),
        role:      'student',
      })

    // 4. Create student record
    const { error: stuErr } = await supabase
      .from('students')
      .insert({
        id:         newUserId,
        student_id: form.student_id.trim() || null,
        program_id: form.program_id || null,
        year_level: form.year_level ? Number(form.year_level) : null,
        school:     form.school.trim() || null,
      })

    if (stuErr) {
      // Profile was created but student row failed — try to clean up gracefully
      setErrors({ general: `Account created but student record failed: ${stuErr.message}` })
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    // Redirect after short delay
    setTimeout(() => router.push('/admin/students'), 1500)
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <CheckCircle2 size={48} color="#059669" strokeWidth={1.5} />
          <h2 className={styles.successTitle}>Student Created!</h2>
          <p className={styles.successText}>
            <strong>{form.full_name}</strong> has been added as a student. Redirecting…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <Link href="/admin/students" className={styles.backLink}>
          <ArrowLeft size={15} /> All Students
        </Link>
        <div className={styles.headerInfo}>
          <div className={styles.headerIcon}>
            <UserPlus size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className={styles.title}>Add Student</h1>
            <p className={styles.subtitle}>Create a new student account</p>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>

        {/* General error */}
        {errors.general && (
          <div className={styles.alertError}>
            <AlertCircle size={15} />
            {errors.general}
          </div>
        )}

        {/* ── Section: Account ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account Information</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Full Name <span className={styles.req}>*</span></label>
              <input
                className={`${styles.input} ${errors.full_name ? styles.inputError : ''}`}
                type="text"
                placeholder="e.g. Maria Santos"
                value={form.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
              />
              {errors.full_name && <span className={styles.fieldError}>{errors.full_name}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email Address <span className={styles.req}>*</span></label>
              <input
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                type="email"
                placeholder="student@school.edu.ph"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
              {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password <span className={styles.req}>*</span></label>
              <input
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
              />
              {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>School / Institution</label>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. LCCB"
                value={form.school}
                onChange={(e) => handleChange('school', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── Section: Academic ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Academic Information</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Student ID Number</label>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. 2024-00123"
                value={form.student_id}
                onChange={(e) => handleChange('student_id', e.target.value)}
              />
              <span className={styles.fieldHint}>The school-assigned ID (optional)</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Program</label>
              <select
                className={styles.select}
                value={form.program_id}
                onChange={(e) => handleChange('program_id', e.target.value)}
              >
                <option value="">— Select Program —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Year Level</label>
              <select
                className={styles.select}
                value={form.year_level}
                onChange={(e) => handleChange('year_level', e.target.value)}
              >
                <option value="">— Select Year —</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={styles.formActions}>
          <Link href="/admin/students" className={styles.btnCancel}>Cancel</Link>
          <button type="submit" className={styles.btnSave} disabled={saving}>
            <UserPlus size={15} />
            {saving ? 'Creating…' : 'Create Student'}
          </button>
        </div>
      </form>
    </div>
  )
}