'use client'
// components/dashboard/student/StudentSidebar.tsx

import Link            from 'next/link'
import Image           from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart2,
  FileText,
  Bell,
  User,
  HelpCircle,
  GraduationCap,
  LogOut,
} from 'lucide-react'
import { signOut }      from '@/lib/auth/actions'
import type { Profile } from '@/lib/types/auth'
import styles           from './StudentSidebar.module.css'

const NAV = [
  { href: '/student/dashboard',       icon: LayoutDashboard, label: 'Overview'        },
  { href: '/student/mock-exams',      icon: ClipboardList,   label: 'Mock Exams'      },
  { href: '/student/reviewers',       icon: BookOpen,        label: 'Reviewers'       },
  { href: '/student/study-materials', icon: FileText,        label: 'Study Materials' },
  { href: '/student/progress',        icon: BarChart2,       label: 'My Progress'     },
  { href: '/student/results',         icon: GraduationCap,   label: 'Results'         },
  { href: '/student/notifications',   icon: Bell,            label: 'Notifications'   },
  { href: '/student/profile',         icon: User,            label: 'Profile'         },
  { href: '/student/help',            icon: HelpCircle,      label: 'Help'            },
]

export default function StudentSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>

      {/* Logo */}
      <div className={styles.logoWrap}>
        <Image
          src="/images/veripraxis-logo.png"
          alt="VeriPraxis"
          width={0}
          height={30}
          style={{ width: 'auto', height: 30, filter: 'brightness(0) invert(1)' }}
          priority
        />
      </div>

      {/* Nav label */}
      <div className={styles.sectionLabel}>Student Tools</div>

      {/* Nav links */}
      <nav className={styles.nav}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
            >
              <Icon
                size={16}
                strokeWidth={active ? 2.5 : 2}
                className={styles.navIcon}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Help card */}
      <div className={styles.helpCard}>
        <p className={styles.helpCardTitle}>Need assistance?</p>
        <p className={styles.helpCardText}>
          Having trouble? Visit our help center or contact your faculty.
        </p>
        <Link href="/student/help" className={styles.helpCardBtn}>
          Contact Support
        </Link>
      </div>

      {/* User + sign out */}
      <div className={styles.userWrap}>
        <div className={styles.avatar}>
          {profile.full_name?.charAt(0).toUpperCase() ?? 'S'}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className={styles.userName}>
            {profile.full_name ?? 'Student'}
          </div>
          <div className={styles.userRole}>Student</div>
        </div>
        <button
          className={styles.signOutBtn}
          onClick={() => signOut()}
          title="Sign out"
        >
          <LogOut size={15} strokeWidth={2} />
        </button>
      </div>

    </aside>
  )
}