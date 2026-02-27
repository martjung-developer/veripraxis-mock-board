// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VERIPRAXIS',
  description:
    'Ace your board exams with confidence. Realistic mock exams, detailed analytics, and comprehensive study materials for Filipino PRC licensure examinations.',
  openGraph: {
    title: 'Veripraxis',
    description: 'Pass your board exams on the first try.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}