// app/(dashboard)/admin/study-materials/page.tsx

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, FileText, Video, StickyNote, Search, X,
  Filter, Upload, Plus, Edit2, Trash2, AlertTriangle,
  ExternalLink, CheckCircle, Eye, EyeOff, RefreshCw,
  File as FileIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './study-materials.module.css'
import {
  containerVariants,
  itemVariants,
  buttonVariants,
  overlayVariants,
  modalVariants,
  tableRowVariants,
} from '@/animations/admin/study-materials/study-materials'

// ── Types ──────────────────────────────────────────────────────────────────────

type MaterialType = 'document' | 'video' | 'notes'

interface Program {
  id:   string
  code: string
  name: string
}

interface StudyMaterial {
  id:           string
  title:        string
  description:  string | null
  type:         MaterialType
  file_url:     string | null  // document storage URL or YouTube URL for video
  notes_content: string | null
  program_id:   string | null
  category:     string | null
  is_published: boolean
  created_at:   string
  program?:     Program | null
}

interface FormState {
  title:         string
  description:   string
  type:          MaterialType
  youtube_url:   string
  notes_content: string
  program_id:    string
  category:      string
  is_published:  boolean
}

interface FormErrors {
  title?:        string
  youtube_url?:  string
  notes_content?: string
  program_id?:   string
  file?:         string
}

