// app/(dashboard)/student/reviews/page.tsx — Practice Exam page
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock, BookOpen, GraduationCap,
  Search, ChevronLeft, ChevronRight, X,
  Lock, PlayCircle,
} from 'lucide-react'
import styles from './reviews.module.css'
import { createClient } from '@/lib/supabase/client'
import { EXAM_TYPE_META } from '@/lib/types/database'

// ── Types ─────────────────────────────────────────────────────────────

type ExamStatus = 'available' | 'coming_soon'

interface Review {
  id:         string
  title:      string
  shortCode:  string
  category:   string
  status:     ExamStatus
  questions?: number
  duration?:  string
}

// ── Supabase raw shapes ────────────────────────────────────────────────

type CategoryShape = { id: string; name: string; icon: string | null }
type ProgramShape  = { id: string; code: string; name: string } | null

type ExamRaw = {
  id:               string
  title:            string
  duration_minutes: number
  is_published:     boolean
  exam_type:        string | null
  exam_categories:  CategoryShape | CategoryShape[] | null
  programs:         ProgramShape  | ProgramShape[]  | null
}

function unwrapCategory(raw: CategoryShape | CategoryShape[] | null): CategoryShape | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

function unwrapProgram(raw: ProgramShape | ProgramShape[] | null): ProgramShape {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${h} hr${h > 1 ? 's' : ''} ${m} min`
}

// ── Constants ─────────────────────────────────────────────────────────

const ALL_CATEGORIES = 'All Categories'
const PAGE_SIZE = 12

// ── Sub-components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExamStatus }) {
  return (
    <span className={`${styles.badge} ${status === 'available' ? styles.badgeAvailable : styles.badgeComingSoon}`}>
      {status === 'available' ? 'Available' : 'Coming Soon'}
    </span>
  )
}

// ── ReviewCard now receives onStart so the parent controls navigation ─
function ReviewCard({
  item,
  onStart,
}: {
  item:    Review
  onStart: (id: string) => void
}) {
  const isAvailable = item.status === 'available'

  return (
    <div className={`${styles.examCard} ${isAvailable ? styles.examCardAvailable : ''}`}>
      <div className={`${styles.cardAccent} ${isAvailable ? styles.cardAccentAvailable : styles.cardAccentSoon}`} />

      <div className={styles.cardTop}>
        <div className={`${styles.cardIconWrap} ${isAvailable ? styles.cardIconAvailable : styles.cardIconSoon}`}>
          <GraduationCap size={20} strokeWidth={1.75} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.18rem 0.55rem',
            borderRadius: '20px',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            background: 'rgba(16,185,129,0.10)',
            color: '#047857',
            whiteSpace: 'nowrap',
          }}>
            {EXAM_TYPE_META['practice'].label}
          </span>
          <StatusBadge status={item.status} />
        </div>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.shortCode}>{item.shortCode}</p>
        <h3 className={styles.programName}>{item.title}</h3>
        <span className={styles.categoryTag}>{item.category}</span>
      </div>

      {isAvailable && (
        <div className={styles.cardMeta}>
          <span className={styles.metaItem}>
            <BookOpen size={13} strokeWidth={2} />
            {item.questions ?? '—'} items
          </span>
          <span className={styles.metaItem}>
            <Clock size={13} strokeWidth={2} />
            {item.duration ?? '—'}
          </span>
        </div>
      )}

      <div className={styles.cardFooter}>
        {isAvailable ? (
          <button
            className={styles.startBtn}
            onClick={() => onStart(item.id)}
          >
            <PlayCircle size={15} strokeWidth={2} /> Start Review
          </button>
        ) : (
          <button className={styles.disabledBtn} disabled>
            <Lock size={13} strokeWidth={2} /> Not Available
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const router = useRouter()

  const [allReviews, setAllReviews] = useState<Review[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState(ALL_CATEGORIES)
  const [page,       setPage]       = useState(1)

  useEffect(() => {
    let cancelled = false

    async function fetchReviews() {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // ── 1. Auth ────────────────────────────────────────────────────────
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) {
        if (!cancelled) setError('You must be logged in to view practice exams.')
        setLoading(false)
        return
      }

      // ── 2. Student profile → program_id ───────────────────────────────
      const { data: student, error: stuErr } = await supabase
        .from('students')
        .select('id, program_id')
        .eq('id', user.id)
        .single()

      if (stuErr || !student) {
        if (!cancelled) setError('Could not load your student profile.')
        setLoading(false)
        return
      }

      const studentId: string        = student.id
      const programId: string | null = student.program_id ?? null

      // ── 3. Assigned exam IDs for this student ─────────────────────────
      const orFilter = programId
        ? `student_id.eq.${studentId},program_id.eq.${programId}`
        : `student_id.eq.${studentId}`

      const { data: assignments, error: asnErr } = await supabase
        .from('exam_assignments')
        .select('exam_id')
        .eq('is_active', true)
        .or(orFilter)

      if (asnErr) {
        if (!cancelled) setError('Could not load assignments.')
        setLoading(false)
        return
      }

      const assignedIds = new Set<string>(
        (assignments ?? [])
          .map((a: { exam_id: string | null }) => a.exam_id)
          .filter((id): id is string => id !== null)
      )

      // ── 4. Published PRACTICE exams only ─────────────────────────────
      const { data: examData, error: examErr } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          duration_minutes,
          is_published,
          exam_type,
          exam_categories ( id, name, icon ),
          programs ( id, code, name )
        `)
        .eq('is_published', true)
        .eq('exam_type', 'practice')
        .order('created_at', { ascending: false })

      if (examErr) {
        if (!cancelled) setError('Could not load practice exams.')
        setLoading(false)
        return
      }

      const exams = (examData ?? []) as unknown as ExamRaw[]

      // ── 5. Question counts (batch) ─────────────────────────────────────
      const examIds = exams.map(e => e.id)
      const qCountMap: Record<string, number> = {}
      if (examIds.length > 0) {
        const { data: qRows } = await supabase
          .from('questions')
          .select('exam_id')
          .in('exam_id', examIds)
        ;(qRows ?? []).forEach((q: { exam_id: string | null }) => {
          if (q.exam_id) qCountMap[q.exam_id] = (qCountMap[q.exam_id] ?? 0) + 1
        })
      }

      // ── 6. Map → Review ────────────────────────────────────────────────
      const mapped: Review[] = exams.map(exam => {
        const cat  = unwrapCategory(exam.exam_categories)
        const prog = unwrapProgram(exam.programs)
        return {
          id:        exam.id,
          title:     exam.title,
          shortCode: prog?.code ?? (cat?.name?.match(/\b([A-Z])/g)?.join('') ?? 'EXAM'),
          category:  cat?.name ?? 'Uncategorized',
          status:    assignedIds.has(exam.id) ? 'available' : 'coming_soon',
          questions: qCountMap[exam.id],
          duration:  formatDuration(exam.duration_minutes),
        }
      })

      if (!cancelled) { setAllReviews(mapped); setLoading(false) }
    }

    fetchReviews()
    return () => { cancelled = true }
  }, [])

  // ── Navigation handler ─────────────────────────────────────────────────
  function handleStartReview(examId: string) {
    router.push(`/student/reviews/${examId}`)
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const unique = Array.from(new Set(allReviews.map(r => r.category))).sort()
    return [ALL_CATEGORIES, ...unique]
  }, [allReviews])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allReviews.filter(r => {
      const matchCat = category === ALL_CATEGORIES || r.category === category
      const matchQ   = !q || r.title.toLowerCase().includes(q) || r.shortCode.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [allReviews, search, category])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage       = Math.min(page, totalPages)
  const paginated      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const availableCount = allReviews.filter(r => r.status === 'available').length

  const pageNums: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i)
  } else {
    pageNums.push(1)
    if (safePage > 3) pageNums.push('…')
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pageNums.push(i)
    if (safePage < totalPages - 2) pageNums.push('…')
    pageNums.push(totalPages)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reviewers</h1>
          <p className={styles.subtitle}>Self-paced practice exams to sharpen your skills</p>
        </div>
        <span className={styles.availablePill}>
          <span className={styles.dot} />
          {availableCount} Available
        </span>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search reviewers…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <select
          className={styles.categorySelect}
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <p className={styles.resultCount}>
          <strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.examCard} style={{ minHeight: 260 }}>
              <div style={{ height: 4, background: '#e4ecf3', borderRadius: '13px 13px 0 0' }} />
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0f4f8' }} />
                  <div style={{ width: 80, height: 20, borderRadius: 99, background: '#f0f4f8' }} />
                </div>
                <div style={{ width: '40%', height: 12, borderRadius: 6, background: '#f0f4f8' }} />
                <div style={{ width: '80%', height: 16, borderRadius: 6, background: '#f0f4f8' }} />
                <div style={{ width: '55%', height: 12, borderRadius: 99, background: '#f0f4f8' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Something went wrong</p>
          <p className={styles.emptyText}>{error}</p>
        </div>
      ) : paginated.length > 0 ? (
        <div className={styles.grid}>
          {paginated.map(item => (
            <ReviewCard
              key={item.id}
              item={item}
              onStart={handleStartReview}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Search size={40} color="#cbd5e1" />
          <p className={styles.emptyTitle}>No reviewers found</p>
          <p className={styles.emptyText}>Try adjusting your search or filters.</p>
          <button
            className={styles.emptyBtn}
            onClick={() => { setSearch(''); setCategory(ALL_CATEGORIES) }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Page {safePage} of {totalPages} &nbsp;·&nbsp; {filtered.length} total
          </span>
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft size={15} />
            </button>
            {pageNums.map((n, i) =>
              n === '…'
                ? <span key={`e-${i}`} className={styles.pageEllipsis}>…</span>
                : <button
                    key={n}
                    className={`${styles.pageNum} ${safePage === n ? styles.pageNumActive : ''}`}
                    onClick={() => setPage(n as number)}
                  >
                    {n}
                  </button>
            )}
            <button
              className={styles.pageBtn}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}