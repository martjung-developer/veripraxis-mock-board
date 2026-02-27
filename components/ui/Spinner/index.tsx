'use client'

import styles from './spinner.module.css'

export default function Spinner({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.root} ${className}`}>
      {children}
    </div>
  )
}
