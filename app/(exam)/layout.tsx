// app/(exam)/layout.tsx
import type { ReactNode } from 'react'

/**
 * Full-screen exam layout.
 * Intentionally renders ONLY {children} — no dashboard sidebar, no topbar.
 * The exam engine owns the entire viewport.
 */
export default function ExamLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}