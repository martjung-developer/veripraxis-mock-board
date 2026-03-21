// app/(pages)/programs/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookMarked, Brain, School, Languages, FunctionSquare,
  BookOpen, FlaskConical, Compass, Sofa,
  Stethoscope, Cpu, Calculator, GraduationCap,
  Zap, Wrench, Building2,
  ArrowRight, ChevronRight, Users, TrendingUp, Calendar,
} from 'lucide-react'
import { heroContainer, heroItem } from '@/animations/presets/publicPage'
import {
  programsContainer, programCard,
  filterRow, statsStrip, statItem, ctaSection,
} from '@/animations/programs/programsAnimations'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import styles from './programs.module.css'

type Category = 'All' | 'Health' | 'Engineering' | 'Business' | 'Education' | 'Arts & Design'

interface Program {
  code:      string
  name:      string
  icon:      React.ElementType
  photo:     string
  photoAlt:  string
  accent:    string
  category:  Omit<Category, 'All'>
  desc:      string
  questions: string
  passRate:  string
  status:    'available' | 'coming'
  priority?: boolean
}

/* ─── 9 LCCB-offered programs (priority = available) ─── */
const LCCB_PROGRAMS: Program[] = [
  {
    code: 'LLE',
    name: 'Librarian Licensure Examination',
    icon: BookMarked,
    photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=700&q=80',
    photoAlt: 'Library shelves filled with books',
    accent: '#0f766e',
    category: 'Education',
    desc: 'Covers cataloging & classification, reference services, library administration, collection development, and information technology.',
    questions: '900+', passRate: '91%', status: 'available', priority: true,
  },
  {
    code: 'PLE',
    name: 'Psychometrician Licensure Examination',
    icon: Brain,
    photo: 'https://images.pexels.com/photos/3760809/pexels-photo-3760809.jpeg?w=700&q=80',
    photoAlt: 'Psychologist reviewing assessment tools',
    accent: '#7c3aed',
    category: 'Education',
    desc: 'Covers psychological assessment, statistics, research methodology, and the ethical practice of psychometry in clinical and organizational settings.',
    questions: '800+', passRate: '89%', status: 'available', priority: true,
  },
  {
    code: 'LET-Elem',
    name: 'LET — Elementary Education',
    icon: School,
    photo: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=700&q=80',
    photoAlt: 'Elementary school classroom with children',
    accent: '#d97706',
    category: 'Education',
    desc: 'Assesses foundational teaching competencies — professional education theory, child development, curriculum planning, and general education content.',
    questions: '1,100+', passRate: '93%', status: 'available', priority: true,
  },
  {
    code: 'LET-Fil',
    name: 'LET Secondary Education — Filipino',
    icon: Languages,
    photo: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=700&q=80',
    photoAlt: 'Filipino books and literature',
    accent: '#dc2626',
    category: 'Education',
    desc: 'Focuses on Filipino language proficiency, panitikang Pilipino, retorika, and pedagogy for teaching Filipino at the secondary level.',
    questions: '950+', passRate: '92%', status: 'available', priority: true,
  },
  {
    code: 'LET-Math',
    name: 'LET Secondary Education — Mathematics',
    icon: FunctionSquare,
    photo: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=700&q=80',
    photoAlt: 'Mathematics formulas on a blackboard',
    accent: '#1d4ed8',
    category: 'Education',
    desc: 'Covers algebra, geometry, trigonometry, statistics, and calculus alongside pedagogical content knowledge for secondary math instruction.',
    questions: '1,000+', passRate: '90%', status: 'available', priority: true,
  },
  {
    code: 'LET-Eng',
    name: 'LET Secondary Education — English',
    icon: BookOpen,
    photo: 'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?w=700&q=80',
    photoAlt: 'English grammar books on a desk',
    accent: '#0891b2',
    category: 'Education',
    desc: 'Evaluates grammar, communication arts, literature, language teaching methodology, and assessment strategies for secondary English educators.',
    questions: '950+', passRate: '91%', status: 'available', priority: true,
  },
  {
    code: 'LET-Sci',
    name: 'LET Secondary Education — Science',
    icon: FlaskConical,
    photo: 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?w=700&q=80',
    photoAlt: 'Science laboratory with flasks and equipment',
    accent: '#16a34a',
    category: 'Education',
    desc: 'Encompasses biology, chemistry, physics, and earth science with emphasis on inquiry-based and laboratory teaching approaches.',
    questions: '1,000+', passRate: '90%', status: 'available', priority: true,
  },
  {
    code: 'ALE',
    name: 'Architect Licensure Examination',
    icon: Compass,
    photo: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=700&q=80',
    photoAlt: 'Architecture blueprints and technical drawings',
    accent: '#b45309',
    category: 'Arts & Design',
    desc: 'Tests architectural design, building technology, structures, utilities, and the legal framework governing architectural practice in the Philippines.',
    questions: '1,200+', passRate: '88%', status: 'available', priority: true,
  },
  {
    code: 'IDLE',
    name: 'Interior Designer Licensure Exam',
    icon: Sofa,
    photo: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?w=700&q=80',
    photoAlt: 'Modern interior design room setup',
    accent: '#be185d',
    category: 'Arts & Design',
    desc: 'Covers design principles, space planning, materials and specifications, environmental systems, and professional practice for aspiring registered interior designers.',
    questions: '700+', passRate: '87%', status: 'available', priority: true,
  },
]

