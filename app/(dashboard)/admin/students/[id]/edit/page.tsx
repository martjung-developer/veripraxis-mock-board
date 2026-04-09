// app/(dashboard)/admin/students/[id]/edit/page.tsx
'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser }      from '@/lib/context/AuthContext'
import styles           from './edit.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Program { id: string; code: string; name: string }

interface FormData {
  full_name:   string
  student_id:  string
  program_id:  string
  year_level:  string
  school:      string
  target_exam: string
}

interface FormErrors {
  full_name?: string
  general?:   string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.full_name.trim()) errors.full_name = 'Full name is required.'
  return errors
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: studentId } = use(params)

  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useUser()

  const [programs,    setPrograms]    = useState<Program[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [form,        setForm]        = useState<FormData>({
    full_name: '', student_id: '', program_id: '',
    year_level: '', school: '', target_exam: '',
  })
  const [formErrors,  setFormErrors]  = useState<FormErrors>({})
  const [saving,      setSaving]      = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [studentName, setStudentName] = useState('')

  // ── Auth guard ────────────────────────────────────────────────────────────────
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

  // ── Fetch existing student data ───────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('profiles')
        .select(`
          full_name, email, role,
          students!inner (
            student_id, year_level, program_id, school, target_exam
          )
        `)
        .eq('id', studentId)
        .eq('role', 'student')
        .single()

      if (err || !data) {
        if (!cancelled) { setError('Student not found.'); setLoading(false) }
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pd = data as any
      const st = pd.students

      if (!cancelled) {
        setStudentName(pd.full_name ?? pd.email ?? 'Student')
        setForm({
          full_name:   pd.full_name    ?? '',
          student_id:  st?.student_id  ?? '',
          program_id:  st?.program_id  ?? '',
          year_level:  st?.year_level != null ? String(st.year_level) : '',
          school:      st?.school      ?? '',
          target_exam: st?.target_exam ?? '',
        })
        setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [studentId, supabase])

  // ── Field handler ─────────────────────────────────────────────────────────────
  function handleChange(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormErrors(prev => ({ ...prev, [field]: undefined, general: undefined }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    setFormErrors({})

    // 1. Update profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name.trim() })
      .eq('id', studentId)

    if (profileErr) {
      setFormErrors({ general: `Failed to update profile: ${profileErr.message}` })
      setSaving(false)
      return
    }

    // 2. Update student record
    const { error: stuErr } = await supabase
      .from('students')
      .update({
        student_id:  form.student_id.trim()  || null,
        program_id:  form.program_id          || null,
        year_level:  form.year_level ? Number(form.year_level) : null,
        school:      form.school.trim()       || null,
        target_exam: form.target_exam.trim()  || null,
      })
      .eq('id', studentId)

    if (stuErr) {
      setFormErrors({ general: `Failed to update student record: ${stuErr.message}` })
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    setTimeout(() => {
      // ✅ router.refresh() busts Next.js client-side cache so the students
      //    list re-fetches fresh data when we navigate back to it.
      router.refresh()
      router.push(`/admin/students/${studentId}`)
    }, 1500)
  }

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingSpinner} />
        <p>Loading student data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.loadingWrap}>
        <AlertCircle size={28} color="#dc2626" />
        <p style={{ color: '#991b1b' }}>{error}</p>
        <button className={styles.btnSave} onClick={() => router.back()}>Go back</button>
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <CheckCircle2 size={48} color="#059669" strokeWidth={1.5} />
          <h2 className={styles.successTitle}>Changes Saved!</h2>
          <p className={styles.successText}>
            <strong>{form.full_name}</strong>&rsquo;s profile has been updated. Redirecting…
          </p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <Link href={`/admin/students/${studentId}`} className={styles.backLink}>
          <ArrowLeft size={15} /> Back to {studentName}
        </Link>
        <div className={styles.headerInfo}>
          <div className={styles.headerIcon}>
            <Save size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className={styles.title}>Edit Student</h1>
            <p className={styles.subtitle}>Update profile and academic information</p>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>

        {formErrors.general && (
          <div className={styles.alertError}>
            <AlertCircle size={15} /> {formErrors.general}
          </div>
        )}

        {/* ── Personal Information ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Personal Information</h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
              <label className={styles.label}>
                Full Name <span className={styles.req}>*</span>
              </label>
              <input
                className={`${styles.input} ${formErrors.full_name ? styles.inputError : ''}`}
                type="text"
                placeholder="Full name"
                value={form.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
              />
              {formErrors.full_name && (
                <span className={styles.fieldError}>{formErrors.full_name}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>School / Institution</label>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. LCCB"
                value={form.school}
                onChange={e => handleChange('school', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Target Exam</label>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. Nursing Board"
                value={form.target_exam}
                onChange={e => handleChange('target_exam', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── Academic Information ── */}
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
                onChange={e => handleChange('student_id', e.target.value)}
              />
              <span className={styles.fieldHint}>School-assigned ID number</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Program</label>
              <select
                className={styles.select}
                value={form.program_id}
                onChange={e => handleChange('program_id', e.target.value)}
              >
                <option value="">— No Program —</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Year Level</label>
              <select
                className={styles.select}
                value={form.year_level}
                onChange={e => handleChange('year_level', e.target.value)}
              >
                <option value="">— Not Set —</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Email note ── */}
        <div className={styles.alertInfo}>
          <AlertCircle size={15} />
          Email address changes are managed through the authentication system
          and cannot be edited here.
        </div>

        {/* ── Actions ── */}
        <div className={styles.formActions}>
          <Link href={`/admin/students/${studentId}`} className={styles.btnCancel}>
            Cancel
          </Link>
          <button type="submit" className={styles.btnSave} disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}