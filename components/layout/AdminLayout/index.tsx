'use client'

import styles from './admin-layout.module.css'

/** Admin-specific dashboard shell with admin nav items. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
