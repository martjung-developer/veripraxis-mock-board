// components/dashboard/admin/AdminSidebar.tsx
'use client'

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import Image                   from 'next/image'
import { usePathname }         from 'next/navigation'
import {
  LayoutDashboard, Users, GraduationCap,
  FileText, ClipboardList, FolderOpen,
  Bell, BarChart2, Settings, LogOut, Menu, X,
} from 'lucide-react'
import { createClient }   from '@/lib/supabase/client'
import { signOut }        from '@/lib/auth/actions'
import { useUnreadCount } from '@/lib/hooks/notifications/useUnreadCount'
import styles             from './AdminSidebar.module.css'

// ── Nav structure ──────────────────────────────────────────────────────────────
// `badge: true` marks items whose count is injected at render time.
// No hardcoded numbers here — the live value comes from useUnreadCount.

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/admin/dashboard',      icon: LayoutDashboard, label: 'Dashboard',      iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,0.15)',  badge: false },
      { href: '/admin/notifications',  icon: Bell,            label: 'Notifications',  iconColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.15)',  badge: true  },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/admin/students',       icon: Users,         label: 'Students',       iconColor: '#10b981', iconBg: 'rgba(16,185,129,0.15)',  badge: false },
      { href: '/admin/exams',          icon: ClipboardList, label: 'Exams',          iconColor: '#6366f1', iconBg: 'rgba(99,102,241,0.15)',  badge: false },
      { href: '/admin/questionnaires', icon: FileText,      label: 'Questionnaires', iconColor: '#f97316', iconBg: 'rgba(249,115,22,0.15)',  badge: false },
    ],
  },
  {
    label: 'Academic',
    items: [
      { href: '/admin/programs',        icon: GraduationCap, label: 'Programs',        iconColor: '#ec4899', iconBg: 'rgba(236,72,153,0.15)', badge: false },
      { href: '/admin/study-materials', icon: FolderOpen,    label: 'Study Materials', iconColor: '#14b8a6', iconBg: 'rgba(20,184,166,0.15)', badge: false },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/admin/analytics', icon: BarChart2, label: 'Analytics', iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.15)', badge: false },
    ],
  },
] as const

const BOTTOM_ITEMS = [
  { href: '/admin/settings', icon: Settings, label: 'Settings', iconColor: '#64748b', iconBg: 'rgba(100,116,139,0.15)' },
] as const

function getInitials(name: string | null): string {
  if (!name) {return 'FA'}
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

interface AdminSidebarProps {
  collapsed:  boolean
  onCollapse: (v: boolean) => void
}

export default function AdminSidebar({ collapsed, onCollapse }: AdminSidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const [adminName,  setAdminName]  = useState<string | null>(null)
  const [userId,     setUserId]     = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  // ── Resolve current user ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {return}

      setUserId(data.user.id)

      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            setAdminName(
              (profile as { full_name: string | null }).full_name ?? 'Admin',
            )
          }
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Live unread count ─────────────────────────────────────────────────────
  // Shared between the topbar bell (AdminTopbar also calls this hook with the
  // same userId — Supabase deduplicates the channel) and this sidebar badge.
  const unreadCount = useUnreadCount(userId)

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
  }

  const initials = getInitials(adminName)

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
    >

      {/* ── Logo / hamburger ── */}
      <div className={styles.logoArea}>
        <button
          className={styles.menuToggle}
          onClick={() => onCollapse(!collapsed)}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          type="button"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>

        {!collapsed && (
          <div className={styles.logoImgWrap}>
            <Image
              src="/images/veripraxis-logo.png"
              alt="VeriPraxis"
              width={28}
              height={28}
              className={styles.logoImg}
              priority
            />
          </div>
        )}
      </div>

      {/* ── Scrollable nav ── */}
      <nav className={styles.nav}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Section label — hidden when collapsed */}
            {!collapsed && (
              <div className={styles.sectionLabel}>{section.label}</div>
            )}

            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin/dashboard' &&
                  pathname.startsWith(item.href))

              // Live badge value: only items marked `badge: true` get one.
              const badgeValue =
                item.badge && unreadCount > 0 ? unreadCount : 0

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  title={collapsed ? item.label : undefined}
                  aria-label={
                    badgeValue > 0
                      ? `${item.label} — ${badgeValue} unread`
                      : item.label
                  }
                >
                  <div
                    className={styles.navIcon}
                    style={{ background: item.iconBg }}
                    aria-hidden="true"
                  >
                    <item.icon size={16} color={item.iconColor} strokeWidth={2} />
                  </div>

                  {!collapsed && (
                    <span className={styles.navLabel}>{item.label}</span>
                  )}

                  {/* Badge — visible both collapsed and expanded */}
                  {badgeValue > 0 && (
                    <span className={styles.navBadge} aria-hidden="true">
                      {badgeValue > 99 ? '99+' : badgeValue}
                    </span>
                  )}
                </Link>
              )
            })}

            <div className={styles.divider} />
          </div>
        ))}

        {/* Settings */}
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={styles.navIcon}
                style={{ background: item.iconBg }}
                aria-hidden="true"
              >
                <item.icon size={16} color={item.iconColor} strokeWidth={2} />
              </div>
              {!collapsed && (
                <span className={styles.navLabel}>{item.label}</span>
              )}
            </Link>
          )
        })}

        <div style={{ height: '0.5rem', flexShrink: 0 }} />
      </nav>

      {/* ── Logout ── */}
      <button
        className={`${styles.logoutBtn} ${loggingOut ? styles.logoutBtnLoading : ''}`}
        onClick={handleLogout}
        disabled={loggingOut}
        title={collapsed ? `Log out (${initials})` : undefined}
        type="button"
      >
        <LogOut size={15} className={styles.logoutIcon} />
        {!collapsed && (
          <span className={styles.logoutLabel}>
            {loggingOut ? 'Signing out…' : 'Log out'}
          </span>
        )}
      </button>

    </aside>
  )
}