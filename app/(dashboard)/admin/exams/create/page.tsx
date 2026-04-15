// app/(dashboard)/admin/exams/create/page.tsx
// Thin orchestration layer — layout + header only.
// All form logic lives in useCreateExam(); all data-fetching in useExamCategories().
// No Supabase calls, no business logic, no inline state.

'use client'

import React from 'react'
import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'
import { useCreateExam }      from '@/lib/hooks/admin/exams/create/useCreateExam'
import { useExamCategories }  from '@/lib/hooks/admin/exams/create/useExamCategories'
import CreateExamForm         from '@/components/dashboard/admin/exams/create/CreateExamForm'
import s from './create.module.css'

export default function CreateExamPage() {
  const {
    form,
    errors,
    submitting,
    success,
    submitError,
    setField,
    submit,
  } = useCreateExam()

  const { categories, catLoading } = useExamCategories()

  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Link href="/admin/exams" className={s.backBtn}>
            <ArrowLeft size={15} /> Back to Exams
          </Link>
          <div className={s.headerIcon}>
            <BookOpen size={20} color="#fff" />
          </div>
          <div>
            <h1 className={s.heading}>Create Exam</h1>
            <p className={s.headingSub}>Fill in the details to create a new exam</p>
          </div>
        </div>
      </div>

      {/* ── Form (all composition happens here) ── */}
      <CreateExamForm
        form={form}
        errors={errors}
        categories={categories}
        catLoading={catLoading}
        submitting={submitting}
        success={success}
        submitError={submitError}
        setField={setField}
        onSubmit={submit}
      />

    </div>
  )
}