// components/dashboard/student/results/ResultsTable.tsx
import type { ResultRow }  from '@/lib/types/student/results/results.types'
import { ResultsRow }      from './ResultsRow'
import { ResultsSkeleton } from './ResultsSkeleton'
import styles from '@/app/(dashboard)/student/results/results.module.css'

interface Props {
  results: ResultRow[]
  loading: boolean
}

export function ResultsTable({ results, loading }: Props) {
  return (
    <div className={styles.tableCard}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Exam</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Time Spent</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <ResultsSkeleton />
              : results.map((row) => <ResultsRow key={row.id} row={row} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}