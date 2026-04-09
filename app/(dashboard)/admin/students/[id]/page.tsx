// app/(dashboard)/admin/students/[id]/page.tsx
'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Bell, BookOpen,
  FileText, Clock, CheckCircle2,
  ClipboardList, Send, AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser }      from '@/lib/context/AuthContext'
import styles           from './student-detail.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface StudentProfile {
  id:           string
  full_name:    string | null
  email:        string
  avatar_url:   string | null
  student_id:   string | null
  year_level:   number | null
  program_id:   string | null
  program_code: string | null
  program_name: string | null
  school:       string | null
  target_exam:  string | null
  created_at:   string
}

interface AssignedExam {
  id:          string
  exam_id:     string
  exam_title:  string
  exam_type:   string
  is_active:   boolean
  assigned_at: string
  deadline:    string | null
}

interface Submission {
  id:           string
  exam_title:   string
  exam_type:    string
  status:       string
  percentage:   number | null
  passed:       boolean | null
  submitted_at: string | null
}

interface Notification {
  id:         string
  title:      string | null
  message:    string | null
  type:       string | null
  is_read:    boolean
  created_at: string
}

type ActiveTab = 'exams' | 'submissions' | 'notifications'

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function yearLabel(n: number | null): string {
  if (!n) return '—'
  const suffix = ['st', 'nd', 'rd'][n - 1] ?? 'th'
  return `${n}${suffix} Year`
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>   // ← unwrap with React.use()
}) {
  const { id: studentId } = use(params)

  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useUser()

  const [profile,       setProfile]       = useState<StudentProfile | null>(null)
  const [assignedExams, setAssignedExams] = useState<AssignedExam[]>([])
  const [submissions,   setSubmissions]   = useState<Submission[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [activeTab,     setActiveTab]     = useState<ActiveTab>('exams')

  // Notify modal
  const [notifyOpen,    setNotifyOpen]    = useState(false)
  const [notifyTitle,   setNotifyTitle]   = useState('')
  const [notifyMsg,     setNotifyMsg]     = useState('')
  const [notifyType,    setNotifyType]    = useState('info')
  const [notifySending, setNotifySending] = useState(false)

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login')
  }, [authLoading, user, router])

  // ── Fetch all student data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      // ── 1. Profile + student + program (single join) ──────────────────
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select(`
          id, full_name, email, avatar_url, created_at,
          students!inner (
            student_id, year_level, program_id, school, target_exam,
            programs ( id, code, name )
          )
        `)
        .eq('id', studentId)
        .eq('role', 'student')
        .single()

      if (profileErr || !profileData) {
        if (!cancelled) { setError('Student not found.'); setLoading(false) }
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pd = profileData as any
      const st = pd.students
      const pg = st?.programs

      if (!cancelled) {
        setProfile({
          id:           pd.id,
          full_name:    pd.full_name   ?? null,
          email:        pd.email,
          avatar_url:   pd.avatar_url  ?? null,
          student_id:   st?.student_id ?? null,
          year_level:   st?.year_level ?? null,
          program_id:   st?.program_id ?? null,
          program_code: pg?.code       ?? null,
          program_name: pg?.name       ?? null,
          school:       st?.school     ?? null,
          target_exam:  st?.target_exam ?? null,
          created_at:   pd.created_at,
        })
      }

      // ── 2. Assigned exams ─────────────────────────────────────────────
      const { data: examAssign } = await supabase
        .from('exam_assignments')
        .select(`
          id, exam_id, is_active, assigned_at, deadline,
          exams ( title, exam_type )
        `)
        .eq('student_id', studentId)
        .order('assigned_at', { ascending: false })

      if (!cancelled && examAssign) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAssignedExams(examAssign.map((r: any) => ({
          id:          r.id,
          exam_id:     r.exam_id,
          exam_title:  r.exams?.title     ?? 'Untitled',
          exam_type:   r.exams?.exam_type ?? 'mock',
          is_active:   r.is_active,
          assigned_at: r.assigned_at,
          deadline:    r.deadline,
        })))
      }

      // ── 3. Submissions ────────────────────────────────────────────────
      const { data: subs } = await supabase
        .from('submissions')
        .select(`
          id, status, percentage, passed, submitted_at,
          exams ( title, exam_type )
        `)
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(20)

      if (!cancelled && subs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSubmissions(subs.map((r: any) => ({
          id:           r.id,
          exam_title:   r.exams?.title     ?? 'Untitled',
          exam_type:    r.exams?.exam_type  ?? 'mock',
          status:       r.status,
          percentage:   r.percentage,
          passed:       r.passed,
          submitted_at: r.submitted_at,
        })))
      }

      // ── 4. Notifications ──────────────────────────────────────────────
      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!cancelled && notifs) setNotifications(notifs as Notification[])
      if (!cancelled) setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [studentId, supabase])

  // ── Send notification ───────────────────────────────────────────────────────
  async function handleSendNotification() {
    if (!notifyTitle.trim() || !notifyMsg.trim()) return
    setNotifySending(true)

    await supabase.from('notifications').insert({
      user_id: studentId,
      title:   notifyTitle.trim(),
      message: notifyMsg.trim(),
      type:    notifyType,
      is_read: false,
    })

    setNotifySending(false)
    setNotifyOpen(false)
    setNotifyTitle('')
    setNotifyMsg('')

    // Refresh notifications list
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data as Notification[])
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const releasedSubs = submissions.filter(s => s.status === 'released')
  const scores       = releasedSubs.map(s => s.percentage).filter((v): v is number => v !== null)
  const avgScore     = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null
  const passedCount  = releasedSubs.filter(s => s.passed === true).length

  const STATS = [
    { iconBg: '#eff6ff', iconColor: '#2563eb', Icon: FileText,      label: 'Exams Assigned', value: assignedExams.length },
    { iconBg: '#f0fdf4', iconColor: '#059669', Icon: CheckCircle2,  label: 'Submissions',    value: submissions.length  },
    { iconBg: '#fffbeb', iconColor: '#d97706', Icon: ClipboardList, label: 'Avg Score',      value: avgScore !== null ? `${avgScore}%` : '—' },
    { iconBg: '#f0fdf4', iconColor: '#059669', Icon: BookOpen,      label: 'Passed',         value: passedCount },
    { iconBg: '#f5f3ff', iconColor: '#7c3aed', Icon: Clock,         label: 'Notifications',  value: notifications.length },
  ]

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingSpinner} />
        <p>Loading student…</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.errorWrap}>
        <AlertCircle size={28} color="#dc2626" />
        <p style={{ color: '#991b1b' }}>{error ?? 'Student not found.'}</p>
        <button className={styles.btnBack} onClick={() => router.push('/admin/students')}>
          Back to Students
        </button>
      </div>
    )
  }

  const initials = getInitials(profile.full_name, profile.email)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Back link ── */}
      <Link href="/admin/students" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to Students
      </Link>

      {/* ── Profile card ── */}
      <div className={styles.profileCard}>
        <div className={styles.profileLeft}>
          <div className={styles.profileAvatar}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name ?? ''} className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarInitials}>{initials}</span>
            )}
          </div>
          <div>
            <h1 className={styles.profileName}>{profile.full_name ?? '—'}</h1>
            <div className={styles.profileMeta}>
              <span>{profile.email}</span>
              {profile.student_id  && <span>· ID: {profile.student_id}</span>}
              {profile.program_code && <span className={styles.programChip}>{profile.program_code}</span>}
              {profile.year_level  && <span className={styles.yearChip}>{yearLabel(profile.year_level)}</span>}
              {profile.school      && <span>· {profile.school}</span>}
              <span style={{ color: '#9ca3af' }}>· Joined {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>
        <div className={styles.profileActions}>
          <button className={styles.btnOutline} onClick={() => setNotifyOpen(true)}>
            <Bell size={14} /> Notify
          </button>
          <Link href={`/admin/students/${studentId}/edit`} className={styles.btnOutline}>
            <Pencil size={14} /> Edit
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={styles.statsGrid}>
        {STATS.map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: s.iconBg }}>
              <s.Icon size={18} color={s.iconColor} strokeWidth={2} />
            </div>
            <div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabBar}>
        {([
          { key: 'exams',         label: 'Assigned Exams', count: assignedExams.length  },
          { key: 'submissions',   label: 'Submissions',    count: submissions.length    },
          { key: 'notifications', label: 'Notifications',  count: notifications.length  },
        ] as { key: ActiveTab; label: string; count: number }[]).map(t => (
          <button
            key={t.key}
            className={`${styles.tabItem} ${activeTab === t.key ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            <span className={styles.tabCount}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Assigned Exams ── */}
      {activeTab === 'exams' && (
        <div className={styles.tabContent}>
          <div className={styles.tableCard}>
            {assignedExams.length === 0 ? (
              <div className={styles.emptyTab}>
                <BookOpen size={32} strokeWidth={1.3} color="#cbd5e1" />
                <p className={styles.emptyTabTitle}>No exams assigned</p>
                <p className={styles.emptyTabText}>This student has no exam assignments yet.</p>
              </div>
            ) : (
              <>
                <div className={styles.tableCardHeader}>
                  <h3 className={styles.tableCardTitle}>Assigned Exams</h3>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Type</th>
                      <th>Assigned</th>
                      <th>Deadline</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedExams.map(e => (
                      <tr key={e.id}>
                        <td className={styles.cellBold}>{e.exam_title}</td>
                        <td>
                          <span className={`${styles.typeBadge} ${e.exam_type === 'mock' ? styles.typeMock : styles.typePractice}`}>
                            {e.exam_type}
                          </span>
                        </td>
                        <td>{formatDate(e.assigned_at)}</td>
                        <td>
                          {e.deadline
                            ? formatDate(e.deadline)
                            : <span className={styles.cellMuted}>No deadline</span>}
                        </td>
                        <td>
                          <span className={`${styles.statusDot} ${e.is_active ? styles.statusActive : styles.statusInactive}`}>
                            {e.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Submissions ── */}
      {activeTab === 'submissions' && (
        <div className={styles.tabContent}>
          <div className={styles.tableCard}>
            {submissions.length === 0 ? (
              <div className={styles.emptyTab}>
                <FileText size={32} strokeWidth={1.3} color="#cbd5e1" />
                <p className={styles.emptyTabTitle}>No submissions yet</p>
                <p className={styles.emptyTabText}>This student hasn&apos;t submitted any exams.</p>
              </div>
            ) : (
              <>
                <div className={styles.tableCardHeader}>
                  <h3 className={styles.tableCardTitle}>Exam Submissions</h3>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Type</th>
                      <th>Score</th>
                      <th>Result</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => (
                      <tr key={s.id}>
                        <td className={styles.cellBold}>{s.exam_title}</td>
                        <td>
                          <span className={`${styles.typeBadge} ${s.exam_type === 'mock' ? styles.typeMock : styles.typePractice}`}>
                            {s.exam_type}
                          </span>
                        </td>
                        <td>
                          {s.status === 'released' && s.percentage !== null
                            ? <strong style={{ color: s.percentage >= 75 ? '#059669' : '#dc2626' }}>
                                {Math.round(s.percentage)}%
                              </strong>
                            : <span className={styles.cellMuted}>—</span>}
                        </td>
                        <td>
                          {s.status === 'released'
                            ? s.passed === true
                              ? <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.78rem' }}>✓ Passed</span>
                              : s.passed === false
                                ? <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.78rem' }}>✗ Failed</span>
                                : <span className={styles.cellMuted}>—</span>
                            : <span className={styles.cellMuted}>Pending</span>}
                        </td>
                        <td>
                          <span className={styles.statusBadge} style={{
                            background:
                              s.status === 'released'  ? '#f0fdf4' :
                              s.status === 'graded'    ? '#f5f3ff' :
                              s.status === 'submitted' ? '#fffbeb' : '#f0f9ff',
                            color:
                              s.status === 'released'  ? '#059669' :
                              s.status === 'graded'    ? '#7c3aed' :
                              s.status === 'submitted' ? '#d97706' : '#0369a1',
                          }}>
                            {s.status}
                          </span>
                        </td>
                        <td>{formatDate(s.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Notifications ── */}
      {activeTab === 'notifications' && (
        <div className={styles.tabContent}>
          <div className={styles.tableCard}>
            <div className={styles.tableCardHeader}>
              <h3 className={styles.tableCardTitle}>Notifications Sent</h3>
              <button className={styles.btnSmall} onClick={() => setNotifyOpen(true)}>
                <Send size={13} /> Send Notification
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className={styles.emptyTab}>
                <Bell size={32} strokeWidth={1.3} color="#cbd5e1" />
                <p className={styles.emptyTabTitle}>No notifications</p>
                <p className={styles.emptyTabText}>No notifications have been sent to this student.</p>
                <button className={styles.emptyTabBtn} onClick={() => setNotifyOpen(true)}>
                  <Send size={13} /> Send First Notification
                </button>
              </div>
            ) : (
              <div className={styles.notifList}>
                {notifications.map(n => (
                  <div key={n.id} className={`${styles.notifRow} ${!n.is_read ? styles.notifUnread : ''}`}>
                    <div className={styles.notifDot} style={{ background: n.is_read ? '#cbd5e1' : '#3b82f6' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className={styles.notifTitle}>{n.title ?? 'Notification'}</p>
                      <p className={styles.notifMsg}>{n.message}</p>
                    </div>
                    <div className={styles.notifMeta}>
                      {n.type && <span className={styles.notifType}>{n.type}</span>}
                      <span className={styles.notifTime}>{formatDate(n.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Send Notification Modal ── */}
      {notifyOpen && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setNotifyOpen(false) }}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Send Notification</h2>
            <p className={styles.modalSub}>
              This will appear in {profile.full_name ?? 'the student'}&apos;s notification inbox.
            </p>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Title <span className={styles.req}>*</span></label>
              <input className={styles.formInput} placeholder="Notification title"
                value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Message <span className={styles.req}>*</span></label>
              <textarea className={styles.formTextarea} rows={3} placeholder="Write your message…"
                value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Type</label>
              <select className={styles.formSelect} value={notifyType} onChange={e => setNotifyType(e.target.value)}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnModalCancel} onClick={() => setNotifyOpen(false)}>Cancel</button>
              <button
                className={styles.btnModalPrimary}
                onClick={handleSendNotification}
                disabled={notifySending || !notifyTitle.trim() || !notifyMsg.trim()}
              >
                <Send size={13} />
                {notifySending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}