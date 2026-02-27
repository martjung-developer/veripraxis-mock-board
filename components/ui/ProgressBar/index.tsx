'use client'

import styles from './progress-bar.module.css'

export default function ProgressBar({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.root} ${className}`}>
      {children}
    </div>
  )
}
