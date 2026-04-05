// app/(dashboard)/admin/exams/[examId]/page.tsx
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
import { createClient } from '@/lib/supabase/client'

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

// ── Supabase raw shapes ───────────────────────────────────────────────────────
type CategoryShape = { id: string; name: string; icon: string | null }

type ExamRaw = {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  total_points: number
  passing_score: number
  is_published: boolean
  created_at: string
  updated_at: string
  exam_categories: CategoryShape | CategoryShape[] | null
}

function unwrapCategory(raw: CategoryShape | CategoryShape[] | null): CategoryShape | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>()
  const [exam,    setExam]    = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!examId) return
    let cancelled = false

    async function fetchExam() {
      setLoading(true)
      const supabase = createClient()

      // 1. Fetch exam with category
      const { data: examData, error: examErr } = await supabase
        .from('exams')
        .select(`
          id, title, description,
          duration_minutes, total_points, passing_score,
          is_published, created_at, updated_at,
          exam_categories ( id, name, icon )
        `)
        .eq('id', examId)
        .single()

      if (examErr || !examData) {
        if (!cancelled) setError('Exam not found.')
        setLoading(false)
        return
      }

      const raw = examData as unknown as ExamRaw
      const cat = unwrapCategory(raw.exam_categories)

      // 2. Question count
      const { count: qCount } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', examId)

      // 3. Assignment count (active rows for this exam)
      const { count: aCount } = await supabase
        .from('exam_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', examId)
        .eq('is_active', true)

      // 4. Submission count
      const { count: subCount } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', examId)

      // 5. Average score from graded submissions
      const { data: scoreRows } = await supabase
        .from('submissions')
        .select('percentage')
        .eq('exam_id', examId)
        .eq('status', 'graded')
        .not('percentage', 'is', null)

      const percentages = (scoreRows ?? [])
        .map((r: { percentage: number | null }) => r.percentage)
        .filter((p): p is number => p !== null)

      const avgScore = percentages.length
        ? percentages.reduce((a, b) => a + b, 0) / percentages.length
        : null

      if (!cancelled) {
        setExam({
          id:               raw.id,
          title:            raw.title,
          description:      raw.description,
          category:         cat ? { id: cat.id, name: cat.name } : null,
          duration_minutes: raw.duration_minutes,
          total_points:     raw.total_points,
          passing_score:    raw.passing_score,
          is_published:     raw.is_published,
          question_count:   qCount   ?? 0,
          assigned_count:   aCount   ?? 0,
          submission_count: subCount ?? 0,
          avg_score:        avgScore,
          created_at:       raw.created_at,
          updated_at:       raw.updated_at,
        })
        setLoading(false)
      }
    }

    fetchExam()
    return () => { cancelled = true }
  }, [examId])

  const subpages = [
    { href: `/admin/exams/${examId}/questions`,   icon: HelpCircle,    label: 'Questions',   desc: 'Manage exam questions',         count: exam?.question_count,   color: 'blue'   },
    { href: `/admin/exams/${examId}/assignments`, icon: Users,         label: 'Assignments', desc: 'View assigned students',        count: exam?.assigned_count,   color: 'violet' },
    { href: `/admin/exams/${examId}/submissions`, icon: ClipboardList, label: 'Submissions', desc: 'View student submissions',      count: exam?.submission_count, color: 'amber'  },
    { href: `/admin/exams/${examId}/results`,     icon: BarChart2,     label: 'Results',     desc: 'Graded scores and performance', count: null,                   color: 'green'  },
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

  if (error || !exam) return (
    <div className={s.page}><p>{error ?? 'Exam not found.'}</p></div>
  )

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

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
                <span className={s.categoryBadge}>{exam.category?.name ?? '—'}</span>
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

      {/* Stats */}
      <div className={s.statsGrid}>
        {[
          { icon: Clock,      label: 'Duration',      value: `${exam.duration_minutes} min`,                              color: 'blue'   },
          { icon: HelpCircle, label: 'Questions',      value: exam.question_count,                                         color: 'violet' },
          { icon: Target,     label: 'Passing Score',  value: `${exam.passing_score}%`,                                    color: 'amber'  },
          { icon: Users,      label: 'Assigned',       value: exam.assigned_count,                                         color: 'green'  },
          { icon: FileText,   label: 'Submissions',    value: exam.submission_count,                                       color: 'blue'   },
          { icon: Award,      label: 'Avg Score',      value: exam.avg_score != null ? `${exam.avg_score.toFixed(1)}%` : '—', color: 'violet' },
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

      {/* Details + Nav */}
      <div className={s.layout}>
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