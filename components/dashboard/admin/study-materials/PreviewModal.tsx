// components/dashboard/admin/study-materials/PreviewModal.tsx
'use client'

import { X, Edit2, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StudyMaterial } from '@/lib/types/admin/study-materials/study-materials'
import { getYouTubeEmbedUrl } from '@/lib/utils/study-materials/youtube'
import {
  TYPE_ICON_BG,
  TYPE_ICON_COLOR,
  typeLabel,
} from '@/lib/utils/study-materials/display'
import { TypeBadge } from './TypeBadge'
import styles from './study-materials.module.css'
import {
  overlayVariants,
  modalVariants,
} from '@/animations/admin/study-materials/study-materials'

interface Props {
  item:     StudyMaterial | null
  onClose:  () => void
  onEdit:   (mat: StudyMaterial) => void
}

export function PreviewModal({ item, onClose, onEdit }: Props) {
  return (
    <AnimatePresence>
      {item && (
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
            style={{ maxWidth: 620 }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Accent bar */}
            <div style={{
              height: 4,
              background: TYPE_ICON_BG[item.type],
              borderRadius: '16px 16px 0 0',
              flexShrink: 0,
            }} />

            <div className={styles.modalHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                  <TypeBadge type={item.type} />
                  {item.program && (
                    <span className={styles.programBadge}>{item.program.code}</span>
                  )}
                </div>
                <h2 className={styles.modalTitle}>{item.title}</h2>
                {item.description && (
                  <p className={styles.modalSubtitle}>{item.description}</p>
                )}
              </div>
              <button
                className={styles.btnIconClose}
                onClick={onClose}
                aria-label={`Close preview of ${item.title}`}
              >
                <X size={13} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Video preview */}
              {item.type === 'video' && item.file_url && (() => {
                const embedUrl = getYouTubeEmbedUrl(item.file_url)
                return embedUrl ? (
                  <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9' }}>
                    <iframe
                      width="100%"
                      height="100%"
                      src={embedUrl}
                      title={item.title}
                      style={{ display: 'block', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <p style={{ color: '#ef4444', fontSize: '0.82rem' }}>
                    Invalid YouTube URL.
                  </p>
                )
              })()}

              {/* Document preview */}
              {item.type === 'document' && item.file_url && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.82rem', color: '#4a5568', margin: 0 }}>
                    This material is stored as a file. Students will see a download link.
                  </p>
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnPrimary}
                    style={{ textDecoration: 'none', width: 'fit-content' }}
                  >
                    <ExternalLink size={13} />
                    Open File
                  </a>
                </div>
              )}

              {/* Notes preview */}
              {item.type === 'notes' && item.notes_content && (
                <div style={{
                  background:   '#f8fafc',
                  border:       '1.5px solid #e2e8f0',
                  borderRadius: 10,
                  padding:      '1rem',
                  fontSize:     '0.83rem',
                  color:        '#2d3748',
                  lineHeight:   1.7,
                  whiteSpace:   'pre-wrap',
                }}>
                  {item.notes_content}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Close
              </button>
              <button
                className={styles.btnPrimary}
                onClick={() => { onClose(); onEdit(item) }}
                aria-label={`Edit ${typeLabel(item.type)} ${item.title}`}
                style={{ color: TYPE_ICON_COLOR[item.type] === '#1d4ed8' ? undefined : undefined }}
              >
                <Edit2 size={13} />
                Edit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}