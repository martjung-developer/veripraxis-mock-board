// app/page.tsx
'use client'

import Navbar from '@/components/layout/Navbar'
import Hero from '@/components/sections/Hero'
import Features from '@/components/sections/Features'
import Programs from '@/components/sections/Programs'
import Testimonials from '@/components/sections/Testimonials'
import Pricing from '@/components/sections/Pricing'
import FAQ from '@/components/sections/FAQ'
import Footer from '@/components/layout/Footer'
import styles from '@/app/page.module.css'
import { useScrollReveal } from '@/lib/hooks/useScrollReveal'

export default function Page() {
  const containerRef = useScrollReveal()

  return (
    <div className={styles.wrapper} ref={containerRef as React.RefObject<HTMLDivElement>}>
      <Navbar />
      <Hero />
      <Features />
      <Programs />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  )
}
