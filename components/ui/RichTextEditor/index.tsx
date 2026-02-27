'use client'

import styles from './rich-text-editor.module.css'

export default function RichTextEditor({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.root} ${className}`}>
      {children}
    </div>
  )
}
