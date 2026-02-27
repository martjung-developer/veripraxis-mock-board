'use client'

import styles from './dashboard-layout.module.css'

/** Wraps all dashboard pages with Sidebar + TopBar. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
