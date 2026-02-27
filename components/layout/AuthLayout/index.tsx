'use client'

import styles from './auth-layout.module.css'

/** Minimal centered layout for login, signup, reset pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrapper}>
      {children}
    </div>
  )
}
