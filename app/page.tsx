// apps/web/app/page.tsx
'use client'

import { useScrollReveal } from '@/lib/hooks/useScrollReveal'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/sections/Hero'
import Features from '@/components/sections/Features'
import Programs from '@/components/sections/Programs'
import Testimonials from '@/components/sections/Testimonials'
import Pricing from '@/components/sections/Pricing'
import FAQ from '@/components/sections/FAQ'
import styles from './page.module.css'

export default function HomePage() {
  const pageRef = useScrollReveal()

  return (
    <div className={styles.wrapper} ref={pageRef as React.RefObject<HTMLDivElement>}>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Programs />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}