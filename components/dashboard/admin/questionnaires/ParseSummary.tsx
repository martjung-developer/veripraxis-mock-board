// components/dashboard/admin/questionnaires/ParseSummary.tsx
import type { ImportRow } from '@/lib/types/admin/questionnaires/questionnaires'
import type { QuestionType } from '@/lib/types/database'
import { TYPE_COLORS } from '@/lib/constants/admin/questionnaires/questionnaires.constants'
import styles from '@/app/(dashboard)/admin/questionnaires/questionnaires.module.css'

export function ParseSummary({ rows }: { rows: ImportRow[] }) {
  const mcq   = rows.filter((r) => r.question_type === 'multiple_choice').length
  const tf    = rows.filter((r) => r.question_type === 'true_false').length
  const sa    = rows.filter((r) => r.question_type === 'short_answer').length
  const other = rows.length - mcq - tf - sa

  const pill = (type: QuestionType, count: number, label: string) => (
    count > 0 ? (
      <span style={{ background: TYPE_COLORS[type].bg, color: TYPE_COLORS[type].color }}>
        {count} {label}
      </span>
    ) : null
  )

  return (
    <div className={styles.parseSummary}>
      <span className={styles.parseSummaryLabel}>Detected types:</span>
      <div className={styles.parseSummaryPills}>
        {pill('multiple_choice', mcq,  'MCQ')}
        {pill('true_false',      tf,   'T/F')}
        {pill('short_answer',    sa,   'Short')}
        {other > 0 && <span style={{ background: '#f1f5f9', color: '#64748b' }}>{other} Other</span>}
      </div>
    </div>
  )
}