// components/dashboard/student/results/ResultsSkeleton.tsx
import styles from '@/app/(dashboard)/student/results/results.module.css'

export function ResultsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td>
            <div className={styles.skeleton} style={{ height: 13, width: '68%', marginBottom: 6, borderRadius: 5 }} />
            <div className={styles.skeleton} style={{ height: 10, width: '38%', borderRadius: 5 }} />
          </td>
          <td><div className={styles.skeleton} style={{ height: 18, width: 52, borderRadius: 5 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 8, width: 90, borderRadius: 99 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 22, width: 66, borderRadius: 99 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 13, width: 50, borderRadius: 5 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 13, width: 74, borderRadius: 5 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 30, width: 78, borderRadius: 8 }} /></td>
        </tr>
      ))}
    </>
  )
}