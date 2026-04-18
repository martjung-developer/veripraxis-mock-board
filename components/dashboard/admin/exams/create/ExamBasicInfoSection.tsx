// components/dashboard/admin/exams/create/ExamBasicInfoSection.tsx
// Pure UI — renders the Basic Information card (title, description, category, exam type).
// No data fetching, no business logic.

import React from 'react'
import { BookOpen, FileText, Tag, AlignLeft, Layers, AlertCircle } from 'lucide-react'
import { EXAM_TYPE_META, type ExamType } from '@/lib/types/database'
import type { ExamFormData, ExamFormErrors, CategoryOption } from '@/lib/types/admin/exams/create/exam.types'
import s from '@/app/(dashboard)/admin/exams/create/create.module.css'

interface ExamBasicInfoSectionProps {
  form:        ExamFormData
  errors:      ExamFormErrors
  categories:  CategoryOption[]
  catLoading:  boolean
  setField:    <K extends keyof ExamFormData>(field: K, value: ExamFormData[K]) => void
}

export default function ExamBasicInfoSection({
  form,
  errors,
  categories,
  catLoading,
  setField,
}: ExamBasicInfoSectionProps) {
  const examTypes: ExamType[] = ['mock', 'practice']

  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div className={s.cardHeaderIcon}>
          <FileText size={15} color="var(--primary)" />
        </div>
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
            placeholder="e.g. BSPsych Psychometrician Mock Exam – Set 1"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            maxLength={200}
          />
          {errors.title && (
            <p className={s.fieldError}>
              <AlertCircle size={11} /> {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className={s.fieldGroup}>
          <label className={s.label} htmlFor="description">
            <AlignLeft size={12} /> Description
          </label>
          <textarea
            id="description"
            className={s.textarea}
            rows={4}
            placeholder="Brief overview of the exam content and objectives…"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
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
              onChange={(e) => setField('category_id', e.target.value)}
              disabled={catLoading}
            >
              <option value="">
                {catLoading ? 'Loading categories…' : 'Select a category…'}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {errors.category_id && (
            <p className={s.fieldError}>
              <AlertCircle size={11} /> {errors.category_id}
            </p>
          )}
        </div>

        {/* Exam Type */}
        <div className={s.fieldGroup}>
          <label className={s.label} htmlFor="examType">
            <Layers size={12} /> Exam Type <span className={s.required}>*</span>
          </label>

          {/* Visual type selector — two clickable cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {examTypes.map((type) => {
              const isSelected = form.exam_type === type
              const meta       = EXAM_TYPE_META[type]
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setField('exam_type', type)}
                  style={{
                    padding:      '0.75rem 0.9rem',
                    border:       `1.5px solid ${isSelected ? 'var(--primary, #0d2540)' : '#e2e8f0'}`,
                    borderRadius: 10,
                    background:   isSelected ? 'rgba(13,37,64,0.05)' : '#f8fafc',
                    cursor:       'pointer',
                    textAlign:    'left',
                    transition:   'all 0.15s',
                    boxShadow:    isSelected ? '0 0 0 3px rgba(13,37,64,0.08)' : 'none',
                  }}
                >
                  <div style={{
                    fontWeight:   700,
                    fontSize:     '0.82rem',
                    color:        isSelected ? 'var(--primary, #0d2540)' : '#374151',
                    marginBottom: '0.2rem',
                  }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.4 }}>
                    {meta.description}
                  </div>
                </button>
              )
            })}
          </div>

          {errors.exam_type && (
            <p className={s.fieldError}>
              <AlertCircle size={11} /> {errors.exam_type}
            </p>
          )}

          {/* Fallback hidden select for screen readers / form semantics */}
          <select
            id="examType"
            className={s.select}
            value={form.exam_type}
            onChange={(e) => setField('exam_type', e.target.value as ExamType)}
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
  )
}