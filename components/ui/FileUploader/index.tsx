'use client'

import styles from './file-uploader.module.css'

export default function FileUploader({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.root} ${className}`}>
      {children}
    </div>
  )
}
