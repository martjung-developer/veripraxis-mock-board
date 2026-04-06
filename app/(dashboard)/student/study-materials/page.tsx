// app/(dashboard)/student/study-materials/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText, Video, StickyNote, Search, Inbox,
  ChevronLeft, ChevronRight, X, BookOpen,
  ExternalLink, Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './study-materials.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type MaterialType = 'document' | 'video' | 'notes'

interface StudyMaterial {
  id:            string
  title:         string
  description:   string | null
  type:          MaterialType
  file_url:      string | null
  notes_content: string | null
  category:      string | null
  created_at:    string
  program_id:    string | null
  program_code:  string | null
  program_name:  string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6

const TYPE_META: Record<MaterialType, { label: string; accentClass: string; iconColorClass: string }> = {
  document: { label: 'Document', accentClass: styles.accentPdf,   iconColorClass: styles.iconPdf   },
  video:    { label: 'Video',    accentClass: styles.accentVideo, iconColorClass: styles.iconVideo },
  notes:    { label: 'Notes',    accentClass: styles.accentNotes, iconColorClass: styles.iconNotes },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeIcon(type: MaterialType) {
  if (type === 'document') return <FileText   size={18} strokeWidth={1.75} />
  if (type === 'video')    return <Video      size={18} strokeWidth={1.75} />
  return                          <StickyNote size={18} strokeWidth={1.75} />
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  item,
  onClose,
}: {
  item: StudyMaterial
  onClose: () => void
}) {
  const meta = TYPE_META[item.type]

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    // Prevent background scroll while modal is open
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div className={styles.modal}>

        {/* Accent bar */}
        <div className={`${styles.modalAccent} ${meta.accentClass}`} />

        {/* Header */}
        <div className={styles.modalHeader}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className={`${styles.typeBadge} ${meta.accentClass}`}>{meta.label}</span>
              {item.program_code && (
                <span className={styles.categoryTag}>{item.program_code}</span>
              )}
              {item.category && (
                <span className={styles.categoryTag}>{item.category}</span>
              )}
            </div>
            <h2 className={styles.modalTitle}>{item.title}</h2>
            {item.description && (
              <p className={styles.modalDesc}>{item.description}</p>
            )}
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>

          {/* Video embed */}
          {item.type === 'video' && item.file_url && (() => {
            const ytId = extractYouTubeId(item.file_url)
            return ytId ? (
              <div className={styles.videoWrap}>
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={item.file_url}
                target="_blank"
                rel="noreferrer"
                className={styles.openBtn}
              >
                <ExternalLink size={14} /> Open Video
              </a>
            )
          })()}

          {/* Document */}
          {item.type === 'document' && item.file_url && (
            <>
              <p className={styles.docHint}>
                Click below to open or download this document.
              </p>
              <div>
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.openBtn}
                >
                  <ExternalLink size={14} /> Open Document
                </a>
              </div>
            </>
          )}

