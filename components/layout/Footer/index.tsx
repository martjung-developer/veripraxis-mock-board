'use client'

import styles from './footer.module.css'

/** Public footer with link columns and copyright. */
export default function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
