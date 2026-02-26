// src/components/sections/Hero.tsx

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import { useCountUp } from '@/lib/hooks/useCountUp'
import styles from '@/app/page.module.css'

const TYPED_PHRASES = [
  'Board Exam',
  'Licensure Exam',
  'PRC Exam',
  'Review Exam',
]

const IMAGE_SETS = [
  // Main image slot
  [
    { src: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80', alt: 'Student studying for board exam' },
    { src: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=900&q=80', alt: 'Open notebook and pen' },
    { src: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=900&q=80', alt: 'Student writing notes' },
    { src: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=900&q=80', alt: 'University lecture hall' },
  ],
  // Secondary image slot
  [
    { src: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80', alt: 'Medical professional reviewing materials' },
    { src: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80', alt: 'Doctor studying medical books' },
    { src: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600&q=80', alt: 'Engineer at workstation' },
    { src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80', alt: 'Students studying together' },
  ],
  // Accent image slot
  [
    { src: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80', alt: 'Library and academic resources' },
    { src: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80', alt: 'Books stacked on desk' },
    { src: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&q=80', alt: 'Pen and notebook' },
    { src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80', alt: 'Team working on laptops' },
  ],
]

const ROTATION_INTERVAL = 4000

function RotatingImage({
  images,
  width,
  height,
  className,
  initialDelay = 0,
}: {
  images: { src: string; alt: string }[]
  width: number
  height: number
  className: string
  initialDelay?: number
}) {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let interval: ReturnType<typeof setInterval>

    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (!mountedRef.current) return
        setCurrent((c) => {
          setPrev(c)
          return (c + 1) % images.length
        })
      }, ROTATION_INTERVAL)
    }, initialDelay)

    return () => {
      mountedRef.current = false
      clearTimeout(start)
      clearInterval(interval)
    }
  }, [images.length, initialDelay])

  return (
    <div className={`${className} ${styles.rotatingImageWrapper}`}>
      {prev !== null && (
        <Image
          key={`prev-${prev}`}
          src={images[prev].src}
          alt={images[prev].alt}
          width={width}
          height={height}
          className={`${styles.rotatingImageLayer} ${styles.rotatingImageLayerOut}`}
        />
      )}
      <Image
        key={`curr-${current}`}
        src={images[current].src}
        alt={images[current].alt}
        width={width}
        height={height}
        className={`${styles.rotatingImageLayer} ${styles.rotatingImageLayerIn}`}
        priority={current === 0}
      />
    </div>
  )
}

function TypingText() {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const phrase = TYPED_PHRASES[phraseIdx]
    let timeout: ReturnType<typeof setTimeout>

    if (!deleting && displayed.length < phrase.length) {
      timeout = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 80)
    } else if (!deleting && displayed.length === phrase.length) {
      timeout = setTimeout(() => setDeleting(true), 1800)
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45)
    } else if (deleting && displayed.length === 0) {
      timeout = setTimeout(() => {
        setDeleting(false)
        setPhraseIdx((i) => (i + 1) % TYPED_PHRASES.length)
      }, 0)
    }

    return () => clearTimeout(timeout)
  }, [displayed, deleting, phraseIdx])

  return <span className={styles.heroTyped}>{displayed}</span>
}

function StatItem({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const { display, ref } = useCountUp({ end, suffix, duration: 1600 })
  return (
    <div className={styles.heroStat}>
      <div
        className={styles.heroStatValue}
        ref={ref as React.RefObject<HTMLDivElement>}
        aria-label={`${end.toLocaleString()}${suffix} ${label}`}
      >
        {display}
      </div>
      <div className={styles.heroStatLabel}>{label}</div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className={styles.hero} aria-label="Hero">
      <div className={styles.heroContent}>
        <div className={`${styles.heroBadge} reveal`}></div>

        <h1 className={`${styles.heroTitle} reveal reveal-delay-1`}>
          Ace Your{' '}
          <TypingText />
          <span className={styles.heroTitleAccent}>on the First Try.</span>
        </h1>

        <p className={`${styles.heroSub} reveal reveal-delay-2`}>
          VERIPRAXIS delivers adaptive mock exams, real-time analytics, and
          structured review paths built specifically for Filipino board exam
          candidates.
        </p>

        <div className={`${styles.heroActions} reveal reveal-delay-3`}>
          <Link href="/register" className={styles.btnPrimary}>
            Start Reviewing Free
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </Link>
          <Link href="#features" className={styles.btnOutline}>
            See How It Works
          </Link>
        </div>

        <div className={`${styles.heroStats} reveal reveal-delay-4`}>
          <StatItem end={10000} suffix="+" label="Active Reviewees" />
          <StatItem end={5000}  suffix="+" label="Practice Questions" />
          <StatItem end={95}    suffix="%" label="Pass Rate" />
        </div>
      </div>

      <div className={`${styles.heroVisual} reveal reveal-delay-2`} aria-hidden="true">
        <RotatingImage images={IMAGE_SETS[0]} width={900} height={600} className={styles.heroImgMain}      initialDelay={0}    />
        <RotatingImage images={IMAGE_SETS[1]} width={600} height={400} className={styles.heroImgSecondary} initialDelay={1500} />
        <RotatingImage images={IMAGE_SETS[2]} width={400} height={300} className={styles.heroImgAccent}    initialDelay={3000} />

        <div className={styles.heroImgFloat}>
          <div className={styles.heroImgFloatIcon}>
            <svg className={styles.heroImgFloatIconSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className={styles.heroImgFloatText}>
            <div className={styles.heroImgFloatLabel}>Mock Exam Score</div>
            <div className={styles.heroImgFloatValue}>78/100</div>
          </div>
        </div>
      </div>
    </section>
  )
}