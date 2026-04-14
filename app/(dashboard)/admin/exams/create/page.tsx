// app/(dashboard)/admin/exams/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, ArrowLeft, Save, AlertCircle, CheckCircle, Loader2,
  FileText, Clock, Target, Tag, AlignLeft, Hash, Layers,
} from 'lucide-react'
import s from './create.module.css'
import { createClient } from '@/lib/supabase/client'
import { EXAM_TYPE_META, type ExamType, Database } from '@/lib/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormData {
  title:            string
  description:      string
  category_id:      string
  exam_type:        ExamType   // ← new field
  duration_minutes: string
  total_points:     string
  passing_score:    string
  is_published:     boolean
}

interface FormErrors {
  title?:            string
  category_id?:      string
  exam_type?:        string
  duration_minutes?: string
  total_points?:     string
  passing_score?:    string
}

interface Category {
  id:   string
  name: string
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate(data: FormData): FormErrors {
  const err: FormErrors = {}
  if (!data.title.trim())     err.title      = 'Exam title is required.'
  if (!data.category_id)      err.category_id = 'Please select a category.'
  if (!data.exam_type)        err.exam_type   = 'Please select an exam type.'
  const dur = Number(data.duration_minutes)
  if (!data.duration_minutes || isNaN(dur) || dur < 1)
    err.duration_minutes = 'Enter a valid duration (min 1 minute).'
  const pts = Number(data.total_points)
  if (!data.total_points || isNaN(pts) || pts < 1)
    err.total_points = 'Enter a valid total points value.'
  const pass = Number(data.passing_score)
  if (!data.passing_score || isNaN(pass) || pass < 0 || pass > 100)
    err.passing_score = 'Passing score must be 0–100.'
  return err
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CreateExamPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormData>({
    title:            '',
    description:      '',
    category_id:      '',
    exam_type:        'mock',   // ← default to mock
    duration_minutes: '60',
    total_points:     '100',
    passing_score:    '75',
    is_published:     false,
  })
  const [errors,      setErrors]      = useState<FormErrors>({})
  const [submitting,  setSubmitting]  = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [categories,  setCategories]  = useState<Category[]>([])
  const [catLoading,  setCatLoading]  = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch live categories from exam_categories table
  useEffect(() => {
    async function loadCategories() {
      const supabase: SupabaseClient<Database> = createClient()
      const { data, error } = await supabase
        .from('exam_categories')
        .select('id, name')
        .order('name', { ascending: true })
      if (!error && data) setCategories(data as Category[])
      setCatLoading(false)
    }
    loadCategories()
  }, [])

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSubmitting(true)
    setSubmitError(null)

    const supabase: SupabaseClient<Database> = createClient()

    // Get current user so we can set created_by
    const { data: { user } } = await supabase.auth.getUser()

const insertPayload: Database['public']['Tables']['exams']['Insert'] = {
  title: form.title.trim(),
  description: form.description.trim() || null,
  category_id: form.category_id || null,
  exam_type: form.exam_type,
  duration_minutes: Number(form.duration_minutes),
  total_points: Number(form.total_points),
  passing_score: Number(form.passing_score),
  is_published: form.is_published,
  created_by: user?.id ?? null,
}

const { error: insertErr } = await supabase
  .from('exams')
  .insert(insertPayload)

    if (insertErr) {
      setSubmitError('Could not save exam. Please try again.')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setSuccess(true)
    setTimeout(() => router.push('/admin/exams'), 1500)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Link href="/admin/exams" className={s.backBtn}><ArrowLeft size={15} /> Back to Exams</Link>
          <div className={s.headerIcon}><BookOpen size={20} color="#fff" /></div>
          <div>
            <h1 className={s.heading}>Create Exam</h1>
            <p className={s.headingSub}>Fill in the details to create a new exam</p>
          </div>
        </div>
      </div>

      {success && (
        <div className={s.successBanner}><CheckCircle size={15} /> Exam created successfully! Redirecting…</div>
      )}
      {submitError && (
        <div className={s.successBanner} style={{ background: 'var(--danger-pale)', borderColor: '#fca5a5', color: 'var(--danger)' }}>
          <AlertCircle size={15} /> {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={s.layout}>
          {/* Main Column */}
          <div className={s.mainCol}>

            {/* Basic Info */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderIcon}><FileText size={15} color="var(--primary)" /></div>
                <div>
                  <h2 className={s.cardTitle}>Basic Information</h2>
                  <p className={s.cardSub}>Exam title, description, and category</p>
                </div>
              </div>
              <div className={s.cardBody}>

                {/* Title */}
                <div className={s.fieldGroup}>
                  <label className={s.label} htmlFor="title">
                    <Tag size={12} /> Exam Title <span className={s.required}>*</span>
                  </label>
                  <input
                    id="title" type="text"
                    className={`${s.input} ${errors.title ? s.inputError : ''}`}
                    placeholder="e.g. BSPsych Psychometrician Mock Exam – Set 1"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    maxLength={200}
                  />
                  {errors.title && <p className={s.fieldError}><AlertCircle size={11} />{errors.title}</p>}
                </div>

                {/* Description */}
                <div className={s.fieldGroup}>
                  <label className={s.label} htmlFor="description">
                    <AlignLeft size={12} /> Description
                  </label>
                  <textarea
                    id="description" className={s.textarea} rows={4}
                    placeholder="Brief overview of the exam content and objectives…"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    maxLength={1000}
                  />
                  <p className={s.hint}>{form.description.length}/1000 characters</p>
                </div>

                {/* Category */}
                <div className={s.fieldGroup}>
                  <label className={s.label} htmlFor="category">
                    <BookOpen size={12} /> Category <span className={s.required}>*</span>
                  </label>
                  <div className={`${s.selectWrap} ${errors.category_id ? s.inputError : ''}`}>
                    <select
                      id="category" className={s.select}
                      value={form.category_id}
                      onChange={e => set('category_id', e.target.value)}
                      disabled={catLoading}
                    >
                      <option value="">
                        {catLoading ? 'Loading categories…' : 'Select a category…'}
                      </option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {errors.category_id && <p className={s.fieldError}><AlertCircle size={11} />{errors.category_id}</p>}
                </div>

                {/* ── Exam Type ── NEW FIELD ── */}
                <div className={s.fieldGroup}>
                  <label className={s.label} htmlFor="examType">
                    <Layers size={12} /> Exam Type <span className={s.required}>*</span>
                  </label>

                  {/* Visual type selector — two clickable cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    {(['mock', 'practice'] as ExamType[]).map(type => {
                      const isSelected = form.exam_type === type
                      const meta       = EXAM_TYPE_META[type]
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => set('exam_type', type)}
                          style={{
                            padding: '0.75rem 0.9rem',
                            border: `1.5px solid ${isSelected ? 'var(--primary, #0d2540)' : '#e2e8f0'}`,
                            borderRadius: 10,
                            background: isSelected ? 'rgba(13,37,64,0.05)' : '#f8fafc',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                            boxShadow: isSelected ? '0 0 0 3px rgba(13,37,64,0.08)' : 'none',
                          }}
                        >
                          <div style={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: isSelected ? 'var(--primary, #0d2540)' : '#374151',
                            marginBottom: '0.2rem',
                          }}>
                            {meta.label}
                          </div>
                          <div style={{
                            fontSize: '0.72rem',
                            color: '#6b7280',
                            lineHeight: 1.4,
                          }}>
                            {meta.description}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {errors.exam_type && <p className={s.fieldError}><AlertCircle size={11} />{errors.exam_type}</p>}

                  {/* Fallback hidden select for screen readers / form semantics */}
                  <select
                    id="examType"
                    className={s.select}
                    value={form.exam_type}
                    onChange={e => set('exam_type', e.target.value as ExamType)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <option value="mock">Mock Exam</option>
                    <option value="practice">Practice Exam</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Exam Settings */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderIcon}><Target size={15} color="var(--primary)" /></div>
                <div>
                  <h2 className={s.cardTitle}>Exam Settings</h2>
                  <p className={s.cardSub}>Duration, scoring, and passing threshold</p>
                </div>
              </div>
              <div className={s.cardBody}>
                <div className={s.gridTwo}>
                  {/* Duration */}
                  <div className={s.fieldGroup}>
                    <label className={s.label} htmlFor="duration">
                      <Clock size={12} /> Duration (minutes) <span className={s.required}>*</span>
                    </label>
                    <div className={s.inputWithUnit}>
                      <input
                        id="duration" type="number" min={1}
                        className={`${s.input} ${errors.duration_minutes ? s.inputError : ''}`}
                        placeholder="60"
                        value={form.duration_minutes}
                        onChange={e => set('duration_minutes', e.target.value)}
                      />
                      <span className={s.unit}>min</span>
                    </div>
                    {errors.duration_minutes && <p className={s.fieldError}><AlertCircle size={11} />{errors.duration_minutes}</p>}
                  </div>

                  {/* Total Points */}
                  <div className={s.fieldGroup}>
                    <label className={s.label} htmlFor="totalPoints">
                      <Hash size={12} /> Total Points <span className={s.required}>*</span>
                    </label>
                    <input
                      id="totalPoints" type="number" min={1}
                      className={`${s.input} ${errors.total_points ? s.inputError : ''}`}
                      placeholder="100"
                      value={form.total_points}
                      onChange={e => set('total_points', e.target.value)}
                    />
                    {errors.total_points && <p className={s.fieldError}><AlertCircle size={11} />{errors.total_points}</p>}
                  </div>
                </div>

                {/* Passing Score */}
                <div className={s.fieldGroup}>
                  <label className={s.label} htmlFor="passingScore">
                    <Target size={12} /> Passing Score (%) <span className={s.required}>*</span>
                  </label>
                  <div className={s.passingScoreWrap}>
                    <input
                      id="passingScore" type="range" min={0} max={100} step={5}
                      className={s.rangeInput}
                      value={form.passing_score}
                      onChange={e => set('passing_score', e.target.value)}
                    />
                    <div className={s.rangeValue}>{form.passing_score}%</div>
                  </div>
                  {errors.passing_score && <p className={s.fieldError}><AlertCircle size={11} />{errors.passing_score}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Side Column */}
          <div className={s.sideCol}>

            {/* Publish Settings */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderIcon}><CheckCircle size={15} color="var(--primary)" /></div>
                <div>
                  <h2 className={s.cardTitle}>Publish Settings</h2>
                  <p className={s.cardSub}>Control exam visibility</p>
                </div>
              </div>
              <div className={s.cardBody}>
                <label className={s.toggleRow}>
                  <div>
                    <div className={s.toggleLabel}>Published</div>
                    <div className={s.toggleSub}>Students can see and take this exam</div>
                  </div>
                  <div
                    className={`${s.toggle} ${form.is_published ? s.toggleOn : ''}`}
                    onClick={() => set('is_published', !form.is_published)}
                  >
                    <div className={s.toggleThumb} />
                  </div>
                </label>
                <div className={`${s.statusNote} ${form.is_published ? s.statusNotePublished : s.statusNoteDraft}`}>
                  {form.is_published
                    ? <><CheckCircle size={13} /> This exam will be visible to assigned students once published.</>
                    : <><AlertCircle size={13} /> This exam is saved as a draft and is not visible to students.</>}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderIcon}><FileText size={15} color="var(--primary)" /></div>
                <div><h2 className={s.cardTitle}>Summary</h2></div>
              </div>
              <div className={s.cardBody}>
                <div className={s.summaryList}>
                  {/* Exam type row */}
                  <div className={s.summaryRow}>
                    <span className={s.summaryKey}>Exam Type</span>
                    <span className={s.summaryVal}>
                      {EXAM_TYPE_META[form.exam_type].label}
                    </span>
                  </div>
                  <div className={s.summaryRow}>
                    <span className={s.summaryKey}>Category</span>
                    <span className={s.summaryVal}>
                      {categories.find(c => c.id === form.category_id)?.name ?? '—'}
                    </span>
                  </div>
                  <div className={s.summaryRow}>
                    <span className={s.summaryKey}>Duration</span>
                    <span className={s.summaryVal}>{form.duration_minutes ? `${form.duration_minutes} min` : '—'}</span>
                  </div>
                  <div className={s.summaryRow}>
                    <span className={s.summaryKey}>Total Points</span>
                    <span className={s.summaryVal}>{form.total_points || '—'}</span>
                  </div>
                  <div className={s.summaryRow}>
                    <span className={s.summaryKey}>Passing Score</span>
                    <span className={s.summaryVal}>{form.passing_score}%</span>
                  </div>
                </div>

                <div className={s.formActions}>
                  <Link href="/admin/exams" className={s.btnSecondary}>Cancel</Link>
                  <button type="submit" className={s.btnPrimary} disabled={submitting || success}>
                    {submitting
                      ? <><Loader2 size={13} className={s.spinner} /> Saving…</>
                      : <><Save size={13} /> Create Exam</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}