'use client'

import styles from './pagination.module.css'

export default function Pagination({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.root} ${className}`}>
      {children}
    </div>
  )
}
