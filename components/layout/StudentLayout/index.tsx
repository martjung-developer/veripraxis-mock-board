'use client'

import styles from './student-layout.module.css'

/** Student-specific dashboard shell with student nav items. */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
