// components/dashboard/student/results/ResultsRow.tsx
import { useRouter }     from 'next/navigation'
import { Eye, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ResultRow }      from '@/lib/types/student/results/results.types'
import { formatTime }          from '@/lib/utils/student/results/formatTime'
import { formatDate }          from '@/lib/utils/student/results/formatDate'
import { getPctColor }         from '@/lib/utils/student/results/getPctColor'
import { getPctFillClass }     from '@/lib/utils/student/results/getPctFillClass'
import styles from '@/app/(dashboard)/student/results/results.module.css'

interface Props {
  row: ResultRow
}

export function ResultsRow({ row }: Props) {
  const router = useRouter()

  return (
    <tr>
      {/* Exam */}
      <td>
        <p className={styles.examTitle}>{row.exam_title}</p>
        <div className={styles.examMeta}>
          <span className={styles.examCategory}>{row.category}</span>
          <span className={`${styles.examTypePill} ${row.exam_type === 'mock' ? styles.typeMock : styles.typePractice}`}>
            {row.exam_type}
          </span>
        </div>
      </td>

      {/* Score */}
      <td>
        {row.score !== null ? (
          <div className={styles.scoreWrap}>
            <span className={styles.scoreNum} style={{ color: getPctColor(row.percentage) }}>{row.score}</span>
            <span className={styles.scoreTotal}>/{row.total_points}</span>
          </div>
        ) : (
          <span className={styles.scoreTotal}>—</span>
        )}
      </td>

      {/* Percentage bar */}
      <td>
        <div className={styles.pctWrap}>
          <div className={styles.pctLabel} style={{ color: getPctColor(row.percentage) }}>
            {row.percentage !== null ? `${row.percentage}%` : '—'}
          </div>
          <div className={styles.pctTrack}>
            <div
              className={`${styles.pctFill} ${getPctFillClass(row.percentage, styles as unknown as Record<string, string>)}`}
              style={{ width: row.percentage !== null ? `${row.percentage}%` : '0%' }}
            />
          </div>
        </div>
      </td>

      {/* Status badge */}
      <td>
        {row.passed === true ? (
          <span className={`${styles.badge} ${styles.badgePassed}`}><CheckCircle2 size={10} /> Passed</span>
        ) : row.passed === false ? (
          <span className={`${styles.badge} ${styles.badgeFailed}`}>Failed</span>
        ) : (
          <span className={`${styles.badge} ${styles.badgePending}`}><AlertCircle size={10} /> Released</span>
        )}
      </td>

      {/* Time */}
      <td><span className={styles.timeVal}>{formatTime(row.time_spent_seconds)}</span></td>

      {/* Date */}
      <td><span className={styles.dateVal}>{formatDate(row.submitted_at)}</span></td>

      {/* Action */}
      <td>
        <button className={styles.reviewBtn} onClick={() => router.push(`/student/results/${row.id}`)}>
          <Eye size={13} /> Review
        </button>
      </td>
    </tr>
  )
}