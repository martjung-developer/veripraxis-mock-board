'use client'

import styles from './sidebar.module.css'

/** Dashboard sidebar with role-based navigation links. */
export default function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
