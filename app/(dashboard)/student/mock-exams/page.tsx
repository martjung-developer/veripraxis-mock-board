// app/(dashboard)/student/mock-exams/page.tsx
'use client'

import { useState, useMemo } from 'react'
import {
  BookOpen, Clock, Lock, PlayCircle, GraduationCap,
  Search, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import styles from './mock-exams.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

type ExamStatus = 'available' | 'coming_soon'

interface MockExam {
  id: string
  program: string
  shortCode: string
  category: string
  status: ExamStatus
  questions?: number
  duration?: string
  subject?: string
}

// ── All PRC Licensure Programs ─────────────────────────────────────────────

const MOCK_EXAMS: MockExam[] = [
  // ── Available ──
  {
    id: '1',
    program: 'Bachelor of Library and Information Science',
    shortCode: 'BLIS',
    category: 'Social Sciences',
    status: 'available',
    questions: 300,
    duration: '10 hrs',
    subject: 'Librarians Licensure Exam (LLE)',
  },
  {
    id: '2',
    program: 'Bachelor of Science in Architecture',
    shortCode: 'BSArch',
    category: 'Architecture & Design',
    status: 'available',
    questions: 300,
    duration: '16 hrs',
    subject: 'Licensure Examination for Architects (LEA)',
  },
  {
    id: '3',
    program: 'Bachelor of Science in Secondary Education – English',
    shortCode: 'BSEd-ENG',
    category: 'Education',
    status: 'available',
    questions: 300,
    duration: '8 hrs',
    subject: 'Licensure Examination for Teachers (LET)',
  },

  // ── Health & Medicine ──
  { id: '4',  program: 'Doctor of Medicine',                                      shortCode: 'MD',          category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '5',  program: 'Bachelor of Science in Nursing',                          shortCode: 'BSN',         category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '6',  program: 'Bachelor of Science in Medical Technology',               shortCode: 'BSMT',        category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '7',  program: 'Bachelor of Science in Physical Therapy',                 shortCode: 'BSPT',        category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '8',  program: 'Bachelor of Science in Occupational Therapy',             shortCode: 'BSOT',        category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '9',  program: 'Bachelor of Science in Pharmacy',                         shortCode: 'BSPharm',     category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '10', program: 'Bachelor of Science in Dentistry',                        shortCode: 'BSD',         category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '11', program: 'Doctor of Optometry',                                     shortCode: 'OD',          category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '12', program: 'Bachelor of Science in Radiologic Technology',            shortCode: 'BSRT',        category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '13', program: 'Bachelor of Science in Nutrition and Dietetics',          shortCode: 'BSND',        category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '14', program: 'Bachelor of Science in Midwifery',                        shortCode: 'BSMid',       category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '15', program: 'Doctor of Veterinary Medicine',                           shortCode: 'DVM',         category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '16', program: 'Bachelor of Science in Respiratory Therapy',              shortCode: 'BSRETH',      category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '17', program: 'Bachelor of Science in Speech-Language Pathology',        shortCode: 'BSSLP',       category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '18', program: 'Bachelor of Science in Medical Imaging Technology',       shortCode: 'BSMIT',       category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '19', program: 'Bachelor of Science in Sanitation',                       shortCode: 'BSSan',       category: 'Health & Medicine',      status: 'coming_soon' },
  { id: '20', program: 'Bachelor of Science in X-Ray Technology',                 shortCode: 'BSXRT',       category: 'Health & Medicine',      status: 'coming_soon' },

  // ── Engineering ──
  { id: '21', program: 'Bachelor of Science in Civil Engineering',              shortCode: 'BSCE',        category: 'Engineering',            status: 'coming_soon' },
  { id: '22', program: 'Bachelor of Science in Electrical Engineering',           shortCode: 'BSEE',        category: 'Engineering',            status: 'coming_soon' },
  { id: '23', program: 'Bachelor of Science in Mechanical Engineering',           shortCode: 'BSME',        category: 'Engineering',            status: 'coming_soon' },
  { id: '24', program: 'Bachelor of Science in Electronics Engineering',          shortCode: 'BSECE',       category: 'Engineering',            status: 'coming_soon' },
  { id: '25', program: 'Bachelor of Science in Chemical Engineering',             shortCode: 'BSChE',       category: 'Engineering',            status: 'coming_soon' },
  { id: '26', program: 'Bachelor of Science in Geodetic Engineering',             shortCode: 'BSGE',        category: 'Engineering',            status: 'coming_soon' },
  { id: '27', program: 'Bachelor of Science in Mining Engineering',               shortCode: 'BSMnE',       category: 'Engineering',            status: 'coming_soon' },
  { id: '28', program: 'Bachelor of Science in Metallurgical Engineering',        shortCode: 'BSMetE',      category: 'Engineering',            status: 'coming_soon' },
  { id: '29', program: 'Bachelor of Science in Sanitary Engineering',             shortCode: 'BSSE',        category: 'Engineering',            status: 'coming_soon' },
  { id: '30', program: 'Bachelor of Science in Naval Architecture & Marine Eng.', shortCode: 'BSNAME',      category: 'Engineering',            status: 'coming_soon' },
  { id: '31', program: 'Bachelor of Science in Agricultural Engineering',         shortCode: 'BSAgrE',      category: 'Engineering',            status: 'coming_soon' },
  { id: '32', program: 'Bachelor of Science in Environmental Engineering',        shortCode: 'BSEnvE',      category: 'Engineering',            status: 'coming_soon' },
  { id: '33', program: 'Bachelor of Science in Computer Engineering',             shortCode: 'BSCpE',       category: 'Engineering',            status: 'coming_soon' },
  { id: '34', program: 'Bachelor of Science in Aeronautical Engineering',         shortCode: 'BSAeroE',     category: 'Engineering',            status: 'coming_soon' },
  { id: '35', program: 'Bachelor of Science in Industrial Engineering',           shortCode: 'BSIE',        category: 'Engineering',            status: 'coming_soon' },
  { id: '36', program: 'Bachelor of Science in Petroleum Engineering',            shortCode: 'BSPetE',      category: 'Engineering',            status: 'coming_soon' },

  // ── Architecture & Design ──
  { id: '37', program: 'Bachelor of Science in Interior Design',                  shortCode: 'BSID',        category: 'Architecture & Design',  status: 'coming_soon' },
  { id: '38', program: 'Bachelor of Science in Landscape Architecture',           shortCode: 'BSLA',        category: 'Architecture & Design',  status: 'coming_soon' },
  { id: '39', program: 'Bachelor of Fine Arts',                                   shortCode: 'BFA',         category: 'Architecture & Design',  status: 'coming_soon' },
  { id: '40', program: 'Bachelor of Science in Environmental Planning',           shortCode: 'BSEnvP',      category: 'Architecture & Design',  status: 'coming_soon' },

  // ── Business & Finance ──
  { id: '41', program: 'Bachelor of Science in Accountancy',                     shortCode: 'BSA',         category: 'Business & Finance',     status: 'coming_soon' },
  { id: '42', program: 'Bachelor of Science in Real Estate Management',           shortCode: 'BSREM',       category: 'Business & Finance',     status: 'coming_soon' },
  { id: '43', program: 'Bachelor of Science in Customs Administration',           shortCode: 'BSCA',        category: 'Business & Finance',     status: 'coming_soon' },

  // ── Education ──
  { id: '44', program: 'Bachelor of Science in Secondary Education – Filipino',             shortCode: 'BSEd-FIL',    category: 'Education',              status: 'coming_soon' },
  { id: '45', program: 'Bachelor of Science in Secondary Education – Mathematics',          shortCode: 'BSEd-MATH',   category: 'Education',              status: 'coming_soon' },
  { id: '46', program: 'Bachelor of Science in Secondary Education – Science',              shortCode: 'BSEd-SCI',    category: 'Education',              status: 'coming_soon' },
  { id: '47', program: 'Bachelor of Science in Secondary Education – Social Studies',       shortCode: 'BSEd-SS',     category: 'Education',              status: 'coming_soon' },
  { id: '48', program: 'Bachelor of Science in Secondary Education – MAPEH',                shortCode: 'BSEd-MAPEH',  category: 'Education',              status: 'coming_soon' },
  { id: '49', program: 'Bachelor of Science in Secondary Education – TLE',                  shortCode: 'BSEd-TLE',    category: 'Education',              status: 'coming_soon' },
  { id: '50', program: 'Bachelor of Science in Elementary Education',                        shortCode: 'BEEd',        category: 'Education',              status: 'coming_soon' },
  { id: '51', program: 'Bachelor of Early Childhood Education',                   shortCode: 'BECEd',       category: 'Education',              status: 'coming_soon' },
  { id: '52', program: 'Bachelor of Special Needs Education',                     shortCode: 'BSNEd',       category: 'Education',              status: 'coming_soon' },
  { id: '53', program: 'Bachelor of Physical Education',                          shortCode: 'BPEd',        category: 'Education',              status: 'coming_soon' },
  { id: '54', program: 'Bachelor of Technical-Vocational Teacher Education',      shortCode: 'BTVTEd',      category: 'Education',              status: 'coming_soon' },
  { id: '55', program: 'Bachelor of Culture and Arts Education',                  shortCode: 'BCAEd',       category: 'Education',              status: 'coming_soon' },

  // ── Natural Sciences & Agriculture ──
  { id: '56', program: 'Bachelor of Science in Agriculture',                      shortCode: 'BSAg',        category: 'Natural Sciences',       status: 'coming_soon' },
  { id: '57', program: 'Bachelor of Science in Forestry',                         shortCode: 'BSF',         category: 'Natural Sciences',       status: 'coming_soon' },
  { id: '58', program: 'Bachelor of Science in Fisheries',                        shortCode: 'BSFish',      category: 'Natural Sciences',       status: 'coming_soon' },
  { id: '59', program: 'Bachelor of Science in Geology',                          shortCode: 'BSGeol',      category: 'Natural Sciences',       status: 'coming_soon' },
  { id: '60', program: 'Bachelor of Science in Chemistry',                        shortCode: 'BSChem',      category: 'Natural Sciences',       status: 'coming_soon' },

  // ── Social Sciences ──
  { id: '61', program: 'Bachelor of Science in Psychology',                       shortCode: 'BSPsych',     category: 'Social Sciences',        status: 'coming_soon' },
  { id: '62', program: 'Bachelor of Science in Social Work',                      shortCode: 'BSSW',        category: 'Social Sciences',        status: 'coming_soon' },
  { id: '63', program: 'Bachelor of Science in Guidance and Counseling',          shortCode: 'BSGC',        category: 'Social Sciences',        status: 'coming_soon' },
  { id: '64', program: 'Bachelor of Science in Criminology',                      shortCode: 'BSCrim',      category: 'Social Sciences',        status: 'coming_soon' },

  // ── Law & Government ──
  { id: '65', program: 'Bachelor of Laws / Juris Doctor',                         shortCode: 'LLB / JD',    category: 'Law & Government',       status: 'coming_soon' },
  { id: '66', program: 'Bachelor of Science in Public Administration',            shortCode: 'BSPA',        category: 'Law & Government',       status: 'coming_soon' },

  // ── Maritime ──
  { id: '67', program: 'Bachelor of Science in Marine Transportation',            shortCode: 'BSMT',        category: 'Maritime',               status: 'coming_soon' },
  { id: '68', program: 'Bachelor of Science in Marine Engineering',               shortCode: 'BSMarE',      category: 'Maritime',               status: 'coming_soon' },

  // ── Hospitality & Tourism ──
  { id: '69', program: 'Bachelor of Science in Tourism Management',               shortCode: 'BSTM',        category: 'Hospitality & Tourism',  status: 'coming_soon' },
  { id: '70', program: 'Bachelor of Science in Hotel and Restaurant Management',  shortCode: 'BSHRM',       category: 'Hospitality & Tourism',  status: 'coming_soon' },

]

const CATEGORIES = [
  'All Categories',
  ...Array.from(new Set(MOCK_EXAMS.map((e) => e.category))).sort(),
]

const PAGE_SIZE = 12

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExamStatus }) {
  return (
    <span
      className={`${styles.badge} ${
        status === 'available' ? styles.badgeAvailable : styles.badgeComingSoon
      }`}
    >
      {status === 'available' ? 'Available' : 'Coming Soon'}
    </span>
  )
}

