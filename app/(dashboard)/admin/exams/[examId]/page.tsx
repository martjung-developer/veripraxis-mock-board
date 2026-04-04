'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BookOpen, ArrowLeft, Pencil, HelpCircle, Users, BarChart2,
  ClipboardList, Clock, Target, Tag, AlignLeft, CheckCircle,
  XCircle, ChevronRight, FileText, Award
} from 'lucide-react'
import s from './detail.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Exam {
  id: string
  title: string
  description: string | null
  category: { id: string; name: string } | null
  duration_minutes: number
  total_points: number
  passing_score: number
  is_published: boolean
  question_count: number
  assigned_count: number
  submission_count: number
  avg_score: number | null
  created_at: string
  updated_at: string
}

// ── Dummy fetch ───────────────────────────────────────────────────────────────
async function fetchExam(id: string): Promise<Exam> {
  await new Promise(r => setTimeout(r, 600))
  return {
    id,
    title: 'Fundamentals of Nursing Practice',
    description: 'Comprehensive mock exam covering core nursing competencies, patient safety, pharmacology basics, and clinical decision-making aligned with the Philippine Nursing Board Exam standards.',
    category: { id: 'cat-1', name: 'Nursing' },
    duration_minutes: 90,
    total_points: 100,
    passing_score: 75,
    is_published: true,
    question_count: 50,
    assigned_count: 42,
    submission_count: 38,
    avg_score: 78.4,
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExam(examId).then(e => { setExam(e); setLoading(false) })
  }, [examId])

  const subpages = [
    { href: `/admin/exams/${examId}/questions`,    icon: HelpCircle,   label: 'Questions',    desc: 'Manage exam questions',          count: exam?.question_count,   color: 'blue' },
    { href: `/admin/exams/${examId}/assignments`,  icon: Users,        label: 'Assignments',  desc: 'View assigned students',         count: exam?.assigned_count,   color: 'violet' },
    { href: `/admin/exams/${examId}/submissions`,  icon: ClipboardList,label: 'Submissions',  desc: 'View student submissions',       count: exam?.submission_count, color: 'amber' },
    { href: `/admin/exams/${examId}/results`,      icon: BarChart2,    label: 'Results',      desc: 'Graded scores and performance',  count: null,                   color: 'green' },
  ]

  if (loading) return (
    <div className={s.page}>
      <div className={s.skeleton} style={{ width: 200, height: 18, marginBottom: 8 }} />
      <div className={s.skeleton} style={{ width: '60%', height: 28, marginBottom: 32 }} />
      <div className={s.skeletonGrid}>
        {[...Array(4)].map((_, i) => <div key={i} className={`${s.skeleton} ${s.skeletonCard}`} />)}
      </div>
    </div>
  )

  if (!exam) return <div className={s.page}><p>Exam not found.</p></div>

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <Link href="/admin/exams" className={s.backBtn}><ArrowLeft size={14} /> Back to Exams</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><BookOpen size={20} color="#fff" /></div>
            <div>
              <div className={s.headerMeta}>
                <span className={s.categoryBadge}>{exam.category?.name}</span>
                {exam.is_published
                  ? <span className={s.badgePublished}><CheckCircle size={11} /> Published</span>
                  : <span className={s.badgeDraft}><XCircle size={11} /> Draft</span>}
              </div>
              <h1 className={s.heading}>{exam.title}</h1>
            </div>
          </div>
          <div className={s.headerActions}>
            <Link href={`/admin/exams/${examId}/edit`} className={s.btnSecondary}>
              <Pencil size={13} /> Edit Exam
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className={s.statsGrid}>
        {[
          { icon: Clock,    label: 'Duration',       value: `${exam.duration_minutes} min`,           color: 'blue' },
          { icon: HelpCircle, label: 'Questions',    value: exam.question_count,                       color: 'violet' },
          { icon: Target,   label: 'Passing Score',  value: `${exam.passing_score}%`,                  color: 'amber' },
          { icon: Users,    label: 'Assigned',       value: exam.assigned_count,                       color: 'green' },
          { icon: FileText, label: 'Submissions',    value: exam.submission_count,                     color: 'blue' },
          { icon: Award,    label: 'Avg Score',      value: exam.avg_score != null ? `${exam.avg_score.toFixed(1)}%` : '—', color: 'violet' },
        ].map(stat => (
          <div key={stat.label} className={`${s.statCard} ${s[`stat_${stat.color}`]}`}>
            <div className={s.statIcon}><stat.icon size={16} /></div>
            <div>
              <div className={s.statValue}>{stat.value}</div>
              <div className={s.statLabel}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Details + Subpages */}
      <div className={s.layout}>
        {/* Description Card */}
        <div className={s.mainCol}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <AlignLeft size={15} color="var(--primary)" />
              <h2 className={s.cardTitle}>Description</h2>
            </div>
            <div className={s.cardBody}>
              <p className={s.description}>{exam.description || 'No description provided.'}</p>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardHeader}>
              <Tag size={15} color="var(--primary)" />
              <h2 className={s.cardTitle}>Exam Details</h2>
            </div>
            <div className={s.cardBody}>
              <div className={s.detailGrid}>
                {[
                  { label: 'Category',      value: exam.category?.name ?? '—' },
                  { label: 'Duration',      value: `${exam.duration_minutes} minutes` },
                  { label: 'Total Points',  value: exam.total_points },
                  { label: 'Passing Score', value: `${exam.passing_score}%` },
                  { label: 'Created',       value: fmt(exam.created_at) },
                  { label: 'Last Updated',  value: fmt(exam.updated_at) },
                ].map(d => (
                  <div key={d.label} className={s.detailRow}>
                    <span className={s.detailKey}>{d.label}</span>
                    <span className={s.detailVal}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-page Navigation */}
        <div className={s.sideCol}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <BookOpen size={15} color="var(--primary)" />
              <h2 className={s.cardTitle}>Exam Sections</h2>
            </div>
            <div className={s.navList}>
              {subpages.map(sp => (
                <Link key={sp.href} href={sp.href} className={`${s.navItem} ${s[`navItem_${sp.color}`]}`}>
                  <div className={`${s.navIcon} ${s[`navIcon_${sp.color}`]}`}>
                    <sp.icon size={17} />
                  </div>
                  <div className={s.navContent}>
                    <div className={s.navLabel}>{sp.label}</div>
                    <div className={s.navDesc}>{sp.desc}</div>
                  </div>
                  {sp.count != null && <span className={s.navCount}>{sp.count}</span>}
                  <ChevronRight size={14} className={s.navChevron} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}