/* ─── Other programs shown as Coming Soon ─── */
const OTHER_PROGRAMS: Program[] = [
  {
    code: 'NLE', name: 'Nursing Licensure Exam',
    icon: Stethoscope,
    photo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=700&q=80',
    photoAlt: 'Nurse reviewing medical materials',
    accent: '#2563eb', category: 'Health',
    desc: 'Comprehensive NLE prep covering all 8 nursing subjects with validated questions and detailed rationales.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
  {
    code: 'CPA', name: 'Certified Public Accountant',
    icon: Calculator,
    photo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700&q=80',
    photoAlt: 'Accountant reviewing documents',
    accent: '#d97706', category: 'Business',
    desc: 'Full CPA board coverage: FAR, AFAR, MAS, Tax, Audit, and RegLaw with detailed rationales.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
  {
    code: 'ECE', name: 'Electronics Engineering',
    icon: Cpu,
    photo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&q=80',
    photoAlt: 'Electronics circuit board',
    accent: '#16a34a', category: 'Engineering',
    desc: 'ECE board exam coverage across Mathematics, EST, GEAS, and Electronics subjects.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
  {
    code: 'EE', name: 'Electrical Engineering',
    icon: Zap,
    photo: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=700&q=80',
    photoAlt: 'Electrician testing electrical control panel',
    accent: '#ea580c', category: 'Engineering',
    desc: 'EE board exam prep: Power Systems, Machines, Electronics, and Circuit Theory.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
  {
    code: 'ME', name: 'Mechanical Engineering',
    icon: Wrench,
    photo: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=700&q=80',
    photoAlt: 'Mechanical engineering workshop',
    accent: '#475569', category: 'Engineering',
    desc: 'ME board exam coverage: Mathematics, Machine Design, Thermodynamics, and Power Plant.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
  {
    code: 'GE', name: 'Guidance Counselor Licensure Exam',
    icon: GraduationCap,
    photo: 'https://images.pexels.com/photos/6325984/pexels-photo-6325984.jpeg?w=700&q=80',
    photoAlt: 'Guidance counselor with student',
    accent: '#0891b2', category: 'Education',
    desc: 'Covers counseling theory, psychological assessment, group dynamics, and career development.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
  {
    code: 'SW', name: 'Social Worker Licensure Exam',
    icon: Users,
    photo: 'https://images.pexels.com/photos/6647037/pexels-photo-6647037.jpeg?w=700&q=80',
    photoAlt: 'Social worker in community',
    accent: '#15803d', category: 'Health',
    desc: 'Covers social work practice, community organizing, and research for aspiring registered social workers.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
  {
    code: 'PharmD', name: 'Pharmacy Licensure Exam',
    icon: Building2,
    photo: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=700&q=80',
    photoAlt: 'Pharmacy laboratory',
    accent: '#0891b2', category: 'Health',
    desc: 'Pharmacist board exam prep covering Pharmaceutical Sciences, Clinical Pharmacy, and more.',
    questions: 'Coming', passRate: '—', status: 'coming',
  },
]

const ALL_PROGRAMS = [...LCCB_PROGRAMS, ...OTHER_PROGRAMS]

const STATS = [
  { icon: BookMarked, value: '9',       label: 'Active Programs'    },
  { icon: Users,      value: '10,000+', label: 'Practice Questions' },
  { icon: TrendingUp, value: '91%',     label: 'Avg Pass Rate'      },
  { icon: Calendar,   value: 'Live Now',label: 'LCCB Programs'      },
]

const CATEGORIES: Category[] = ['All', 'Education', 'Arts & Design', 'Health', 'Engineering', 'Business']

export default function ProgramsPage() {
  const [active, setActive] = useState<Category>('All')

  const filtered = active === 'All'
    ? ALL_PROGRAMS
    : ALL_PROGRAMS.filter((p) => p.category === active)

  return (
    <>
      <Navbar />

      <main className={styles.page}>

        {/* ── HERO ── */}
        <section className={styles.hero}>
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
                VeriPraxis covers PRC licensure programs with program-specific
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

          {/* 2×2 mosaic — LCCB-flavored photos */}
          <div className={styles.heroBg}>
            {[
              { src: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=700&q=80', alt: 'Library books' },
              { src: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=700&q=80', alt: 'Classroom teaching' },
              { src: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=700&q=80', alt: 'Architecture blueprints' },
              { src: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?w=700&q=80', alt: 'Interior design' },
            ].map(({ src, alt }) => (
              <div key={alt}>
                <Image src={src} alt={alt} fill style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <div className={styles.statsStrip}>
          <motion.div className={styles.statsInner} {...statsStrip}>
            {STATS.map(({ icon: Icon, value, label }) => (
              <motion.div key={label} className={styles.statItem} {...statItem}>
                <div className={styles.statIcon}><Icon size={18} strokeWidth={1.75} /></div>
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
                {filtered.length} program{filtered.length !== 1 ? 's' : ''} —{' '}
                {filtered.filter(p => p.status === 'available').length} available now
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
            <motion.div key={active} className={styles.programsGrid} {...programsContainer}>
              {filtered.map((prog) => {
                const Icon = prog.icon
                return (
                  <motion.div
                    key={prog.code}
                    className={`${styles.programCard} ${prog.status === 'coming' ? styles.programCardDimmed : ''}`}
                    {...programCard}
                  >
                    <div className={styles.cardPhoto}>
                      <Image src={prog.photo} alt={prog.photoAlt} fill style={{ objectFit: 'cover' }} />
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

                    <div className={styles.cardBody}>
                      <div className={styles.cardName}>{prog.name}</div>
                      <p className={styles.cardDesc}>{prog.desc}</p>
                      <div className={styles.cardMeta}>
                        <div className={styles.cardMetaItem}>
                          <strong>{prog.questions}</strong>Questions
                        </div>
                        <div className={styles.cardMetaDivider} />
                        <div className={styles.cardMetaItem}>
                          <strong>{prog.passRate}</strong>Pass Rate
                        </div>
                      </div>
                      {prog.status === 'available' ? (
                        <Link href="/register" className={styles.cardCta}>
                          Start Reviewing <ArrowRight size={13} strokeWidth={2.5} />
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
              src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1400&q=80"
              alt="Graduates celebrating"
              fill style={{ objectFit: 'cover' }}
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