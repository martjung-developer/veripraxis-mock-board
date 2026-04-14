// components/dashboard/admin/questionnaires/QuestionTypeSection.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { QuestionType } from '@/lib/types/database'
import type { DisplayQuestion } from '@/lib/types/admin/questionnaires/questionnaires'
import { TYPE_COLORS, TYPE_LABELS, PAGE_SIZE } from '@/lib/constants/admin/questionnaires/questionnaires.constants'
import { DiffBadge }  from './DiffBadge'
import { SkeletonRow } from './SkeletonRow'
import styles from '@/app/(dashboard)/admin/questionnaires/questionnaires.module.css'

interface Props {
  type:     QuestionType
  questions: DisplayQuestion[]
  loading:  boolean
  onView:   (q: DisplayQuestion) => void
  onEdit:   (q: DisplayQuestion) => void
  onDelete: (id: string) => void
}

export function QuestionTypeSection({ type, questions, loading, onView, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [page,     setPage]     = useState(1)

  const color      = TYPE_COLORS[type]
  const paginated  = questions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))

  return (
    <div className={styles.typeSection}>
      <button
        className={styles.typeSectionHeader}
        style={{ borderLeftColor: color.color }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className={styles.typeSectionHeaderLeft}>
          <span
            className={styles.typeTag}
            style={{ background: color.bg, color: color.color, border: `1px solid ${color.border}` }}
          >
            {TYPE_LABELS[type]}
          </span>
          <span className={styles.typeSectionCount}>
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronDown
          size={15}
          color="#8a9ab5"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {questions.length === 0 ? (
              <div className={styles.typeSectionEmpty}>
                <HelpCircle size={16} color="#cbd5e1" />
                <span>No {TYPE_LABELS[type]} questions yet</span>
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '45%' }}>Question</th>
                        <th>Difficulty</th>
                        <th>Exam</th>
                        <th>Pts</th>
                        <th style={{ width: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                        : paginated.map((q) => (
                          <tr key={q.id} className={styles.tableRow}>
                            <td>
                              <div className={styles.questionCell}>
                                <div
                                  className={styles.questionIconWrap}
                                  style={{ background: color.bg, borderColor: color.border }}
                                >
                                  <HelpCircle size={13} color={color.color} strokeWidth={2} />
                                </div>
                                <div>
                                  <div className={styles.questionText}>{q.question_text}</div>
                                  <div className={styles.questionPoints}>{q.points} pt{q.points !== 1 ? 's' : ''}</div>
                                </div>
                              </div>
                            </td>
                            <td><DiffBadge diff={q.difficulty} /></td>
                            <td>
                              <span className={styles.examTag}>
                                {q.examTitle
                                  ? (q.examTitle.length > 28 ? q.examTitle.slice(0, 28) + '…' : q.examTitle)
                                  : '—'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: '#4a5568', fontSize: '0.8rem' }}>
                              {q.points}
                            </td>
                            <td>
                              <div className={styles.actions}>
                                <button className={`${styles.actionBtn} ${styles.actionView}`}   title="View"   onClick={() => onView(q)}><Eye    size={13} /></button>
                                <button className={`${styles.actionBtn} ${styles.actionEdit}`}   title="Edit"   onClick={() => onEdit(q)}><Pencil size={13} /></button>
                                <button className={`${styles.actionBtn} ${styles.actionDelete}`} title="Delete" onClick={() => onDelete(q.id)}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination} style={{ borderTop: '1px solid #f1f5f9', padding: '0.6rem 1rem' }}>
                    <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                    <div className={styles.pageButtons}>
                      <button className={styles.pageBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft size={13} />
                      </button>
                      <button className={styles.pageBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}