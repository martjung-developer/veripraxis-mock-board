'use client'

import { useState, useMemo } from 'react'
import {
  Clock, FileText, GraduationCap,
  Search, ChevronLeft, ChevronRight, X,
  Lock, PlayCircle,
} from 'lucide-react'
import styles from './reviews.module.css'

// ── Types ─────────────────────────────────────────────────────────────

type ExamStatus = 'available' | 'coming_soon'

interface Review {
  id: string
  program: string
  shortCode: string
  category: string
  status: ExamStatus
  questions?: number
  duration?: string
  subject?: string
}

// ── Data ──────────────────────────────────────────────────────────────

const REVIEWS: Review[] = [
  // ── Available (4) ──
  {
    id: '1',
    program: 'Bachelor of Science in Psychology',
    shortCode: 'BSPsych',
    category: 'Social Sciences',
    status: 'available',
    questions: 300,
    duration: '10 hrs',
    subject: 'Psychometrician Licensure Examination',
  },
  {
    id: '2',
    program: 'Bachelor of Science in Secondary Education – Mathematics',
    shortCode: 'BSEd-MATH',
    category: 'Education',
    status: 'available',
    questions: 300,
    duration: '8 hrs',
    subject: 'Licensure Examination for Teachers (LET)',
  },
  {
    id: '3',
    program: 'Bachelor of Science in Secondary Education – Science',
    shortCode: 'BSEd-SCI',
    category: 'Education',
    status: 'available',
    questions: 300,
    duration: '8 hrs',
    subject: 'Licensure Examination for Teachers (LET)',
  },
  {
    id: '4',
    program: 'Bachelor of Science in Interior Design',
    shortCode: 'BSID',
    category: 'Architecture & Design',
    status: 'available',
    questions: 300,
    duration: '10 hrs',
    subject: 'Interior Designer Licensure Examination',
  },

  // ── Not Available (5) ──
  {
    id: '5',
    program: 'Bachelor of Library and Information Science',
    shortCode: 'BLIS',
    category: 'Social Sciences',
    status: 'coming_soon',
  },
  {
    id: '6',
    program: 'Bachelor of Science in Architecture',
    shortCode: 'BSArch',
    category: 'Architecture & Design',
    status: 'coming_soon',
  },
  {
    id: '7',
    program: 'Bachelor of Science in Secondary Education – English',
    shortCode: 'BSEd-ENG',
    category: 'Education',
    status: 'coming_soon',
  },
  {
    id: '8',
    program: 'Bachelor of Science in Elementary Education',
    shortCode: 'BEEd',
    category: 'Education',
    status: 'coming_soon',
  },
  {
    id: '9',
    program: 'Bachelor of Science in Secondary Education – Filipino',
    shortCode: 'BSEd-FIL',
    category: 'Education',
    status: 'coming_soon',
  },
]

// ── Constants ─────────────────────────────────────────────────────────

const CATEGORIES = [
  'All Categories',
  ...Array.from(new Set(REVIEWS.map((r) => r.category))).sort(),
]

const PAGE_SIZE = 12

// ── Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExamStatus }) {
  return (
    <span
      className={`${styles.badge} ${
        status === 'available'
          ? styles.badgeAvailable
          : styles.badgeComingSoon
      }`}
    >
      {status === 'available' ? 'Available' : 'Coming Soon'}
    </span>
  )
}

function ReviewCard({ item }: { item: Review }) {
  const isAvailable = item.status === 'available'

  return (
    <div className={`${styles.examCard} ${isAvailable ? styles.examCardAvailable : ''}`}>
      <div
        className={`${styles.cardAccent} ${
          isAvailable ? styles.cardAccentAvailable : styles.cardAccentSoon
        }`}
      />

      <div className={styles.cardTop}>
        <div
          className={`${styles.cardIconWrap} ${
            isAvailable ? styles.cardIconAvailable : styles.cardIconSoon
          }`}
        >
          <GraduationCap size={20} strokeWidth={1.75} />
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className={styles.cardBody}>
        <p className={styles.shortCode}>{item.shortCode}</p>
        <h3 className={styles.programName}>{item.program}</h3>
        {isAvailable && item.subject && (
          <p className={styles.subjectLabel}>{item.subject}</p>
        )}
        <span className={styles.categoryTag}>{item.category}</span>
      </div>

      {isAvailable && (
        <div className={styles.cardMeta}>
          <span className={styles.metaItem}>
            <FileText size={13} strokeWidth={2} />
            {item.questions} items
          </span>
          <span className={styles.metaItem}>
            <Clock size={13} strokeWidth={2} />
            {item.duration}
          </span>
        </div>
      )}

      <div className={styles.cardFooter}>
        {isAvailable ? (
          <button className={styles.startBtn}>
            <PlayCircle size={15} strokeWidth={2} />
            Start Review
          </button>
        ) : (
          <button className={styles.disabledBtn} disabled>
            <Lock size={13} strokeWidth={2} />
            Not Available
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return REVIEWS.filter((r) => {
      const matchCat = category === 'All Categories' || r.category === category
      const matchQ   = !q || r.program.toLowerCase().includes(q) || r.shortCode.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [search, category])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage       = Math.min(page, totalPages)
  const paginated      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const availableCount = REVIEWS.filter((r) => r.status === 'available').length

  const pageNums: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i)
  } else {
    pageNums.push(1)
    if (safePage > 3) pageNums.push('…')
    const start = Math.max(2, safePage - 1)
    const end   = Math.min(totalPages - 1, safePage + 1)
    for (let i = start; i <= end; i++) pageNums.push(i)
    if (safePage < totalPages - 2) pageNums.push('…')
    pageNums.push(totalPages)
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reviewers</h1>
          <p className={styles.subtitle}>Practice exams to improve your skills</p>
        </div>
        <span className={styles.availablePill}>
          <span className={styles.dot} />
          {availableCount} Available
        </span>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search reviewers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <p className={styles.resultCount}>
          <strong>{filtered.length}</strong> results
        </p>
      </div>

      {/* Grid / Empty */}
      {paginated.length > 0 ? (
        <div className={styles.grid}>
          {paginated.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Search size={40} color="#cbd5e1" />
          <p className={styles.emptyTitle}>No reviewers found</p>
          <p className={styles.emptyText}>Try adjusting your search or filters.</p>
          <button
            className={styles.emptyBtn}
            onClick={() => { setSearch(''); setCategory('All Categories') }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Pagination (hidden when all fit on one page) */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>Page {safePage} of {totalPages}</span>
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft size={15} />
            </button>

            {pageNums.map((n, i) =>
              n === '…' ? (
                <span key={i} className={styles.pageEllipsis}>…</span>
              ) : (
                <button
                  key={n}
                  className={`${styles.pageNum} ${safePage === n ? styles.pageNumActive : ''}`}
                  onClick={() => setPage(n as number)}
                >
                  {n}
                </button>
              )
            )}

            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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