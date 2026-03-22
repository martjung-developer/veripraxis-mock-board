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
  description: 'PRC licensure exam reviewer and mock exam platform for Filipino students.',
  manifest: '/manifest.json',

  // ── iOS PWA ──
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',  // blends with dark navy
    title: 'VeriPraxis',
    startupImage: [
      // iPhone XS  (1125×2436)
      {
        url: '/splash/splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone XS Max / 11 Pro Max (1242×2688)
      {
        url: '/splash/splash-1242x2688.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone 11 / XR (828×1792)
      {
        url: '/splash/splash-828x1792.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
      },
      // iPhone 8 / SE (750×1334)
      {
        url: '/splash/splash-750x1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },

  // ── Open Graph (looks good when shared via iMessage) ──
  openGraph: {
    title: 'VeriPraxis',
    description: 'Ace your PRC licensure exam with mock exams, reviewers, and progress tracking.',
    type: 'website',
    locale: 'en_PH',
  },

  // ── Icons ──
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png',   sizes: '32x32',  type: 'image/png' },
      { url: '/icons/icon-96x96.png',   sizes: '96x96',  type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
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