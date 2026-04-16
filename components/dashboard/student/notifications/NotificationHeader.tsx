// components/dashboard/student/notifications/NotificationHeader.tsx
// Pure UI — title, subtitle, mark-all-read button, settings button.

import { CheckCheck, Settings } from 'lucide-react'
import { notifAnimations } from '@/animations/notifications/notifications'
import styles from '@/app/(dashboard)/student/notifications/notifications.module.css'
import { JSX } from 'react/jsx-dev-runtime'

interface NotificationHeaderProps {
  unreadCount:   number
  onMarkAllRead: () => void
  onOpenSettings: () => void
}

export function NotificationHeader({
  unreadCount,
  onMarkAllRead,
  onOpenSettings,
}: NotificationHeaderProps): JSX.Element {
  return (
    <div className={`${styles.header} ${notifAnimations.fadeSlideIn}`}>
      <div className={styles.headerLeft}>
        <h2 className={styles.title}>Notifications</h2>
        <p className={styles.subtitle}>
          Stay updated with your exams, progress, and reminders
        </p>
      </div>

      <div className={styles.headerActions}>
        <button
          className={styles.btnMarkAll}
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck size={15} />
          Mark all as read
        </button>

        <button
          className={styles.btnSettings}
          onClick={onOpenSettings}
          title="Notification settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}