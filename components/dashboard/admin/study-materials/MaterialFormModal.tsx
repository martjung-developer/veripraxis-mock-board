// components/dashboard/admin/study-materials/MaterialFormModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Extends the existing form modal with three new optional fields:
//   • external_url  (text input)
//   • meeting_url   (text input)
//   • link_type     (select dropdown)
//
// All existing upload UI, drag-and-drop, and notes textarea are preserved.
// New fields appear in a clearly labelled "External Resources" section inserted
// between the file upload area and the publish toggle — no layout changes elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import React, { type RefObject, type DragEvent } from 'react'
import { X, Upload, ExternalLink, Video, Link } from 'lucide-react'
import { motion, AnimatePresence }              from 'framer-motion'
import type {
  StudyMaterialForm,
  StudyMaterialFormErrors,
  ProgramOption,
} from '@/lib/types/admin/study-materials/study-materials'
import type { LinkType } from '@/lib/types/database'
import styles from '@/app/(dashboard)/admin/study-materials/study-materials.module.css'
import { overlayVariants, modalVariants } from '@/animations/admin/study-materials/study-materials'

// ── Link-type options ─────────────────────────────────────────────────────────

const LINK_TYPE_OPTIONS: Array<{ value: LinkType | ''; label: string }> = [
  { value: '',        label: 'Select type…' },
  { value: 'video',   label: 'Video (YouTube / Vimeo)' },
  { value: 'meeting', label: 'Live Session (Meet / Zoom)' },
  { value: 'drive',   label: 'Google Drive' },
  { value: 'other',   label: 'Other External Link' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface MaterialFormModalProps {
  open:             boolean
  isEditing:        boolean
  form:             StudyMaterialForm
  errors:           StudyMaterialFormErrors
  file:             File | null
  submitting:       boolean
  dragOver:         boolean
  programs:         ProgramOption[]
  existingFileUrl:  string | null
  fileInputRef:     RefObject<HTMLInputElement>
  onClose:          () => void
  onPatch:          <K extends keyof StudyMaterialForm>(field: K, value: StudyMaterialForm[K]) => void
  onSetFile:        (file: File | null) => void
  onDragOver:       (over: boolean) => void
  onDrop:           (e: DragEvent<HTMLDivElement>) => void
  onSubmit:         () => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MaterialFormModal({
  open, isEditing, form, errors, file, submitting, dragOver,
  programs, existingFileUrl, fileInputRef,
  onClose, onPatch, onSetFile, onDragOver, onDrop, onSubmit,
}: MaterialFormModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.modalOverlay}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className={styles.modal}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {isEditing ? 'Edit Material' : 'Add Study Material'}
              </h2>
              <button
                className={styles.btnIconClose}
                onClick={onClose}
                aria-label="Close form"
              >
                <X size={13} />
              </button>
            </div>

            <div className={styles.modalBody}>

              {/* ── Title ── */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  className={`${styles.formInput} ${errors.title ? styles.inputError : ''}`}
                  value={form.title}
                  onChange={(e) => onPatch('title', e.target.value)}
                  placeholder="Material title…"
                />
                {errors.title && (
                  <p className={styles.fieldError}>{errors.title}</p>
                )}
              </div>

              {/* ── Description ── */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  className={styles.formInput}
                  rows={2}
                  value={form.description}
                  onChange={(e) => onPatch('description', e.target.value)}
                  placeholder="Optional description…"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* ── Type + Program (row) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Type</label>
                  <select
                    className={styles.formInput}
                    value={form.type}
                    onChange={(e) => onPatch('type', e.target.value as StudyMaterialForm['type'])}
                  >
                    <option value="document">Document</option>
                    <option value="video">Video</option>
                    <option value="notes">Notes</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Program</label>
                  <select
                    className={styles.formInput}
                    value={form.program_id}
                    onChange={(e) => onPatch('program_id', e.target.value)}
                  >
                    <option value="">— No program —</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Category ── */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>Category</label>
                <input
                  className={styles.formInput}
                  value={form.category}
                  onChange={(e) => onPatch('category', e.target.value)}
                  placeholder="e.g. Pharmacology, Board Review…"
                />
              </div>

              {/* ── File upload (existing — document/video only) ── */}
              {form.type !== 'notes' && (
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    File Upload
                    <span style={{ color: '#8a9ab5', fontWeight: 400, marginLeft: 6 }}>
                      (optional if external URL is provided)
                    </span>
                  </label>
                  <div
                    className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
                    onDragOver={(e) => { e.preventDefault(); onDragOver(true) }}
                    onDragLeave={() => onDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload file"
                  >
                    <Upload size={20} color="#8a9ab5" />
                    {file ? (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600 }}>
                        {file.name}
                      </p>
                    ) : existingFileUrl ? (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#059669' }}>
                        File uploaded — drop a new one to replace
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#8a9ab5' }}>
                        Drag &amp; drop or click to select a file
                      </p>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) onSetFile(f)
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ── Notes textarea (existing — notes type only) ── */}
              {form.type === 'notes' && (
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Notes Content <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    className={`${styles.formInput} ${errors.notes_content ? styles.inputError : ''}`}
                    rows={6}
                    value={form.notes_content}
                    onChange={(e) => onPatch('notes_content', e.target.value)}
                    placeholder="Write your notes here…"
                    style={{ resize: 'vertical' }}
                  />
                  {errors.notes_content && (
                    <p className={styles.fieldError}>{errors.notes_content}</p>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  NEW: External Resources section
                  Inserted here so it appears after the file/notes area
                  and before the publish toggle.
              ══════════════════════════════════════════════════════════════ */}
              <div style={{
                borderTop:  '1.5px solid #e4e9f0',
                paddingTop: '1rem',
                marginTop:  '0.25rem',
              }}>
                <p style={{
                  fontSize:     '0.72rem',
                  fontWeight:   700,
                  color:        '#8a9ab5',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin:       '0 0 0.75rem',
                }}>
                  External Resources (optional)
                </p>

                {/* external_url */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    <ExternalLink size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    External URL
                    <span style={{ color: '#8a9ab5', fontWeight: 400, marginLeft: 6 }}>
                      YouTube, Google Drive, Slides, etc.
                    </span>
                  </label>
                  <input
                    className={`${styles.formInput} ${errors.external_url ? styles.inputError : ''}`}
                    type="url"
                    value={form.external_url}
                    onChange={(e) => onPatch('external_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=… or https://drive.google.com/…"
                  />
                  {errors.external_url && (
                    <p className={styles.fieldError}>{errors.external_url}</p>
                  )}
                </div>

                {/* link_type + meeting_url (2-col row) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      <Link size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Link Type
                    </label>
                    <select
                      className={styles.formInput}
                      value={form.link_type}
                      onChange={(e) => onPatch('link_type', e.target.value as LinkType | '')}
                    >
                      {LINK_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      <Video size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      Meeting URL
                      <span style={{ color: '#8a9ab5', fontWeight: 400, marginLeft: 6 }}>
                        Google Meet / Zoom
                      </span>
                    </label>
                    <input
                      className={styles.formInput}
                      type="url"
                      value={form.meeting_url}
                      onChange={(e) => onPatch('meeting_url', e.target.value)}
                      placeholder="https://meet.google.com/…"
                    />
                  </div>
                </div>
              </div>
              {/* ══ end External Resources ══ */}

              {/* ── Publish toggle (existing) ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#0d1523' }}>
                    Published
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#8a9ab5' }}>
                    Visible to students when published
                  </p>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    style={{ opacity: 0, width: 0, height: 0 }}
                    checked={form.is_published}
                    onChange={(e) => onPatch('is_published', e.target.checked)}
                  />
                  <span style={{
                    position:     'absolute',
                    inset:        0,
                    background:   form.is_published ? '#0d2540' : '#d1d5db',
                    borderRadius: '99px',
                    cursor:       'pointer',
                    transition:   'background 0.2s',
                  }}>
                    <span style={{
                      position:   'absolute',
                      top:        3, left: form.is_published ? 20 : 3,
                      width:      16, height: 16,
                      background: '#fff',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow:  '0 1px 3px rgba(0,0,0,0.15)',
                    }} />
                  </span>
                </label>
              </div>

            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting
                  ? 'Saving…'
                  : isEditing ? 'Save Changes' : 'Create Material'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}