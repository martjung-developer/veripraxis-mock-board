// app/(dashboard)/admin/programs/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Users, ClipboardList, Search, X,
  Eye, UserPlus, BookOpen, Filter, AlertTriangle,
  Pencil, Save, Loader2, CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/AuthContext'
import { Database } from '@/lib/types/database'
import styles from './programs.module.css'
import {
  containerVariants,
  cardVariants,
  buttonVariants,
} from '@/animations/admin/programs/programs'

// ── Types ──────────────────────────────────────────────────────────────────────
type ProgramRow = Database['public']['Tables']['programs']['Row']
type ExamRow    = Database['public']['Tables']['exams']['Row']

interface StudentRow {
  id:         string
  full_name:  string | null
  email:      string
  year_level: number | null
}

interface ProgramDisplay extends ProgramRow {
  studentCount: number
  examCount:    number
  students:     StudentRow[]
  exams:        Pick<ExamRow, 'id' | 'title' | 'is_published' | 'exam_type'>[]
}

const ACCENT_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#0891b2','#ec4899','#6366f1','#059669','#f97316']
const ICON_BG       = ['rgba(59,130,246,0.12)','rgba(16,185,129,0.12)','rgba(139,92,246,0.12)','rgba(245,158,11,0.12)','rgba(8,145,178,0.12)','rgba(236,72,153,0.12)','rgba(99,102,241,0.12)','rgba(5,150,105,0.12)','rgba(249,115,22,0.12)']

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeleton} style={{ height: 3 }} />
      <div style={{ padding: '1.1rem 1.25rem 0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div className={styles.skeleton} style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className={styles.skeleton} style={{ width: '30%', height: 10 }} />
          <div className={styles.skeleton} style={{ width: '70%', height: 14 }} />
          <div className={styles.skeleton} style={{ width: '55%', height: 11 }} />
        </div>
      </div>
      <div style={{ padding: '0 1.25rem 1rem' }}>
        <div className={styles.skeleton} style={{ height: 58, borderRadius: 7 }} />
      </div>
      <div style={{ padding: '0.85rem 1.25rem', borderTop: '1.5px solid #edf0f5', display: 'flex', gap: '0.45rem' }}>
        <div className={styles.skeleton} style={{ flex: 1, height: 32, borderRadius: 9 }} />
        <div className={styles.skeleton} style={{ flex: 1, height: 32, borderRadius: 9 }} />
        <div className={styles.skeleton} style={{ flex: 1, height: 32, borderRadius: 9 }} />
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ProgramsPage() {
  const router   = useRouter()
  const { user, loading: authLoading } = useUser()
  const supabase = useMemo(() => createClient(), [])

  const [programs,  setPrograms]  = useState<ProgramDisplay[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [filterDeg, setFilterDeg] = useState('all')
  const [viewProg,  setViewProg]  = useState<ProgramDisplay | null>(null)

  // Edit description state
  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [editDesc,       setEditDesc]       = useState('')
  const [savingDesc,     setSavingDesc]     = useState(false)
  const [saveDescError,  setSaveDescError]  = useState('')
  const [saveDescOk,     setSaveDescOk]     = useState(false)

  /* ── Role guard ── */
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    const role = (user.user_metadata?.role as string | undefined)
      ?? (user.app_metadata?.role as string | undefined)
    if (role !== 'admin' && role !== 'faculty') router.replace('/unauthorized')
  }, [user, authLoading, router])

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPrograms = useCallback(async () => {
    setLoading(true); setError(null)

    const { data: progRows, error: progErr } = await supabase
      .from('programs')
      .select('id, school_id, code, name, full_name, degree_type, major, years, description, created_at')
      .order('name')

    if (progErr) { setError('Could not load programs. Please try again.'); setLoading(false); return }

    const progs: ProgramRow[] = (progRows ?? []) as ProgramRow[]

    const [studentsRes, examsRes] = await Promise.all([
      supabase.from('students').select('id, program_id, year_level, profiles!inner(id, full_name, email)'),
      supabase.from('exams').select('id, title, is_published, exam_type, program_id'),
    ])

    const students = (studentsRes.data ?? []) as unknown as {
      id: string; program_id: string | null; year_level: number | null
      profiles: { id: string; full_name: string | null; email: string }
    }[]

    const exams = (examsRes.data ?? []) as (Pick<ExamRow, 'id' | 'title' | 'is_published' | 'exam_type'> & { program_id: string | null })[]

    const mapped: ProgramDisplay[] = progs.map((prog) => {
      const progStudents = students
        .filter((s) => s.program_id === prog.id)
        .map((s) => ({ id: s.profiles.id, full_name: s.profiles.full_name, email: s.profiles.email, year_level: s.year_level }))
      const progExams = exams
        .filter((e) => e.program_id === prog.id)
        .map((e) => ({ id: e.id, title: e.title, is_published: e.is_published, exam_type: e.exam_type }))
      return { ...prog, studentCount: progStudents.length, examCount: progExams.length, students: progStudents, exams: progExams }
    })

    setPrograms(mapped); setLoading(false)
  }, [supabase])

  useEffect(() => {
    const t = window.setTimeout(() => { void fetchPrograms() }, 0)
    return () => window.clearTimeout(t)
  }, [fetchPrograms])

  // ── Save description ─────────────────────────────────────────────────────
  async function handleSaveDescription(progId: string) {
    setSavingDesc(true); setSaveDescError(''); setSaveDescOk(false)
    const { error: updateErr } = await supabase
      .from('programs')
      .update({ description: editDesc.trim() || null })
      .eq('id', progId)
    setSavingDesc(false)
    if (updateErr) { setSaveDescError(updateErr.message); return }

    // Optimistically update local state
    setPrograms((prev) => prev.map((p) => p.id === progId ? { ...p, description: editDesc.trim() || null } : p))
    if (viewProg?.id === progId) setViewProg((prev) => prev ? { ...prev, description: editDesc.trim() || null } : prev)
    setSaveDescOk(true)
    setTimeout(() => { setEditingId(null); setSaveDescOk(false) }, 1200)
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const degreeTypes = useMemo(() => {
    const types = Array.from(new Set(programs.map((p) => p.degree_type))).sort()
    return ['all', ...types]
  }, [programs])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return programs.filter((p) => {
      if (filterDeg !== 'all' && p.degree_type !== filterDeg) return false
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q) && !p.full_name.toLowerCase().includes(q)) return false
      return true
    })
  }, [programs, search, filterDeg])

  const stats = useMemo(() => ({
    total:    programs.length,
    students: programs.reduce((s, p) => s + p.studentCount, 0),
    exams:    programs.reduce((s, p) => s + p.examCount, 0),
    active:   programs.filter((p) => p.studentCount > 0).length,
  }), [programs])

  if (authLoading) return null

  return (
    <motion.div className={styles.page} variants={containerVariants} initial="hidden" animate="visible">

      {/* ── Header ── */}
      <motion.div className={styles.header} variants={cardVariants}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><GraduationCap size={20} color="#fff" /></div>
          <div>
            <h1 className={styles.heading}>Programs</h1>
            <p className={styles.headingSub}>{programs.length} degree program{programs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={fetchPrograms}>Refresh</button>
        </div>
      </motion.div>

      {/* ── Stat Strip ── */}
      <motion.div className={styles.statStrip} variants={cardVariants}>
        {([
          { label: 'Programs',       value: stats.total,    icon: <GraduationCap size={16} color="#0d2540" />, bg: 'rgba(13,37,64,0.10)'  },
          { label: 'Total Students', value: stats.students, icon: <Users         size={16} color="#059669" />, bg: 'rgba(5,150,105,0.10)' },
          { label: 'Total Exams',    value: stats.exams,    icon: <ClipboardList size={16} color="#4f5ff7" />, bg: 'rgba(79,95,247,0.10)' },
          { label: 'With Students',  value: stats.active,   icon: <BookOpen      size={16} color="#0891b2" />, bg: 'rgba(8,145,178,0.10)' },
        ] as const).map((s) => (
          <div className={styles.statCard} key={s.label}>
            <div className={styles.statIconWrap} style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <motion.div className={styles.errorBanner} variants={cardVariants}>
          <AlertTriangle size={15} /> {error}
        </motion.div>
      )}

      {/* ── Filter Bar ── */}
      <motion.div className={styles.filterBar} variants={cardVariants}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search programs…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Clear"><X size={13} /></button>}
        </div>
        <div className={styles.filterGroup}>
          <Filter size={13} className={styles.filterIcon} />
          <select className={styles.filterSelect} value={filterDeg} onChange={(e) => setFilterDeg(e.target.value)}>
            {degreeTypes.map((d) => <option key={d} value={d}>{d === 'all' ? 'All Degrees' : d}</option>)}
          </select>
        </div>
        <p className={styles.resultCount}><strong>{filtered.length}</strong> program{filtered.length !== 1 ? 's' : ''} shown</p>
      </motion.div>

      {/* ── Cards Grid ── */}
      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
            ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><GraduationCap size={22} color="#8a9ab5" /></div>
                <p className={styles.emptyTitle}>No programs found</p>
                <p className={styles.emptySub}>Try adjusting your search or filter.</p>
              </div>
            )
            : filtered.map((prog, idx) => {
              const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length]
              const iconBg      = ICON_BG[idx % ICON_BG.length]
              const isActive    = prog.studentCount > 0
              const isEditing   = editingId === prog.id

              return (
                <motion.div key={prog.id} className={styles.card} variants={cardVariants} whileHover="hover" layout>
                  <div className={styles.cardAccent} style={{ background: accentColor }} />

                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrap} style={{ background: iconBg }}>
                      <GraduationCap size={20} color={accentColor} strokeWidth={1.75} />
                    </div>
                    <div className={styles.cardBadges}>
                      <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                        {isActive && <span className={styles.activeDot} />}
                        {isActive ? 'Active' : 'No students'}
                      </span>
                      <span className={styles.degreeBadge}>{prog.degree_type}</span>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <p className={styles.programCode}>{prog.code}</p>
                    <h3 className={styles.programName}>{prog.name}</h3>
                    <p className={styles.programFullName}>
                      {prog.major ? `${prog.full_name} — Major in ${prog.major}` : prog.full_name}
                    </p>

                    {/* Description inline editor */}
                    {isEditing ? (
                      <div style={{ marginTop: '0.6rem' }}>
                        <textarea
                          style={{ width: '100%', fontSize: '0.78rem', borderRadius: 7, border: '1.5px solid #cbd5e1', padding: '0.45rem 0.6rem', resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Enter program description…"
                        />
                        {saveDescError && <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 3 }}>{saveDescError}</p>}
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                          <button
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.74rem', padding: '0.3rem 0.6rem', background: '#0d2540', color: '#fff', border: 'none', borderRadius: 7, cursor: savingDesc ? 'not-allowed' : 'pointer', opacity: savingDesc ? 0.7 : 1 }}
                            onClick={() => handleSaveDescription(prog.id)}
                            disabled={savingDesc}
                          >
                            {savingDesc ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : saveDescOk ? <CheckCircle2 size={12} color="#059669" /> : <Save size={12} />}
                            {savingDesc ? 'Saving…' : saveDescOk ? 'Saved!' : 'Save'}
                          </button>
                          <button
                            style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer' }}
                            onClick={() => { setEditingId(null); setSaveDescError('') }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', marginTop: '0.45rem' }}>
                        <p style={{ flex: 1, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                          {prog.description || <em style={{ color: '#94a3b8' }}>No description</em>}
                        </p>
                        <button
                          title="Edit description"
                          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.1rem', marginTop: '0.1rem' }}
                          onClick={() => { setEditingId(prog.id); setEditDesc(prog.description ?? ''); setSaveDescError('') }}
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}

                    <div className={styles.cardStats}>
                      <div className={styles.cardStat}><span className={styles.cardStatValue}>{prog.studentCount}</span><span className={styles.cardStatLabel}>Students</span></div>
                      <div className={styles.cardStatDivider} />
                      <div className={styles.cardStat}><span className={styles.cardStatValue}>{prog.examCount}</span><span className={styles.cardStatLabel}>Exams</span></div>
                      <div className={styles.cardStatDivider} />
                      <div className={styles.cardStat}><span className={styles.cardStatValue}>{prog.years ?? 4}</span><span className={styles.cardStatLabel}>Years</span></div>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <motion.button className={`${styles.btnAction} ${styles.btnActionPrimary}`} variants={buttonVariants} initial="idle" whileTap="tap" onClick={() => setViewProg(prog)}>
                      <Eye size={13} /> View
                    </motion.button>
                    <motion.button className={styles.btnAction} variants={buttonVariants} initial="idle" whileTap="tap" onClick={() => setViewProg(prog)}>
                      <UserPlus size={13} /> Students
                    </motion.button>
                    <motion.button className={styles.btnAction} variants={buttonVariants} initial="idle" whileTap="tap" onClick={() => setViewProg(prog)}>
                      <ClipboardList size={13} /> Exams
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
      </div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {viewProg && (() => {
          const idx         = programs.findIndex((p) => p.id === viewProg.id)
          const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length]

          return (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => { if (e.target === e.currentTarget) setViewProg(null) }}
            >
              <motion.div
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.97, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -8 }}
                transition={{ duration: 0.22, ease: [0.34, 1.2, 0.64, 1] }}
              >
                <div style={{ height: 4, background: accentColor, borderRadius: '16px 16px 0 0', flexShrink: 0 }} />

                <div className={styles.modalHeader}>
                  <div className={styles.modalHeaderLeft}>
                    <p className={styles.modalCode}>{viewProg.code}</p>
                    <h2 className={styles.modalTitle}>{viewProg.name}</h2>
                    <div className={styles.modalMeta}>
                      <span className={styles.degreeBadge}>{viewProg.degree_type}</span>
                      {viewProg.major && <span className={styles.degreeBadge}>Major: {viewProg.major}</span>}
                      <span className={`${styles.statusBadge} ${viewProg.studentCount > 0 ? styles.statusActive : styles.statusInactive}`}>
                        {viewProg.studentCount > 0 ? 'Active' : 'No students'}
                      </span>
                    </div>
                  </div>
                  <button className={styles.btnIconClose} onClick={() => setViewProg(null)}><X size={14} /></button>
                </div>

                <div className={styles.modalBody}>
                  {viewProg.full_name && (
                    <div className={styles.modalSection}>
                      <div className={styles.modalSectionTitle}>Full Program Name</div>
                      <p style={{ fontSize: '0.83rem', color: '#4a5568', margin: 0, lineHeight: 1.6 }}>
                        {viewProg.major ? `${viewProg.full_name} — Major in ${viewProg.major}` : viewProg.full_name}
                      </p>
                    </div>
                  )}

                  {/* Description edit inside modal */}
                  <div className={styles.modalSection}>
                    <div className={styles.modalSectionTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Description
                      {editingId !== `modal-${viewProg.id}` && (
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                          onClick={() => { setEditingId(`modal-${viewProg.id}`); setEditDesc(viewProg.description ?? ''); setSaveDescError('') }}
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                    {editingId === `modal-${viewProg.id}` ? (
                      <div>
                        <textarea
                          style={{ width: '100%', fontSize: '0.8rem', borderRadius: 7, border: '1.5px solid #cbd5e1', padding: '0.5rem 0.6rem', resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Enter program description…"
                        />
                        {saveDescError && <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 3 }}>{saveDescError}</p>}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', padding: '0.35rem 0.8rem', background: '#0d2540', color: '#fff', border: 'none', borderRadius: 7, cursor: savingDesc ? 'not-allowed' : 'pointer', opacity: savingDesc ? 0.7 : 1 }}
                            onClick={() => handleSaveDescription(viewProg.id)}
                            disabled={savingDesc}
                          >
                            {savingDesc ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                            {savingDesc ? 'Saving…' : 'Save'}
                          </button>
                          <button style={{ fontSize: '0.76rem', padding: '0.35rem 0.8rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer' }} onClick={() => { setEditingId(null); setSaveDescError('') }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.83rem', color: '#4a5568', margin: 0, lineHeight: 1.6 }}>
                        {viewProg.description || <em style={{ color: '#94a3b8' }}>No description added.</em>}
                      </p>
                    )}
                  </div>

                  <div className={styles.modalSection}>
                    <div className={styles.modalSectionTitle}>Overview</div>
                    <div className={styles.modalStatGrid}>
                      <div className={styles.modalStatBox}><div className={styles.modalStatValue}>{viewProg.studentCount}</div><div className={styles.modalStatLabel}>Students</div></div>
                      <div className={styles.modalStatBox}><div className={styles.modalStatValue}>{viewProg.examCount}</div><div className={styles.modalStatLabel}>Exams</div></div>
                      <div className={styles.modalStatBox}><div className={styles.modalStatValue}>{viewProg.years ?? 4}</div><div className={styles.modalStatLabel}>Years</div></div>
                    </div>
                  </div>

                  <div className={styles.modalSection}>
                    <div className={styles.modalSectionTitle}>Enrolled Students ({viewProg.studentCount})</div>
                    {viewProg.students.length === 0 ? (
                      <p className={styles.noStudents}>No students enrolled in this program yet.</p>
                    ) : (
                      <div className={styles.studentList}>
                        {viewProg.students.map((s) => (
                          <div key={s.id} className={styles.studentRow}>
                            <div className={styles.studentAvatar}>{getInitials(s.full_name, s.email)}</div>
                            <span className={styles.studentName}>{s.full_name ?? s.email}</span>
                            {s.year_level && <span className={styles.studentMeta}>Yr {s.year_level}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.modalSection}>
                    <div className={styles.modalSectionTitle}>Assigned Exams ({viewProg.examCount})</div>
                    {viewProg.exams.length === 0 ? (
                      <p className={styles.noExams}>No exams assigned to this program yet.</p>
                    ) : (
                      <div className={styles.examList}>
                        {viewProg.exams.map((ex) => (
                          <div key={ex.id} className={styles.examRow}>
                            <div className={styles.publishedDot} style={{ background: ex.is_published ? '#059669' : '#8a9ab5' }} />
                            <span className={styles.examRowTitle}>{ex.title}</span>
                            <span className={ex.exam_type === 'mock' ? styles.typeMock : styles.typePractice}>
                              {ex.exam_type === 'mock' ? 'Mock' : 'Practice'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button className={styles.btnSecondary} onClick={() => setViewProg(null)}>Close</button>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </motion.div>
  )
}