          {/* Notes */}
          {item.type === 'notes' && item.notes_content && (
            <div className={styles.notesContent}>
              {item.notes_content}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function MaterialCard({
  item,
  onView,
}: {
  item: StudyMaterial
  onView: (item: StudyMaterial) => void
}) {
  const meta = TYPE_META[item.type]

  return (
    <div className={styles.card}>
      <div className={`${styles.cardAccent} ${meta.accentClass}`} />

      <div className={styles.cardTop}>
        <div className={`${styles.cardIconWrap} ${meta.iconColorClass}`}>
          {typeIcon(item.type)}
        </div>
        <span className={`${styles.typeBadge} ${meta.accentClass}`}>
          {meta.label}
        </span>
      </div>

      <div className={styles.cardBody}>
        {item.program_code && (
          <p className={styles.shortCode}>{item.program_code}</p>
        )}
        <h3 className={styles.cardTitle}>{item.title}</h3>
        {item.description && (
          <p className={styles.cardDesc}>{item.description}</p>
        )}
        {item.category && (
          <span className={styles.categoryTag}>{item.category}</span>
        )}
      </div>

      <div className={styles.cardFooter}>
        <button className={styles.viewBtn} onClick={() => onView(item)}>
          <BookOpen size={14} strokeWidth={2} />
          View Material
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudyMaterialsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const [search,    setSearch]    = useState('')
  const [filterCat, setFilterCat] = useState('All Categories')
  const [filterType, setFilterType] = useState<'All Types' | MaterialType>('All Types')
  const [page,      setPage]      = useState(1)

  const [preview,   setPreview]   = useState<StudyMaterial | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchErr } = await supabase
      .from('published_study_materials')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchErr) {
      // Fallback to direct join if view doesn't exist yet
      const { data: fallback, error: fallbackErr } = await supabase
        .from('study_materials')
        .select(`
          id, title, description, type, file_url, notes_content,
          category, created_at, program_id,
          programs:program_id ( id, code, name )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (fallbackErr) {
        setError('Could not load study materials. Please try again.')
        setLoading(false)
        return
      }

      const normalised: StudyMaterial[] = (fallback ?? []).map((row: any) => ({
        id:            row.id,
        title:         row.title,
        description:   row.description,
        type:          row.type as MaterialType,
        file_url:      row.file_url,
        notes_content: row.notes_content,
        category:      row.category,
        created_at:    row.created_at,
        program_id:    row.program_id,
        program_code:  row.programs?.code ?? null,
        program_name:  row.programs?.name ?? null,
      }))

      setMaterials(normalised)
      setLoading(false)
      return
    }

    setMaterials((data ?? []) as StudyMaterial[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  // ── Derived ────────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(materials.map((m) => m.category).filter(Boolean) as string[])
    ).sort()
    return ['All Categories', ...cats]
  }, [materials])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return materials.filter((m) => {
      const matchCat  = filterCat  === 'All Categories' || m.category  === filterCat
      const matchType = filterType === 'All Types'      || m.type      === filterType
      const matchQ    = !q || m.title.toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q)
      return matchCat && matchType && matchQ
    })
  }, [materials, search, filterCat, filterType])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const pageNums: (number | '…')[] = useMemo(() => {
    const nums: (number | '…')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) nums.push(i)
    } else {
      nums.push(1)
      if (safePage > 3) nums.push('…')
      const start = Math.max(2, safePage - 1)
      const end   = Math.min(totalPages - 1, safePage + 1)
      for (let i = start; i <= end; i++) nums.push(i)
      if (safePage < totalPages - 2) nums.push('…')
      nums.push(totalPages)
    }
    return nums
  }, [totalPages, safePage])

  function clearFilters() {
    setSearch('')
    setFilterCat('All Categories')
    setFilterType('All Types')
    setPage(1)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Study Materials</h1>
          <p className={styles.subtitle}>Browse and access learning resources by program</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={styles.totalPill}>
            <BookOpen size={13} strokeWidth={2} />
            {loading ? '—' : materials.length} Materials
          </span>
          <button
            className={styles.refreshBtn}
            onClick={fetchMaterials}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss"><X size={12} /></button>
        </div>
      )}

      {/* Filters */}
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
          value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setPage(1) }}
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          className={styles.filterSelect}
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as 'All Types' | MaterialType); setPage(1) }}
        >
          <option value="All Types">All Types</option>
          <option value="document">Document</option>
          <option value="video">Video</option>
          <option value="notes">Notes</option>
        </select>

        <p className={styles.resultCount}>
          {loading
            ? <Loader2 size={13} className={styles.spinning} />
            : <><strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}</>}
        </p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className={styles.grid}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className={styles.cardSkeleton}>
              <div className={styles.skelAccent} />
              <div className={styles.skelTop}>
                <div className={styles.skelIcon} />
                <div className={styles.skelBadge} />
              </div>
              <div className={styles.skelBody}>
                <div className={styles.skelLine} style={{ width: '40%' }} />
                <div className={styles.skelLine} style={{ width: '80%', height: 14 }} />
                <div className={styles.skelLine} style={{ width: '65%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid / Empty */}
      {!loading && (
        paginated.length > 0 ? (
          <div className={styles.grid}>
            {paginated.map((m) => (
              <MaterialCard key={m.id} item={m} onView={setPreview} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Inbox size={40} strokeWidth={1.4} color="#cbd5e1" />
            <p className={styles.emptyTitle}>
              {materials.length === 0 ? 'No materials available yet' : 'No materials found'}
            </p>
            <p className={styles.emptyText}>
              {materials.length === 0
                ? 'Check back later — your faculty will upload resources here.'
                : 'Try adjusting your search or filter options.'}
            </p>
            {materials.length > 0 && (
              <button className={styles.emptyBtn} onClick={clearFilters}>Clear Filters</button>
            )}
          </div>
        )
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Page {safePage} of {totalPages}&nbsp;·&nbsp;{filtered.length} total
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

      {/* Preview modal — rendered at root level so it overlays everything */}
      {preview && (
        <PreviewModal item={preview} onClose={() => setPreview(null)} />
      )}

    </div>
  )
}