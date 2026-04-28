// components/dashboard/student/notifications/NotificationItem.tsx
// Pure UI — single notification row.
// Handles click → mark as read, CTA navigation, toggle read, delete.

import {
  AlarmClock,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  Flame,
  ShieldCheck,
  Trash2,
  TrendingUp,
} from 'lucide-react'

import { getStaggerClass, notifAnimations } from '@/animations/notifications/notifications'
import { timeAgo } from '@/lib/utils/student/notifications/helpers'
import type {
  Notification,
  NotifType,
} from '@/lib/types/student/notifications/notifications.types'

import styles from '@/app/(dashboard)/student/notifications/notifications.module.css'
import type { JSX } from 'react'

// ── Icon map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<NotifType, { icon: React.ReactNode; cls: string }> = {
  exam: { icon: <ClipboardList size={18} />, cls: styles.iconExam },
  progress: { icon: <TrendingUp size={18} />, cls: styles.iconProgress },
  reminder: { icon: <AlarmClock size={18} />, cls: styles.iconReminder },
  study: { icon: <BookOpen size={18} />, cls: styles.iconStudy },
  streak: { icon: <Flame size={18} />, cls: styles.iconStreak },
  system: { icon: <ShieldCheck size={18} />, cls: styles.iconSystem },
}

// ── Safe fallback for unknown DB values ────────────────────────────────────

const fallbackIcon = {
  icon: <ShieldCheck size={18} />,
  cls: styles.iconSystem,
}

// ── Props ──────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification
  index: number
  onToggleRead: (id: string, currentState: boolean) => void
  onDelete: (id: string) => void
}

// ── Type guard (optional safety net) ───────────────────────────────────────

function isNotifType(value: string): value is NotifType {
  return value in ICON_MAP
}

// ── Component ──────────────────────────────────────────────────────────────

export function NotificationItem({
  notification: n,
  index,
  onToggleRead,
  onDelete,
}: NotificationItemProps): JSX.Element {
  // SAFE ICON RESOLUTION
  const entry = isNotifType(n.type)
    ? ICON_MAP[n.type]
    : fallbackIcon

  const { icon, cls } = entry

  function handleItemClick() {
    if (!n.is_read) {onToggleRead(n.id, false)}
    if (n.link) {window.location.href = n.link}
  }

  return (
    <div
      className={[
        styles.notifItem,
        !n.is_read ? styles.notifItemUnread : '',
        getStaggerClass(index),
      ].join(' ')}
      onClick={handleItemClick}
    >
      {/* Icon */}
      <div className={`${styles.iconWrap} ${cls}`}>{icon}</div>

      {/* Body */}
      <div className={styles.notifBody}>
        <div className={styles.notifTitleRow}>
          <span className={styles.notifTitle}>{n.title}</span>

          {!n.is_read && (
            <span className={`${styles.unreadDot} ${notifAnimations.dotPulse}`} />
          )}
        </div>

        <p className={styles.notifMessage}>{n.message}</p>

        <div className={styles.notifMeta}>
          <span className={styles.notifTime}>
            <Clock size={11} />
            {timeAgo(n.timestamp)}
          </span>

          {n.ctaLabel && n.link && (
            <a
              href={n.link}
              className={styles.notifCta}
              onClick={(e) => e.stopPropagation()}
            >
              {n.ctaLabel}
              <ChevronRight size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className={styles.notifActions}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.actionBtn}
          title={n.is_read ? 'Mark as unread' : 'Mark as read'}
          onClick={() => onToggleRead(n.id, n.is_read)}
        >
          {n.is_read ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          title="Delete"
          onClick={() => onDelete(n.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}