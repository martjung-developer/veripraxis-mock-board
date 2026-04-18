// components/dashboard/admin/notifications/NotificationList.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Pure UI components:
//   NotificationList   – wraps the card shell + list of items
//   NotificationItem   – single row (title, badge, message, actions)
//   TypeBadge          – coloured pill for exam / result / general
//   EmptyState         – zero-result placeholder
//   SkeletonLoader     – shimmer rows shown during initial load
// ─────────────────────────────────────────────────────────────────────────────

import { Bell, CheckCheck, Clock, Trash2 } from "lucide-react";
import type { Notification } from "@/lib/types/admin/notifications/notifications.types";
import styles from "@/app/(dashboard)/admin/notifications/notifications.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TypeBadge
// ─────────────────────────────────────────────────────────────────────────────

interface TypeBadgeProps {
  type: string | null;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const t = (type ?? "general") as "exam" | "result" | "general";
  const cls =
    t === "exam"
      ? styles.typeBadgeExam
      : t === "result"
      ? styles.typeBadgeResult
      : styles.typeBadgeGeneral;
  return <span className={`${styles.typeBadge} ${cls}`}>{t}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationItem
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({
  notification: notif,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  return (
    <div
      className={`${styles.notifItem} ${
        !notif.is_read ? styles.notifItemUnread : ""
      }`}
    >
      <div
        className={`${styles.notifDot} ${
          notif.is_read ? styles.notifDotRead : styles.notifDotUnread
        }`}
      />

      <div className={styles.notifContent}>
        <div className={styles.notifTop}>
          <span
            className={`${styles.notifTitle} ${
              notif.is_read ? styles.notifTitleRead : ""
            }`}
          >
            {notif.title ?? "—"}
          </span>
          <TypeBadge type={notif.type} />
          {!notif.is_read && <span className={styles.newTag}>New</span>}
        </div>
        <p className={styles.notifMessage}>{notif.message ?? "—"}</p>
        <span className={styles.notifTime}>
          <Clock size={11} />
          {formatDate(notif.created_at)}
        </span>
      </div>

      <div className={styles.notifActions}>
        {!notif.is_read && (
          <button
            className={styles.btnGhost}
            onClick={() => onMarkRead(notif.id)}
            title="Mark as read"
          >
            <CheckCheck size={13} />
          </button>
        )}
        <button
          className={styles.btnDanger}
          onClick={() => onDelete(notif.id)}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

export function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <Bell size={20} color="var(--notif-text-muted)" />
      </div>
      <p className={styles.emptyTitle}>No notifications yet</p>
      <p className={styles.emptySub}>
        Use the Send Notification button above to reach your students.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonRow / SkeletonLoader
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className={styles.skeletonItem}>
      <div
        className={styles.skeleton}
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}
      >
        <div className={styles.skeleton} style={{ width: "40%", height: 12 }} />
        <div className={styles.skeleton} style={{ width: "70%", height: 11 }} />
        <div className={styles.skeleton} style={{ width: "22%", height: 10 }} />
      </div>
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className={styles.notifList}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationList  (main export — card shell + content)
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationList({
  notifications,
  loading,
  onMarkRead,
  onDelete,
}: NotificationListProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>
          <span className={styles.cardTitleIcon}>
            <Bell size={14} color="var(--notif-text-sub)" />
          </span>
          All Notifications
        </span>
        <span className={styles.cardMeta}>
          {notifications.length} item{notifications.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={styles.notifList}>
          {notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}