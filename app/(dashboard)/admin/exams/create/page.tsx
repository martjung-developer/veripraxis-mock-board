'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, ArrowLeft, Save, AlertCircle, CheckCircle, Loader2,
  FileText, Clock, Target, Tag, AlignLeft, Hash
} from 'lucide-react'
import s from './create.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormData {
  title: string
  description: string
  category_id: string
  duration_minutes: string
  total_points: string
  passing_score: string
  is_published: boolean
}

interface FormErrors {
  title?: string
  category_id?: string
  duration_minutes?: string
  total_points?: string
  passing_score?: string
}

// ── Dummy categories ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'cat-1', name: 'Nursing' },
  { id: 'cat-2', name: 'Medicine' },
  { id: 'cat-3', name: 'Pharmacy' },
  { id: 'cat-4', name: 'Dentistry' },
  { id: 'cat-5', name: 'Engineering' },
]

// ── Validation ────────────────────────────────────────────────────────────────
function validate(data: FormData): FormErrors {
  const err: FormErrors = {}
  if (!data.title.trim()) err.title = 'Exam title is required.'
  if (!data.category_id)  err.category_id = 'Please select a category.'
  const dur = Number(data.duration_minutes)
  if (!data.duration_minutes || isNaN(dur) || dur < 1) err.duration_minutes = 'Enter a valid duration (min 1 minute).'
  const pts = Number(data.total_points)
  if (!data.total_points || isNaN(pts) || pts < 1) err.total_points = 'Enter a valid total points value.'
  const pass = Number(data.passing_score)
  if (!data.passing_score || isNaN(pass) || pass < 0 || pass > 100) err.passing_score = 'Passing score must be 0–100.'
  return err
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CreateExamPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    category_id: '',
    duration_minutes: '60',
    total_points: '100',
    passing_score: '75',
    is_published: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSubmitting(true)
    // TODO: replace with actual Supabase insert
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    setSuccess(true)
    setTimeout(() => router.push('/admin/exams'), 1500)
  }

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Link href="/admin/exams" className={s.backBtn}><ArrowLeft size={15} /> Back to Exams</Link>
          <div className={s.headerIcon}><BookOpen size={20} color="#fff" /></div>
          <div>
            <h1 className={s.heading}>Create Exam</h1>
            <p className={s.headingSub}>Fill in the details to create a new mock exam</p>
          </div>
        </div>
      </div>

      {success && (
        <div className={s.successBanner}><CheckCircle size={15} /> Exam created successfully! Redirecting…</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={s.layout}>
          {/* Main Column */}
          <div className={s.mainCol}>
            {/* Basic Info Card */}
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
                    id="title"
                    type="text"
                    className={`${s.input} ${errors.title ? s.inputError : ''}`}
                    placeholder="e.g. Fundamentals of Nursing Practice – Set 1"
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
                    id="description"
                    className={s.textarea}
                    placeholder="Brief overview of the exam content and objectives…"
                    rows={4}
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
                      id="category"
                      className={s.select}
                      value={form.category_id}
                      onChange={e => set('category_id', e.target.value)}
                    >
                      <option value="">Select a category…</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {errors.category_id && <p className={s.fieldError}><AlertCircle size={11} />{errors.category_id}</p>}
                </div>
              </div>
            </div>

            {/* Settings Card */}
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
                        id="duration"
                        type="number"
                        min={1}
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
                      id="totalPoints"
                      type="number"
                      min={1}
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
                      id="passingScore"
                      type="range"
                      min={0} max={100} step={5}
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
                  <div className={`${s.toggle} ${form.is_published ? s.toggleOn : ''}`}
                    onClick={() => set('is_published', !form.is_published)}>
                    <div className={s.toggleThumb} />
                  </div>
                </label>
                <div className={`${s.statusNote} ${form.is_published ? s.statusNotePublished : s.statusNoteDraft}`}>
                  {form.is_published
                    ? <><CheckCircle size={13} /> This exam will be visible to assigned students.</>
                    : <><AlertCircle size={13} /> This exam is saved as a draft and is not visible to students.</>}
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderIcon}><FileText size={15} color="var(--primary)" /></div>
                <div><h2 className={s.cardTitle}>Summary</h2></div>
              </div>
              <div className={s.cardBody}>
                <div className={s.summaryList}>
                  <div className={s.summaryRow}>
                    <span className={s.summaryKey}>Category</span>
                    <span className={s.summaryVal}>{CATEGORIES.find(c => c.id === form.category_id)?.name ?? '—'}</span>
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