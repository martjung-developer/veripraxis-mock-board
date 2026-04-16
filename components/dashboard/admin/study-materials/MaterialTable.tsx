// components/dashboard/admin/study-materials/MaterialTable.tsx
'use client'

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, Eye, EyeOff, Edit2, Trash2, CheckCircle,
} from 'lucide-react'
import type { StudyMaterial } from '@/lib/types/admin/study-materials/study-materials'
import { TypeBadge, TypeIconDisplay } from './TypeBadge'
import { TYPE_ICON_BG } from '@/lib/utils/admin/study-materials/display'
import { formatDate } from '@/lib/utils/admin/study-materials/display'
import styles from '@/app/(dashboard)/admin/study-materials/study-materials.module.css'
import { tableRowVariants } from '@/animations/admin/study-materials/study-materials'

// ── Skeleton ──────────────────────────────────────────────────────────────────

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
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeleton} style={{ width: 28, height: 28, borderRadius: 7 }} />
          ))}
        </div>
      </td>
    </tr>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  mat:           StudyMaterial
  onPreview:     (mat: StudyMaterial) => void
  onEdit:        (mat: StudyMaterial) => void
  onDelete:      (mat: StudyMaterial) => void
  onTogglePublish: (mat: StudyMaterial) => void
}

// memo prevents re-rendering unchanged rows when siblings update
const MaterialRow = memo(function MaterialRow({
  mat, onPreview, onEdit, onDelete, onTogglePublish,
}: RowProps) {
  const handlePreview       = useCallback(() => onPreview(mat),       [mat, onPreview])
  const handleEdit          = useCallback(() => onEdit(mat),          [mat, onEdit])
  const handleDelete        = useCallback(() => onDelete(mat),        [mat, onDelete])
  const handleTogglePublish = useCallback(() => onTogglePublish(mat), [mat, onTogglePublish])

  return (
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
            style={{ background: TYPE_ICON_BG[mat.type] }}
          >
            <TypeIconDisplay type={mat.type} size={14} />
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
        <TypeBadge type={mat.type} />
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
          <button
            className={styles.btnIconSm}
            title={`Preview ${mat.title}`}
            aria-label={`Preview ${mat.title}`}
            onClick={handlePreview}
          >
            <Eye size={13} />
          </button>

          <button
            className={styles.btnIconSm}
            title={mat.is_published ? 'Unpublish' : 'Publish'}
            aria-label={mat.is_published ? `Unpublish ${mat.title}` : `Publish ${mat.title}`}
            onClick={handleTogglePublish}
          >
            {mat.is_published ? <EyeOff size={13} /> : <CheckCircle size={13} />}
          </button>

          <button
            className={styles.btnIconSm}
            title={`Edit ${mat.title}`}
            aria-label={`Edit ${mat.title}`}
            onClick={handleEdit}
          >
            <Edit2 size={13} />
          </button>

          <button
            className={`${styles.btnIconSm} ${styles.danger}`}
            title={`Delete ${mat.title}`}
            aria-label={`Delete ${mat.title}`}
            onClick={handleDelete}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </motion.tr>
  )
})

// ── Table ─────────────────────────────────────────────────────────────────────

interface Props {
  materials:       StudyMaterial[]
  loading:         boolean
  onPreview:       (mat: StudyMaterial) => void
  onEdit:          (mat: StudyMaterial) => void
  onDelete:        (mat: StudyMaterial) => void
  onTogglePublish: (mat: StudyMaterial) => void
}

export function MaterialTable({
  materials, loading, onPreview, onEdit, onDelete, onTogglePublish,
}: Props) {
  return (
    <div className={styles.tableWrap}>
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
          ) : materials.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <BookOpen size={20} color="#8a9ab5" />
                  </div>
                  <p className={styles.emptyTitle}>No materials found</p>
                  <p className={styles.emptySub}>
                    Try adjusting your filters or add a new material.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            materials.map((mat) => (
              <MaterialRow
                key={mat.id}
                mat={mat}
                onPreview={onPreview}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePublish={onTogglePublish}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}