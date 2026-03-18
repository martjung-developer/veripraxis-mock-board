// app/(pages)/programs/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Stethoscope, Cpu, Calculator, GraduationCap,
  Zap, Wrench, Building2, FlaskConical,
  ArrowRight, ChevronRight, Users, BookOpen, TrendingUp, Calendar,
} from 'lucide-react'
import { heroContainer, heroItem } from '@/animations/presets/publicPage'
import {
  programsContainer, programCard,
  filterRow, statsStrip, statItem, ctaSection,
} from '@/animations/programs/programsAnimations'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import styles from './programs.module.css'

type Category = 'All' | 'Health' | 'Engineering' | 'Business' | 'Education'

interface Program {
  code:     string
  name:     string
  icon:     React.ElementType
  photo:    string
  photoAlt: string
  accent:   string
  category: Omit<Category, 'All'>
  desc:     string
  questions: string
  passRate:  string
  status:    'available' | 'coming'
}

const PROGRAMS: Program[] = [
  {
    code: 'NLE', name: 'Nurse Licensure Exam',
    icon: Stethoscope,
    photo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80',
    photoAlt: 'Nurse reviewing medical materials',
    accent: '#2563eb', category: 'Health',
    desc: 'Comprehensive NLE prep covering all 8 nursing subjects with 3,000+ validated questions.',
    questions: '3,000+', passRate: '94%', status: 'available',
  },
  {
    code: 'ECE', name: 'Electronics Engineering',
    icon: Cpu,
    photo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
    photoAlt: 'Electronics circuit board',
    accent: '#16a34a', category: 'Engineering',
    desc: 'ECE board exam coverage across Mathematics, EST, GEAS, and Electronics subjects.',
    questions: '2,000+', passRate: '91%', status: 'available',
  },
  {
    code: 'CPA', name: 'Certified Public Accountant',
    icon: Calculator,
    photo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
    photoAlt: 'Accountant reviewing documents',
    accent: '#d97706', category: 'Business',
    desc: 'Full CPA board coverage: FAR, AFAR, MAS, Tax, Audit, and RegLaw with detailed rationales.',
    questions: '1,500+', passRate: '89%', status: 'available',
  },
  {
    code: 'LET', name: 'Licensure Exam for Teachers',
    icon: GraduationCap,
    photo: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80',
    photoAlt: 'Teacher in a classroom',
    accent: '#7c3aed', category: 'Education',
    desc: 'LET preparation for both Elementary and Secondary education majors, all fields.',
    questions: '1,200+', passRate: '92%', status: 'available',
  },
  {
    code: 'EE', name: 'Electrical Engineering',
    icon: Zap,
    photo: 'https://images.unsplash.com/photo-1497435334941-8c899a9bd9c1?w=600&q=80',
    photoAlt: 'Electrical engineering power lines',
    accent: '#ea580c', category: 'Engineering',
    desc: 'EE board exam prep: Power Systems, Machines, Electronics, and Circuit Theory.',
    questions: '1,800+', passRate: '90%', status: 'available',
  },
  {
    code: 'MD', name: 'Medical Board Exam',
    icon: FlaskConical,
    photo: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80',
    photoAlt: 'Medical professional studying',
    accent: '#dc2626', category: 'Health',
    desc: 'Philippine Medical Board comprehensive review across all major clinical subjects.',
    questions: '800+', passRate: '88%', status: 'available',
  },
  {
    code: 'PharmD', name: 'Pharmacy Licensure Exam',
    icon: FlaskConical,
    photo: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&q=80',
    photoAlt: 'Pharmacy laboratory',
    accent: '#0891b2', category: 'Health',
    desc: 'Pharmacist board exam prep covering Pharmaceutical Sciences, Clinical Pharmacy, and more.',
    questions: '600+', passRate: '—', status: 'coming',
  },
  {
    code: 'ME', name: 'Mechanical Engineering',
    icon: Wrench,
    photo: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=600&q=80',
    photoAlt: 'Mechanical engineering workshop',
    accent: '#475569', category: 'Engineering',
    desc: 'ME board exam coverage: Mathematics, Machine Design, Thermodynamics, and Power Plant.',
    questions: '1,000+', passRate: '—', status: 'coming',
  },
  {
    code: 'Arch', name: 'Architecture Licensure Exam',
    icon: Building2,
    photo: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&q=80',
    photoAlt: 'Architecture building',
    accent: '#b45309', category: 'Engineering',
    desc: 'Architecture board exam prep: Design & Planning, Building Technology, and History.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
]

const STATS = [
  { icon: BookOpen,   value: '12',      label: 'PRC Programs'      },
  { icon: Users,      value: '15,000+', label: 'Practice Questions' },
  { icon: TrendingUp, value: '94%',     label: 'Avg Pass Rate'     },
  { icon: Calendar,   value: 'Q3 2025', label: 'Next Program Drop' },
]

const CATEGORIES: Category[] = ['All', 'Health', 'Engineering', 'Business', 'Education']

export default function ProgramsPage() {
  const [active, setActive] = useState<Category>('All')

  const filtered = active === 'All'
    ? PROGRAMS
    : PROGRAMS.filter((p) => p.category === active)

  return (
    <>
      <Navbar />

      <main className={styles.page}>

        {/* ── HERO — split: dark panel left + 2×2 photo mosaic right ── */}
        <section className={styles.hero}>

          {/* Left: dark content panel */}
          <div className={styles.heroInner}>
            <motion.div {...heroContainer} className={styles.heroContent}>
              <motion.span {...heroItem} className={styles.heroBadge}>
                Exam Programs
              </motion.span>
              <motion.h1 {...heroItem} className={styles.heroTitle}>
                Prep for your{' '}
                <span className={styles.heroAccent}>specific board exam</span>
              </motion.h1>
              <motion.p {...heroItem} className={styles.heroSub}>
                VeriPraxis covers 12 PRC licensure programs with program-specific
                question banks, analytics, and study plans — all in one platform.
              </motion.p>
              <motion.div {...heroItem} className={styles.heroActions}>
                <Link href="/register" className={styles.btnPrimary}>
                  Start Reviewing Free <ArrowRight size={15} strokeWidth={2.5} />
                </Link>
                <Link href="#programs" className={styles.btnGhost}>
                  Browse Programs <ChevronRight size={15} />
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Right: 2×2 photo mosaic */}
          <div className={styles.heroBg}>
            <div>
              <Image
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=700&q=80"
                alt="Nursing student studying"
                fill style={{ objectFit: 'cover' }} priority
              />
            </div>
            <div>
              <Image
                src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&q=80"
                alt="Engineering circuit board"
                fill style={{ objectFit: 'cover' }}
              />
            </div>
            <div>
              <Image
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=700&q=80"
                alt="Teacher in classroom"
                fill style={{ objectFit: 'cover' }}
              />
            </div>
            <div>
              <Image
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700&q=80"
                alt="Accountant reviewing documents"
                fill style={{ objectFit: 'cover' }}
              />
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <div className={styles.statsStrip}>
          <motion.div className={styles.statsInner} {...statsStrip}>
            {STATS.map(({ icon: Icon, value, label }) => (
              <motion.div key={label} className={styles.statItem} {...statItem}>
                <div className={styles.statIcon}>
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div className={styles.statValue}>{value}</div>
                <div className={styles.statLabel}>{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ── BROWSE SECTION ── */}
        <div id="programs" className={styles.browseSection}>
          <div className={styles.browseHeader}>
            <div>
              <h2 className={styles.browseTitle}>All Programs</h2>
              <p className={styles.browseSub}>
                {filtered.length} program{filtered.length !== 1 ? 's' : ''} available
              </p>
            </div>
            <motion.div {...filterRow} className={styles.filterRow}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.filterBtn} ${active === cat ? styles.filterBtnActive : ''}`}
                  onClick={() => setActive(cat)}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className={styles.programsGrid}
              {...programsContainer}
            >
              {filtered.map((prog) => {
                const Icon = prog.icon
                return (
                  <motion.div
                    key={prog.code}
                    className={`${styles.programCard} ${prog.status === 'coming' ? styles.programCardDimmed : ''}`}
                    {...programCard}
                  >
                    {/* Photo header */}
                    <div className={styles.cardPhoto}>
                      <Image
                        src={prog.photo}
                        alt={prog.photoAlt}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                      <div
                        className={styles.cardPhotoOverlay}
                        style={{ background: `linear-gradient(to top, ${prog.accent}cc 0%, transparent 55%)` }}
                      />
                      <div className={styles.cardPhotoTop}>
                        <div className={styles.cardIconWrap} style={{ background: prog.accent }}>
                          <Icon size={16} strokeWidth={2} color="#fff" />
                        </div>
                        <span className={`${styles.cardStatusBadge} ${prog.status === 'available' ? styles.statusAvailable : styles.statusComing}`}>
                          {prog.status === 'available' ? 'Available' : 'Coming Soon'}
                        </span>
                      </div>
                      <div className={styles.cardCodeOverlay}>{prog.code}</div>
                    </div>

                    {/* Card body */}
                    <div className={styles.cardBody}>
                      <div className={styles.cardName}>{prog.name}</div>
                      <p className={styles.cardDesc}>{prog.desc}</p>
                      <div className={styles.cardMeta}>
                        <div className={styles.cardMetaItem}>
                          <strong>{prog.questions}</strong>
                          Questions
                        </div>
                        <div className={styles.cardMetaDivider} />
                        <div className={styles.cardMetaItem}>
                          <strong>{prog.passRate}</strong>
                          Pass Rate
                        </div>
                      </div>
                      {prog.status === 'available' ? (
                        <Link href="/register" className={styles.cardCta}>
                          Start Reviewing
                          <ArrowRight size={13} strokeWidth={2.5} />
                        </Link>
                      ) : (
                        <span className={styles.cardCtaDisabled}>Notify Me When Ready</span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── CTA ── */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaBg}>
            <Image
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1400&q=80"
              alt="Graduates celebrating"
              fill
              style={{ objectFit: 'cover' }}
            />
            <div className={styles.ctaBgOverlay} />
          </div>
          <motion.div className={styles.ctaInner} {...ctaSection}>
            <h2 className={styles.ctaTitle}>Don&apos;t see your program?</h2>
            <p className={styles.ctaSub}>
              We&apos;re adding new programs every quarter. Let us know which
              one you need and we&apos;ll prioritize it.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className={styles.btnPrimary}>
                Request a Program <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link href="/register" className={styles.btnGhost}>
                Browse Available Exams
              </Link>
            </div>
          </motion.div>
        </section>

      </main>

      <Footer />
    </>
  )
}