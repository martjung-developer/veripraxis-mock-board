// components/dashboard/student/results/ResultsHeader.tsx
import styles from '@/app/(dashboard)/student/results/results.module.css'

export function ResultsHeader() {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.title}>My Results</h1>
        <p className={styles.subtitle}>Scores are shown only after faculty review and release.</p>
      </div>
    </div>
  )
}