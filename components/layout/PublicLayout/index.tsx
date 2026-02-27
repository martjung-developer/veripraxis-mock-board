'use client'

import styles from './public-layout.module.css'

/** Wraps all public-facing pages with Navbar + Footer. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
