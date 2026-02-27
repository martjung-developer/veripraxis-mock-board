'use client'

import styles from './breadcrumb.module.css'

export default function Breadcrumb({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.root} ${className}`}>
      {children}
    </div>
  )
}
