'use client'
// components/dashboard/student/StudentTopbar.tsx

import Link             from 'next/link'
import { Bell, Search } from 'lucide-react'
import type { Profile } from '@/lib/types/auth'
import styles           from './StudentTopbar.module.css'

export default function StudentTopbar({ profile }: { profile: Profile }) {
  return (
    <header className={styles.topbar}>

      {/* Search */}
      <div className={styles.searchWrap}>
        <Search size={14} strokeWidth={2} color="#94a3b8" />
        <input
          type="text"
          placeholder="Search exams, materials, reviewers..."
          className={styles.searchInput}
        />
      </div>

      {/* Right */}
      <div className={styles.right}>

        {/* Notification bell */}
        <Link href="/student/notifications" className={styles.notifBtn}>
          <Bell size={16} strokeWidth={2} />
          <span className={styles.notifBadge} />
        </Link>

        <div className={styles.divider} />

        {/* User pill */}
        <Link href="/student/profile" className={styles.userPill}>
          <div className={styles.avatarSmall}>
            {profile.full_name?.charAt(0).toUpperCase() ?? 'S'}
          </div>
          <div>
            <div className={styles.userName}>
              {profile.full_name?.split(' ')[0] ?? 'Student'}
            </div>
            <div className={styles.userRole}>Student</div>
          </div>
        </Link>

      </div>
    </header>
  )
}