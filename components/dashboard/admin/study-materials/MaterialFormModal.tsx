// components/dashboard/admin/study-materials/MaterialFormModal.tsx
'use client'

import { X, Upload, ExternalLink, File as FileIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProgramOption } from '@/lib/types/admin/study-materials/study-materials'
import type { MaterialType } from '@/lib/types/admin/study-materials/study-materials'
import type { RawFormState, ValidationErrors } from '@/lib/utils/admin/study-materials/validators'
import { extractYouTubeId } from '@/lib/utils/admin/study-materials/youtube'
import { TYPE_ICON_BG, TYPE_ICON_COLOR, typeLabel } from '@/lib/utils/admin/study-materials/display'
import { TypeIconDisplay } from './TypeBadge'
import styles from '@/app/(dashboard)/admin/study-materials/study-materials.module.css'
import {
  overlayVariants,
  modalVariants,
  buttonVariants,
} from '@/animations/admin/study-materials/study-materials'

const MATERIAL_TYPES: MaterialType[] = ['document', 'video', 'notes']

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean
  isEditing:    boolean
  form:         RawFormState
  errors:       ValidationErrors
  file:         File | null
  submitting:   boolean
  dragOver:     boolean
  programs:     ProgramOption[]
  existingFileUrl: string | null
  fileInputRef: React.RefObject<HTMLInputElement>
  onClose:      () => void
  onPatch:      (patch: Partial<RawFormState>) => void
  onSetFile:    (file: File | null) => void
  onDragOver:   (v: boolean) => void
  onDrop:       (e: React.DragEvent) => void
  onSubmit:     () => void
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MaterialFormModal({
  open, isEditing, form, errors, file, submitting, dragOver,
  programs, existingFileUrl, fileInputRef,
  onClose, onPatch, onSetFile, onDragOver, onDrop, onSubmit,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.modalOverlay}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => { if (e.target === e.currentTarget) { onClose() } }}
        >
          <motion.div
            className={styles.modal}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Accent bar */}
            <div style={{
              height:       4,
              background:   'linear-gradient(90deg,#0d2540,#3b82f6)',
              borderRadius: '16px 16px 0 0',
              flexShrink:   0,
            }} />

            {/* Header */}
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>
                  {isEditing ? 'Edit Material' : 'Add Study Material'}
                </h2>
                <p className={styles.modalSubtitle}>
                  {isEditing
                    ? 'Update the material details below.'
                    : 'Fill in the details to add a new resource.'}
                </p>
              </div>
              <button
                className={styles.btnIconClose}
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={13} />
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>

              {/* Type selector */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Material Type <span>*</span>
                </label>
                <div className={styles.typeTabs}>
                  {MATERIAL_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.typeTab} ${form.type === t ? styles.typeTabActive : ''}`}
                      onClick={() => onPatch({ type: t })}
                    >
                      <div
                        className={styles.typeTabIcon}
                        style={{
                          background: TYPE_ICON_BG[t],
                          color:      TYPE_ICON_COLOR[t],
                        }}
                      >
                        <TypeIconDisplay type={t} size={15} />
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
                    className={`${styles.formInput} ${errors.title ? styles.error : ''}`}
                    placeholder="e.g. Introduction to Library Science"
                    value={form.title}
                    onChange={(e) => onPatch({ title: e.target.value })}
                  />
                  {errors.title && (
                    <p className={styles.formError}>{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className={`${styles.formField} ${styles.formFull}`}>
                  <label className={styles.formLabel}>Description</label>
                  <input
                    className={styles.formInput}
                    placeholder="Brief description of this material"
                    value={form.description}
                    onChange={(e) => onPatch({ description: e.target.value })}
                  />
                </div>

                {/* Program */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Program <span>*</span></label>
                  <select
                    className={`${styles.formSelect} ${errors.program_id ? styles.error : ''}`}
                    value={form.program_id}
                    onChange={(e) => onPatch({ program_id: e.target.value })}
                  >
                    <option value="">Select program…</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.program_id && (
                    <p className={styles.formError}>{errors.program_id}</p>
                  )}
                </div>

                {/* Category */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Category{' '}
                    <span style={{ color: '#8a9ab5', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. Social Sciences, Education"
                    value={form.category}
                    onChange={(e) => onPatch({ category: e.target.value })}
                  />
                </div>

                {/* Document upload */}
                {form.type === 'document' && (
                  <div className={`${styles.formField} ${styles.formFull}`}>
                    <label className={styles.formLabel}>File <span>*</span></label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      style={{ display: 'none' }}
                      onChange={(e) => onSetFile(e.target.files?.[0] ?? null)}
                    />
                    {file ? (
                      <div className={styles.uploadedFile}>
                        <FileIcon size={14} />
                        {file.name}
                        <button onClick={() => onSetFile(null)} aria-label="Remove file">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneActive : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); onDragOver(true) }}
                        onDragLeave={() => onDragOver(false)}
                        onDrop={onDrop}
                        role="button"
                        tabIndex={0}
                        aria-label="Upload document file"
                        onKeyDown={(e) => { if (e.key === 'Enter') { fileInputRef.current?.click() } }}
                      >
                        <Upload size={20} color="#8a9ab5" />
                        <p className={styles.uploadZoneTitle}>Click or drag &amp; drop</p>
                        <p className={styles.uploadZoneSub}>PDF, DOCX, or PPTX — max 50 MB</p>
                      </div>
                    )}
                    {errors.file && (
                      <p className={styles.formError}>{errors.file}</p>
                    )}
                    {existingFileUrl && !file && (
                      <p className={styles.formHint}>
                        Current file:{' '}
                        <a
                          href={existingFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#3b82f6' }}
                        >
                          view <ExternalLink size={10} style={{ display: 'inline' }} />
                        </a>
                        {' '}— upload a new file to replace it.
                      </p>
                    )}
                  </div>
                )}

                {/* YouTube URL */}
                {form.type === 'video' && (
                  <div className={`${styles.formField} ${styles.formFull}`}>
                    <label className={styles.formLabel}>
                      YouTube URL <span>*</span>
                    </label>
                    <input
                      className={`${styles.formInput} ${errors.youtube_url ? styles.error : ''}`}
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={form.youtube_url}
                      onChange={(e) => onPatch({ youtube_url: e.target.value })}
                    />
                    {errors.youtube_url && (
                      <p className={styles.formError}>{errors.youtube_url}</p>
                    )}
                    {form.youtube_url && extractYouTubeId(form.youtube_url) && (
                      <p className={styles.formHint} style={{ color: '#047857' }}>
                        ✓ Valid YouTube URL detected.
                      </p>
                    )}
                  </div>
                )}

                {/* Notes content */}
                {form.type === 'notes' && (
                  <div className={`${styles.formField} ${styles.formFull}`}>
                    <label className={styles.formLabel}>
                      Notes Content <span>*</span>
                    </label>
                    <textarea
                      className={`${styles.formTextarea} ${errors.notes_content ? styles.error : ''}`}
                      placeholder="Enter the notes content here…"
                      value={form.notes_content}
                      onChange={(e) => onPatch({ notes_content: e.target.value })}
                      rows={5}
                    />
                    {errors.notes_content && (
                      <p className={styles.formError}>{errors.notes_content}</p>
                    )}
                  </div>
                )}

                {/* Publish toggle */}
                <div className={`${styles.formField} ${styles.formFull}`}>
                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleLabel}>Publish immediately</div>
                      <div className={styles.toggleSub}>
                        Students can see this once published.
                      </div>
                    </div>
                    <label className={styles.toggle} aria-label="Publish toggle">
                      <input
                        type="checkbox"
                        checked={form.is_published}
                        onChange={(e) => onPatch({ is_published: e.target.checked })}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>
                </div>

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
              <motion.button
                className={styles.btnPrimary}
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting
                  ? 'Saving…'
                  : isEditing
                  ? 'Save Changes'
                  : 'Add Material'}
              </motion.button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}