const EMPTY_FORM: FormState = {
  title:         '',
  description:   '',
  type:          'document',
  youtube_url:   '',
  notes_content: '',
  program_id:    '',
  category:      '',
  is_published:  false,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function typeLabel(type: MaterialType) {
  if (type === 'document') return 'Document'
  if (type === 'video')    return 'Video'
  return 'Notes'
}

function typeIcon(type: MaterialType, size = 14) {
  if (type === 'document') return <FileText size={size} strokeWidth={1.75} />
  if (type === 'video')    return <Video    size={size} strokeWidth={1.75} />
  return                          <StickyNote size={size} strokeWidth={1.75} />
}

function typeBadgeClass(type: MaterialType, s: typeof styles) {
  if (type === 'document') return `${s.typeBadge} ${s.typeDoc}`
  if (type === 'video')    return `${s.typeBadge} ${s.typeVideo}`
  return                          `${s.typeBadge} ${s.typeNotes}`
}

function typeIconBg(type: MaterialType) {
  if (type === 'document') return 'rgba(59,130,246,0.10)'
  if (type === 'video')    return 'rgba(239,68,68,0.10)'
  return                          'rgba(16,185,129,0.10)'
}

function typeIconColor(type: MaterialType) {
  if (type === 'document') return '#1d4ed8'
  if (type === 'video')    return '#b91c1c'
  return                          '#047857'
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Skeleton Row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow}>
      <td><div className={styles.skeleton} style={{ width: '70%', height: 14 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 60,    height: 20, borderRadius: 20 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 70,    height: 20, borderRadius: 6  }} /></td>
      <td><div className={styles.skeleton} style={{ width: 80,    height: 12 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 50,    height: 12 }} /></td>
      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          <div className={styles.skeleton} style={{ width: 28, height: 28, borderRadius: 7 }} />
          <div className={styles.skeleton} style={{ width: 28, height: 28, borderRadius: 7 }} />
          <div className={styles.skeleton} style={{ width: 28, height: 28, borderRadius: 7 }} />
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminStudyMaterialsPage() {
  const supabase = useMemo(() => createClient(), [])

  // ── State ───────────────────────────────────────────────────────────────────
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [programs,  setPrograms]  = useState<Program[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const [search,    setSearch]    = useState('')
  const [filterProg, setFilterProg] = useState('all')
  const [filterType, setFilterType] = useState<'all' | MaterialType>('all')

  // Modal state
  const [showForm,    setShowForm]    = useState(false)
  const [editTarget,  setEditTarget]  = useState<StudyMaterial | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudyMaterial | null>(null)
  const [previewItem, setPreviewItem] = useState<StudyMaterial | null>(null)

  // Form state
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [file,       setFile]       = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver,   setDragOver]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Programs
    const { data: progData } = await supabase
      .from('programs')
      .select('id, code, name')
      .order('name')

    setPrograms((progData ?? []) as Program[])

    // Study materials — join program
    const { data: matData, error: matErr } = await supabase
      .from('study_materials')
      .select(`
        id, title, description, type, file_url, notes_content,
        program_id, category, is_published, created_at,
        programs:program_id ( id, code, name )
      `)
      .order('created_at', { ascending: false })

    if (matErr) {
      setError('Could not load study materials. Please try again.')
      setLoading(false)
      return
    }

    setMaterials((matData ?? []) as unknown as StudyMaterial[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return materials.filter((m) => {
      if (filterProg !== 'all' && m.program_id !== filterProg) return false
      if (filterType !== 'all' && m.type !== filterType)       return false
      if (q && !m.title.toLowerCase().includes(q))             return false
      return true
    })
  }, [materials, search, filterProg, filterType])

  const stats = useMemo(() => ({
    total:     materials.length,
    documents: materials.filter((m) => m.type === 'document').length,
    videos:    materials.filter((m) => m.type === 'video').length,
    notes:     materials.filter((m) => m.type === 'notes').length,
    published: materials.filter((m) => m.is_published).length,
  }), [materials])

  // ── Form helpers ────────────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFile(null)
    setFormErrors({})
    setShowForm(true)
  }

  function openEdit(mat: StudyMaterial) {
    setEditTarget(mat)
    setForm({
      title:         mat.title,
      description:   mat.description ?? '',
      type:          mat.type,
      youtube_url:   mat.type === 'video' ? (mat.file_url ?? '') : '',
      notes_content: mat.notes_content ?? '',
      program_id:    mat.program_id ?? '',
      category:      mat.category ?? '',
      is_published:  mat.is_published,
    })
    setFile(null)
    setFormErrors({})
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditTarget(null)
    setFile(null)
    setFormErrors({})
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.title.trim())                             errs.title        = 'Title is required.'
    if (!form.program_id)                               errs.program_id   = 'Program is required.'
    if (form.type === 'video' && !form.youtube_url.trim())
                                                         errs.youtube_url  = 'YouTube URL is required.'
    if (form.type === 'video' && form.youtube_url.trim() && !extractYouTubeId(form.youtube_url))
                                                         errs.youtube_url  = 'Invalid YouTube URL.'
    if (form.type === 'notes' && !form.notes_content.trim())
                                                         errs.notes_content = 'Notes content is required.'
    if (form.type === 'document' && !editTarget && !file)
                                                         errs.file         = 'Please select a file to upload.'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)

    try {
      let fileUrl: string | null = editTarget?.file_url ?? null

      // Upload document to storage
      if (form.type === 'document' && file) {
        const ext      = file.name.split('.').pop()
        const filePath = `study-materials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('study-materials')
          .upload(filePath, file, { upsert: false })

        if (upErr) throw new Error(upErr.message)

        const { data: urlData } = supabase.storage
          .from('study-materials')
          .getPublicUrl(filePath)
        fileUrl = urlData.publicUrl
      }

      // For video, store YouTube URL
      if (form.type === 'video') {
        fileUrl = form.youtube_url.trim()
      }

      const payload = {
        title:         form.title.trim(),
        description:   form.description.trim() || null,
        type:          form.type,
        file_url:      form.type !== 'notes' ? fileUrl : null,
        notes_content: form.type === 'notes' ? form.notes_content.trim() : null,
        program_id:    form.program_id || null,
        category:      form.category.trim() || null,
        is_published:  form.is_published,
      }

      if (editTarget) {
        const { error: updErr } = await supabase
          .from('study_materials')
          .update(payload as unknown)
          .eq('id', editTarget.id)
        if (updErr) throw new Error(updErr.message)
      } else {
        const { error: insErr } = await supabase
          .from('study_materials')
          .insert(payload as unknown)
        if (insErr) throw new Error(insErr.message)
      }

      closeForm()
      void fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    const { error: delErr } = await supabase
      .from('study_materials')
      .delete()
      .eq('id', deleteTarget.id)
    setSubmitting(false)
    if (delErr) { setError(delErr.message); return }
    setDeleteTarget(null)
    void fetchData()
  }

  // ── Toggle publish ───────────────────────────────────────────────────────────
  async function togglePublish(mat: StudyMaterial) {
    await supabase
      .from('study_materials')
      .update({ is_published: !mat.is_published } as unknown)
      .eq('id', mat.id)
    void fetchData()
  }

  // ── File drag-drop ────────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className={styles.page}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >

      {/* ── Header ── */}
      <motion.div className={styles.header} variants={itemVariants}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <BookOpen size={20} color="#fff" />
          </div>
          <div>
            <h1 className={styles.heading}>Study Materials</h1>
            <p className={styles.headingSub}>
              {materials.length} material{materials.length !== 1 ? 's' : ''} across {programs.length} programs
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <motion.button
            className={styles.btnSecondary}
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            onClick={fetchData}
          >
            <RefreshCw size={13} /> Refresh
          </motion.button>
          <motion.button
            className={styles.btnPrimary}
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            onClick={openCreate}
          >
            <Plus size={14} /> Add Material
          </motion.button>
        </div>
      </motion.div>

      {/* ── Stat Strip ── */}
      <motion.div className={styles.statStrip} variants={itemVariants}>
        {([
          { label: 'Total',     value: stats.total,     icon: <BookOpen    size={15} color="#0d2540" />, bg: 'rgba(13,37,64,0.09)'   },
          { label: 'Documents', value: stats.documents, icon: <FileText    size={15} color="#1d4ed8" />, bg: 'rgba(59,130,246,0.10)' },
          { label: 'Videos',    value: stats.videos,    icon: <Video       size={15} color="#b91c1c" />, bg: 'rgba(239,68,68,0.10)'  },
          { label: 'Notes',     value: stats.notes,     icon: <StickyNote  size={15} color="#047857" />, bg: 'rgba(16,185,129,0.10)' },
        ] as const).map((s) => (
          <div className={styles.statCard} key={s.label}>
            <div className={styles.statIconWrap} style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <motion.div className={styles.errorBanner} variants={itemVariants}>
          <AlertTriangle size={14} /> {error}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#c53030' }} onClick={() => setError(null)}>
            <X size={13} />
          </button>
        </motion.div>
      )}

      {/* ── Filter Bar ── */}
      <motion.div className={styles.filterBar} variants={itemVariants}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Clear">
              <X size={12} />
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <Filter size={12} className={styles.filterIcon} />
          <select
            className={styles.filterSelect}
            value={filterProg}
            onChange={(e) => setFilterProg(e.target.value)}
          >
            <option value="all">All Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </select>
        </div>

        <select
          className={styles.filterSelect}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | MaterialType)}
        >
          <option value="all">All Types</option>
          <option value="document">Document</option>
          <option value="video">Video</option>
          <option value="notes">Notes</option>
        </select>

        <p className={styles.resultCount}>
          <strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {/* ── Table ── */}
      <motion.div className={styles.tableWrap} variants={itemVariants}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Program</th>
              <th>Date Added</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <BookOpen size={20} color="#8a9ab5" />
                    </div>
                    <p className={styles.emptyTitle}>No materials found</p>
                    <p className={styles.emptySub}>Try adjusting your filters or add a new material.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((mat) => (
                <motion.tr
                  key={mat.id}
                  className={styles.tableRow}
                  variants={tableRowVariants}
                  layout
                >
                  <td>
                    <div className={styles.matTitleCell}>
                      <div
                        className={styles.matIconWrap}
                        style={{ background: typeIconBg(mat.type) }}
                      >
                        {typeIcon(mat.type, 14)}
                      </div>
                      <div>
                        <div className={styles.matTitle}>{mat.title}</div>
                        {mat.description && (
                          <div className={styles.matDesc}>{mat.description}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={typeBadgeClass(mat.type, styles)}
                      style={{ color: typeIconColor(mat.type) }}
                    >
                      {typeIcon(mat.type, 11)}
                      {typeLabel(mat.type)}
                    </span>
                  </td>

                  <td>
                    {mat.program ? (
                      <span className={styles.programBadge}>{mat.program.code}</span>
                    ) : (
                      <span style={{ color: '#8a9ab5', fontSize: '0.77rem' }}>—</span>
                    )}
                  </td>

                  <td style={{ color: '#7a8fa8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {formatDate(mat.created_at)}
                  </td>

                  <td>
                    <div className={styles.pubStatus}>
                      <span
                        className={styles.pubDot}
                        style={{ background: mat.is_published ? '#059669' : '#8a9ab5' }}
                      />
                      {mat.is_published ? 'Published' : 'Draft'}
                    </div>
                  </td>

                  <td>
                    <div className={styles.actionGroup}>
                      {/* Preview */}
                      <button
                        className={styles.btnIconSm}
                        title="Preview"
                        onClick={() => setPreviewItem(mat)}
                      >
                        <Eye size={13} />
                      </button>

                      {/* Toggle publish */}
                      <button
                        className={styles.btnIconSm}
                        title={mat.is_published ? 'Unpublish' : 'Publish'}
                        onClick={() => togglePublish(mat)}
                      >
                        {mat.is_published ? <EyeOff size={13} /> : <CheckCircle size={13} />}
                      </button>

                      {/* Edit */}
                      <button
                        className={styles.btnIconSm}
                        title="Edit"
                        onClick={() => openEdit(mat)}
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        className={`${styles.btnIconSm} ${styles.danger}`}
                        title="Delete"
                        onClick={() => setDeleteTarget(mat)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ════════════════════════════════════════
          ADD / EDIT MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className={styles.modalOverlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}
          >
            <motion.div
              className={styles.modal}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Accent bar */}
              <div style={{ height: 4, background: 'linear-gradient(90deg,#0d2540,#3b82f6)', borderRadius: '16px 16px 0 0', flexShrink: 0 }} />

              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>
                    {editTarget ? 'Edit Material' : 'Add Study Material'}
                  </h2>
                  <p className={styles.modalSubtitle}>
                    {editTarget ? 'Update the material details below.' : 'Fill in the details to add a new resource.'}
                  </p>
                </div>
                <button className={styles.btnIconClose} onClick={closeForm} aria-label="Close">
                  <X size={13} />
                </button>
              </div>

              <div className={styles.modalBody}>

                {/* Material Type Selector */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Material Type <span>*</span></label>
                  <div className={styles.typeTabs}>
                    {(['document', 'video', 'notes'] as MaterialType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`${styles.typeTab} ${form.type === t ? styles.typeTabActive : ''}`}
                        onClick={() => patchForm({ type: t })}
                      >
                        <div className={styles.typeTabIcon} style={{ background: typeIconBg(t), color: typeIconColor(t) }}>
                          {typeIcon(t, 15)}
                        </div>
                        {typeLabel(t)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGrid}>

                  {/* Title */}
                  <div className={`${styles.formField} ${styles.formFull}`}>
                    <label className={styles.formLabel}>Title <span>*</span></label>
                    <input
                      className={`${styles.formInput} ${formErrors.title ? styles.error : ''}`}
                      placeholder="e.g. Introduction to Library Science"
                      value={form.title}
                      onChange={(e) => patchForm({ title: e.target.value })}
                    />
                    {formErrors.title && <p className={styles.formError}>{formErrors.title}</p>}
                  </div>

                  {/* Description */}
                  <div className={`${styles.formField} ${styles.formFull}`}>
                    <label className={styles.formLabel}>Description</label>
                    <input
                      className={styles.formInput}
                      placeholder="Brief description of this material"
                      value={form.description}
                      onChange={(e) => patchForm({ description: e.target.value })}
                    />
                  </div>

                  {/* Program */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Program <span>*</span></label>
                    <select
                      className={`${styles.formSelect} ${formErrors.program_id ? styles.error : ''}`}
                      value={form.program_id}
                      onChange={(e) => patchForm({ program_id: e.target.value })}
                    >
                      <option value="">Select program…</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                      ))}
                    </select>
                    {formErrors.program_id && <p className={styles.formError}>{formErrors.program_id}</p>}
                  </div>

                  {/* Category */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Category <span style={{ color: '#8a9ab5', fontWeight: 400 }}>(optional)</span></label>
                    <input
                      className={styles.formInput}
                      placeholder="e.g. Social Sciences, Education"
                      value={form.category}
                      onChange={(e) => patchForm({ category: e.target.value })}
                    />
                  </div>

                  {/* ── Document upload ── */}
                  {form.type === 'document' && (
                    <div className={`${styles.formField} ${styles.formFull}`}>
                      <label className={styles.formLabel}>File <span>*</span></label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        style={{ display: 'none' }}
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                      {file ? (
                        <div className={styles.uploadedFile}>
                          <FileIcon size={14} />
                          {file.name}
                          <button onClick={() => setFile(null)}><X size={12} /></button>
                        </div>
                      ) : (
                        <div
                          className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneActive : ''}`}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true)  }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                        >
                          <Upload size={20} color="#8a9ab5" />
                          <p className={styles.uploadZoneTitle}>Click or drag & drop</p>
                          <p className={styles.uploadZoneSub}>PDF, DOCX, or PPTX — max 50 MB</p>
                        </div>
                      )}
                      {formErrors.file && <p className={styles.formError}>{formErrors.file}</p>}
                      {editTarget?.file_url && !file && (
                        <p className={styles.formHint}>
                          Current file: <a href={editTarget.file_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>view <ExternalLink size={10} style={{ display: 'inline' }} /></a>
                          &nbsp;— upload a new file to replace it.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── YouTube URL ── */}
                  {form.type === 'video' && (
                    <div className={`${styles.formField} ${styles.formFull}`}>
                      <label className={styles.formLabel}>YouTube URL <span>*</span></label>
                      <input
                        className={`${styles.formInput} ${formErrors.youtube_url ? styles.error : ''}`}
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={form.youtube_url}
                        onChange={(e) => patchForm({ youtube_url: e.target.value })}
                      />
                      {formErrors.youtube_url && <p className={styles.formError}>{formErrors.youtube_url}</p>}
                      {form.youtube_url && extractYouTubeId(form.youtube_url) && (
                        <p className={styles.formHint} style={{ color: '#047857' }}>
                          ✓ Valid YouTube URL detected.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Notes content ── */}
                  {form.type === 'notes' && (
                    <div className={`${styles.formField} ${styles.formFull}`}>
                      <label className={styles.formLabel}>Notes Content <span>*</span></label>
                      <textarea
                        className={`${styles.formTextarea} ${formErrors.notes_content ? styles.error : ''}`}
                        placeholder="Enter the notes content here…"
                        value={form.notes_content}
                        onChange={(e) => patchForm({ notes_content: e.target.value })}
                        rows={5}
                      />
                      {formErrors.notes_content && <p className={styles.formError}>{formErrors.notes_content}</p>}
                    </div>
                  )}

                  {/* Publish toggle */}
                  <div className={`${styles.formField} ${styles.formFull}`}>
                    <div className={styles.toggleRow}>
                      <div>
                        <div className={styles.toggleLabel}>Publish immediately</div>
                        <div className={styles.toggleSub}>Students can see this once published.</div>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={form.is_published}
                          onChange={(e) => patchForm({ is_published: e.target.checked })}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.btnSecondary} onClick={closeForm} disabled={submitting}>
                  Cancel
                </button>
                <motion.button
                  className={styles.btnPrimary}
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Material'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          DELETE CONFIRM MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className={styles.modalOverlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}
          >
            <motion.div
              className={styles.modal}
              style={{ maxWidth: 400 }}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className={styles.deleteBody}>
                <div className={styles.deleteIcon}>
                  <Trash2 size={20} color="#ef4444" />
                </div>
                <h2 className={styles.deleteTitle}>Delete Material</h2>
                <p className={styles.deleteDesc}>
                  Are you sure you want to delete <strong>&quot;{deleteTarget.title}&quot;</strong>? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className={styles.btnSecondary} onClick={() => setDeleteTarget(null)} disabled={submitting}>
                    Cancel
                  </button>
                  <motion.button
                    className={styles.btnDanger}
                    variants={buttonVariants}
                    initial="idle"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleDelete}
                    disabled={submitting}
                  >
                    {submitting ? 'Deleting…' : 'Yes, Delete'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          PREVIEW MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            className={styles.modalOverlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => { if (e.target === e.currentTarget) setPreviewItem(null) }}
          >
            <motion.div
              className={styles.modal}
              style={{ maxWidth: 620 }}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div style={{ height: 4, background: typeIconBg(previewItem.type), borderRadius: '16px 16px 0 0', flexShrink: 0 }} />

              <div className={styles.modalHeader}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                    <span className={typeBadgeClass(previewItem.type, styles)} style={{ color: typeIconColor(previewItem.type) }}>
                      {typeIcon(previewItem.type, 11)} {typeLabel(previewItem.type)}
                    </span>
                    {previewItem.program && (
                      <span className={styles.programBadge}>{previewItem.program.code}</span>
                    )}
                  </div>
                  <h2 className={styles.modalTitle}>{previewItem.title}</h2>
                  {previewItem.description && (
                    <p className={styles.modalSubtitle}>{previewItem.description}</p>
                  )}
                </div>
                <button className={styles.btnIconClose} onClick={() => setPreviewItem(null)}>
                  <X size={13} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {previewItem.type === 'video' && previewItem.file_url && (() => {
                  const ytId = extractYouTubeId(previewItem.file_url)
                  return ytId ? (
                    <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9' }}>
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={previewItem.title}
                        style={{ display: 'block', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <p style={{ color: '#ef4444', fontSize: '0.82rem' }}>Invalid YouTube URL.</p>
                  )
                })()}

                {previewItem.type === 'document' && previewItem.file_url && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '0.82rem', color: '#4a5568', margin: 0 }}>
                      This material is stored as a file. Students will see a download link.
                    </p>
                    <a
                      href={previewItem.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.btnPrimary}
                      style={{ textDecoration: 'none', width: 'fit-content' }}
                    >
                      <ExternalLink size={13} /> Open File
                    </a>
                  </div>
                )}

                {previewItem.type === 'notes' && previewItem.notes_content && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '1rem',
                    fontSize: '0.83rem',
                    color: '#2d3748',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {previewItem.notes_content}
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.btnSecondary} onClick={() => setPreviewItem(null)}>Close</button>
                <button className={styles.btnPrimary} onClick={() => { setPreviewItem(null); openEdit(previewItem) }}>
                  <Edit2 size={13} /> Edit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}