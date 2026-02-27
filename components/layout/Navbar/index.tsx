'use client'

import styles from './navbar.module.css'

/** Main public navigation bar with links and auth buttons. */
export default function Navbar({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
