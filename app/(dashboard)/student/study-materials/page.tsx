// app/(dashboard)/student/study-materials/page.tsx
'use client'

import { useState, useMemo } from 'react'
import {
  FileText, Video, File, Search, Inbox,
  ChevronLeft, ChevronRight, X, BookOpen,
} from 'lucide-react'
import styles from './study-materials.module.css'

// ── Types ─────────────────────────────────────────────────────────────

type MaterialType = 'PDF' | 'Video' | 'Notes'

interface Material {
  id: number
  title: string
  program: string
  shortCode: string
  category: string
  type: MaterialType
  description: string
}

// ── Data — 10 materials across the 9 supported programs ───────────────

const MATERIALS: Material[] = [
  {
    id: 1,
    title: 'Intro to Library Science',
    program: 'Bachelor of Library and Information Science',
    shortCode: 'BLIS',
    category: 'Social Sciences',
    type: 'PDF',
    description: 'Covers the fundamentals of library systems, cataloging, and reference services.',
  },
  {
    id: 2,
    title: 'Core Concepts in Psychology',
    program: 'Bachelor of Science in Psychology',
    shortCode: 'BSPsych',
    category: 'Social Sciences',
    type: 'Notes',
    description: 'An overview of cognitive, developmental, and behavioral psychology theories.',
  },
  {
    id: 3,
    title: 'Child Development Video Series',
    program: 'Bachelor of Science in Elementary Education',
    shortCode: 'BEEd',
    category: 'Education',
    type: 'Video',
    description: 'Visual walkthrough of learning stages and child development milestones.',
  },
  {
    id: 4,
    title: 'Filipino Grammar & Retorika',
    program: 'Bachelor of Science in Secondary Education – Filipino',
    shortCode: 'BSEd-FIL',
    category: 'Education',
    type: 'PDF',
    description: 'Advanced grammar rules, idyoma, and rhetorical devices in Filipino.',
  },
  {
    id: 5,
    title: 'Secondary Math Lesson Plans',
    program: 'Bachelor of Science in Secondary Education – Mathematics',
    shortCode: 'BSEd-MATH',
    category: 'Education',
    type: 'Notes',
    description: 'Ready-to-use lesson plans covering algebra, geometry, and trigonometry.',
  },
  {
    id: 6,
    title: 'English Literature Review',
    program: 'Bachelor of Science in Secondary Education – English',
    shortCode: 'BSEd-ENG',
    category: 'Education',
    type: 'PDF',
    description: 'Summary of classic and contemporary literature taught at the secondary level.',
  },
  {
    id: 7,
    title: 'Science Lab Experiments',
    program: 'Bachelor of Science in Secondary Education – Science',
    shortCode: 'BSEd-SCI',
    category: 'Education',
    type: 'Video',
    description: 'Demonstration videos for biology, chemistry, and physics lab activities.',
  },
  {
    id: 8,
    title: 'Architecture Design Fundamentals',
    program: 'Bachelor of Science in Architecture',
    shortCode: 'BSArch',
    category: 'Architecture & Design',
    type: 'PDF',
    description: 'Key principles of architectural design, structures, and building technology.',
  },
  {
    id: 9,
    title: 'Interior Design: Color & Space',
    program: 'Bachelor of Science in Interior Design',
    shortCode: 'BSID',
    category: 'Architecture & Design',
    type: 'Notes',
    description: 'Color theory, space planning, and materials selection for interior environments.',
  },
  {
    id: 10,
    title: 'Library Cataloging Systems',
    program: 'Bachelor of Library and Information Science',
    shortCode: 'BLIS',
    category: 'Social Sciences',
    type: 'Video',
    description: 'Step-by-step tutorial on Dewey Decimal and Library of Congress classification.',
  },
]

// ── Constants ─────────────────────────────────────────────────────────

const CATEGORIES = [
  'All Categories',
  ...Array.from(new Set(MATERIALS.map((m) => m.category))).sort(),
]

const TYPES: ('All Types' | MaterialType)[] = ['All Types', 'PDF', 'Video', 'Notes']

const PAGE_SIZE = 6

// ── Helpers ───────────────────────────────────────────────────────────

function typeIcon(type: MaterialType) {
  if (type === 'PDF')   return <FileText size={18} strokeWidth={1.75} />
  if (type === 'Video') return <Video    size={18} strokeWidth={1.75} />
  return                       <File     size={18} strokeWidth={1.75} />
}

function typeAccent(type: MaterialType) {
  if (type === 'PDF')   return styles.accentPdf
  if (type === 'Video') return styles.accentVideo
  return                       styles.accentNotes
}

function typeIcon_color(type: MaterialType) {
  if (type === 'PDF')   return styles.iconPdf
  if (type === 'Video') return styles.iconVideo
  return                       styles.iconNotes
}

// ── Card ──────────────────────────────────────────────────────────────

function MaterialCard({ item }: { item: Material }) {
  return (
    <div className={styles.card}>
      <div className={`${styles.cardAccent} ${typeAccent(item.type)}`} />

      <div className={styles.cardTop}>
        <div className={`${styles.cardIconWrap} ${typeIcon_color(item.type)}`}>
          {typeIcon(item.type)}
        </div>
        <span className={`${styles.typeBadge} ${typeAccent(item.type)}`}>
          {item.type}
        </span>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.shortCode}>{item.shortCode}</p>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardDesc}>{item.description}</p>
        <span className={styles.categoryTag}>{item.category}</span>
      </div>

      <div className={styles.cardFooter}>
        <button className={styles.viewBtn}>
          <BookOpen size={14} strokeWidth={2} />
          View Material
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function StudyMaterialsPage() {
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('All Categories')
  const [type,     setType]     = useState<'All Types' | MaterialType>('All Types')
  const [page,     setPage]     = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return MATERIALS.filter((m) => {
      const matchCat  = category === 'All Categories' || m.category === category
      const matchType = type    === 'All Types'       || m.type     === type
      const matchQ    = !q || m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      return matchCat && matchType && matchQ
    })
  }, [search, category, type])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Smart page numbers
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

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Study Materials</h1>
          <p className={styles.subtitle}>Browse and access learning resources by program</p>
        </div>
        <span className={styles.totalPill}>
          <BookOpen size={13} strokeWidth={2} />
          {MATERIALS.length} Materials
        </span>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filterRow}>
        <div className={styles.searchWrap}>
          <Search size={15} strokeWidth={2.2} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search materials…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button
              className={styles.searchClear}
              onClick={() => { setSearch(''); setPage(1) }}
              aria-label="Clear search"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <select
          className={styles.filterSelect}
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          className={styles.filterSelect}
          value={type}
          onChange={(e) => { setType(e.target.value as 'All Types' | MaterialType); setPage(1) }}
        >
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <p className={styles.resultCount}>
          <strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Grid / Empty ── */}
      {paginated.length > 0 ? (
        <div className={styles.grid}>
          {paginated.map((m) => <MaterialCard key={m.id} item={m} />)}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Inbox size={40} strokeWidth={1.4} color="#cbd5e1" />
          <p className={styles.emptyTitle}>No materials found</p>
          <p className={styles.emptyText}>Try adjusting your search or filter options.</p>
          <button
            className={styles.emptyBtn}
            onClick={() => { setSearch(''); setCategory('All Categories'); setType('All Types') }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Page {safePage} of {totalPages} &nbsp;·&nbsp; {filtered.length} total
          </span>
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>

            {pageNums.map((n, i) =>
              n === '…' ? (
                <span key={`e-${i}`} className={styles.pageEllipsis}>…</span>
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
              aria-label="Next page"
            >
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}