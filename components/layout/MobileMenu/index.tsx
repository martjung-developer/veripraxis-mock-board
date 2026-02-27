'use client'

import styles from './mobile-menu.module.css'

/** Slide-out mobile navigation drawer. */
export default function MobileMenu({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
