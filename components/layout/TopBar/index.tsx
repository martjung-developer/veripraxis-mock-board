'use client'

import styles from './topbar.module.css'

/** Dashboard top bar with user menu, notifications, search. */
export default function TopBar({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