function ExamCard({ exam }: { exam: MockExam }) {
  const isAvailable = exam.status === 'available'

  return (
    <div className={`${styles.examCard} ${isAvailable ? styles.examCardAvailable : ''}`}>
      <div
        className={`${styles.cardAccent} ${
          isAvailable ? styles.cardAccentAvailable : styles.cardAccentSoon
        }`}
      />

      <div className={styles.cardTop}>
        <div
          className={`${styles.cardIconWrap} ${
            isAvailable ? styles.cardIconAvailable : styles.cardIconSoon
          }`}
        >
          <GraduationCap size={20} strokeWidth={1.75} />
        </div>
        <StatusBadge status={exam.status} />
      </div>

      <div className={styles.cardBody}>
        <p className={styles.shortCode}>{exam.shortCode}</p>
        <h3 className={styles.programName}>{exam.program}</h3>
        {isAvailable && exam.subject && (
          <p className={styles.subjectLabel}>{exam.subject}</p>
        )}
        <span className={styles.categoryTag}>{exam.category}</span>
      </div>

      {isAvailable && (
        <div className={styles.cardMeta}>
          <span className={styles.metaItem}>
            <BookOpen size={13} strokeWidth={2} />
            {exam.questions} items
          </span>
          <span className={styles.metaItem}>
            <Clock size={13} strokeWidth={2} />
            {exam.duration}
          </span>
        </div>
      )}

      <div className={styles.cardFooter}>
        {isAvailable ? (
          <button className={styles.startBtn}>
            <PlayCircle size={15} strokeWidth={2} />
            Start Exam
          </button>
        ) : (
          <button className={styles.disabledBtn} disabled>
            <Lock size={13} strokeWidth={2} />
            Waiting for Admin Assignment
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MockExamsPage() {
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('All Categories')
  const [page,     setPage]     = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return MOCK_EXAMS.filter((e) => {
      const matchCat = category === 'All Categories' || e.category === category
      const matchQ   = !q || e.program.toLowerCase().includes(q) || e.shortCode.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [search, category])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage       = Math.min(page, totalPages)
  // Reset to page 1 when filters change
  const key = `${search}-${category}`
  const paginated      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const availableCount = MOCK_EXAMS.filter((e) => e.status === 'available').length

  // Smart page number list
  const pageNums: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i)
  } else {
    pageNums.push(1)
    if (safePage > 3) pageNums.push('…')
    const start = Math.max(2, safePage - 1)
    const end   = Math.min(totalPages - 1, safePage + 1)
    for (let i = start; i <= end; i++) pageNums.push(i)
    if (safePage < totalPages - 2) pageNums.push('…')
    pageNums.push(totalPages)
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mock Exams</h1>
          <p className={styles.subtitle}>Take exams assigned by your faculty</p>
        </div>
        <span className={styles.availablePill}>
          <span className={styles.dot} />
          {availableCount} Available
        </span>
      </div>

      {/* ── Search + Filter ── */}
      <div className={styles.filterRow}>
        <div className={styles.searchWrap}>
          <Search size={15} strokeWidth={2.2} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by program or code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button
              className={styles.searchClear}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <select
          className={styles.categorySelect}
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <p className={styles.resultCount}>
          <strong>{filtered.length}</strong> program{filtered.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* ── Grid ── */}
      {paginated.length > 0 ? (
        <div className={styles.grid}>
          {paginated.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Search size={40} strokeWidth={1.4} color="#cbd5e1" />
          <p className={styles.emptyTitle}>No programs found</p>
          <p className={styles.emptyText}>Try adjusting your search or category filter.</p>
          <button
            className={styles.emptyBtn}
            onClick={() => { setSearch(''); setCategory('All Categories') }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Page {safePage} of {totalPages} &nbsp;·&nbsp; {filtered.length} total
          </span>

          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>

            {pageNums.map((n, i) =>
              n === '…' ? (
                <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
              ) : (
                <button
                  key={n}
                  className={`${styles.pageNum} ${safePage === n ? styles.pageNumActive : ''}`}
                  onClick={() => setPage(n as number)}
                >
                  {n}
                </button>
              )
            )}

            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}