// app/(dashboard)/student/profile/page.tsx
'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { motion }      from 'framer-motion'
import { Pencil }      from 'lucide-react'
import { useProfile }  from '@/lib/hooks/student/profile/useProfile'
import { getInitials } from '@/lib/utils/student/profile/profile'
import { pageVariants, staggerContainer, fadeUp } from '@/animations/profile/profile'
import { ProfileHero }          from '@/components/dashboard/student/profile/ProfileHero'
import { ProfileInfo }          from '@/components/dashboard/student/profile/ProfileInfo'
import { ProfileStats }         from '@/components/dashboard/student/profile/ProfileStats'
import { ProfileRecentResults } from '@/components/dashboard/student/profile/ProfileRecentResults'
import { useUser }    from '@/lib/context/AuthContext'
import styles from './profile.module.css'

// ── Skeleton (kept here — it's a loading UI concern of this page) ─────────────
function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={`${styles.heroCard} ${styles.skeletonHero}`}>
        <div className={`${styles.skeleton} ${styles.skeletonCircle}`} />
        <div className={styles.skeletonLines}>
          <div className={styles.skeleton} style={{ height: 20, width: '52%' }} />
          <div className={styles.skeleton} style={{ height: 13, width: '36%', marginTop: 2 }} />
          <div className={styles.skeleton} style={{ height: 22, width: '65%', marginTop: 6 }} />
        </div>
      </div>
      <div className={styles.mainGrid} style={{ marginTop: '1rem' }}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.card} style={{ minHeight: 260 }}>
            {[68, 52, 78, 58, 45, 70].map((w, j) => (
              <div
                key={j}
                className={styles.skeleton}
                style={{ height: 12, width: `${w}%`, marginBottom: '0.6rem', borderRadius: 5 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()

  const {
    profile, student, program, school,
    submissions, totalTaken,
    liveAvatarUrl, setLiveAvatarUrl,
    loading, error,
    authLoading, authError,
  } = useProfile()

  // animate state stays here: it's a UI-timing concern, not data
  const [animate, setAnimate] = useState(false)

  // Trigger progress bar animation after data loads
  if (!animate && !loading && !authLoading && submissions.length > 0) {
    setTimeout(() => setAnimate(true), 420)
  }

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (authLoading || loading) { return <ProfileSkeleton /> }

  if (authError || error) {
    return (
      <div className={styles.page}>
        <div className={styles.heroCard} style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontWeight: 600 }}>{authError ?? error}</p>
          <button
            className={styles.editBtn}
            style={{ marginTop: '1rem' }}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const displayName    = profile?.full_name  ?? 'Student'
  const initials       = getInitials(profile?.full_name ?? null)
  const schoolDisplay  = school?.name        ?? student?.school ?? '—'
  const programDisplay = program?.full_name  ?? program?.name   ?? '—'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <motion.div className={styles.page} variants={pageVariants} initial="hidden" animate="visible">

      {/* Header */}
      <motion.div className={styles.header} variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className={styles.title}>My Profile</h1>
          <p className={styles.subtitle}>Your personal information and exam performance summary.</p>
        </div>
        <button className={styles.editBtn} onClick={() => router.push('/student/profile/edit')}>
          <Pencil size={14} /> Edit Profile
        </button>
      </motion.div>

      {/* Hero */}
      {user && (
        <ProfileHero
          profile={profile}
          student={student}
          program={program}
          displayName={displayName}
          initials={initials}
          liveAvatarUrl={liveAvatarUrl}
          userId={user.id}
          onAvatarChange={setLiveAvatarUrl}
        />
      )}

      {/* Info + Stats grid */}
      <motion.div
        className={styles.mainGrid}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <ProfileInfo
          profile={profile}
          student={student}
          program={program}
          school={school}
          schoolDisplay={schoolDisplay}
          programDisplay={programDisplay}
        />

        <ProfileStats
          submissions={submissions}
          totalTaken={totalTaken}
          animate={animate}
        />
      </motion.div>

      {/* Recent results */}
      <ProfileRecentResults submissions={submissions} />

    </motion.div>
  )
}