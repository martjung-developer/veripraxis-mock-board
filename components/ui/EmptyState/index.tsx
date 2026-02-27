'use client'

import styles from './empty-state.module.css'

export default function EmptyState({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.root} ${className}`}>
      {children}
    </div>
  )
}
