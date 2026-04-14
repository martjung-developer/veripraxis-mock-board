// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#0d1117',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: {
    default: 'VeriPraxis',
    template: '%s | VeriPraxis',
  },
  description:
    'PRC licensure exam reviewer and mock exam platform for Filipino students.',
  manifest: '/manifest.json',

  // ── Open Graph (important for Messenger / iMessage previews) ──
  openGraph: {
    title: 'VeriPraxis',
    description:
      'Ace your PRC licensure exam with mock exams, reviewers, and progress tracking.',
    type: 'website',
    locale: 'en_PH',
    images: [
      {
        url: '/images/veripraxislogo-title.png',
        width: 1200,
        height: 630,
        alt: 'VeriPraxis Logo',
      },
    ],
  },

  // ── Icons / Favicons ──
  icons: {
    icon: [
      {
        url: '/images/veripraxislogo-title.png',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/images/veripraxislogo-title.png',
        sizes: '180x180',
        type: 'image/png',  
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  )
}