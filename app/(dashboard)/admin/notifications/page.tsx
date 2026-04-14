// app/(dashboard)/admin/notifications/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
//
// ✅ WHAT THIS FILE CONTAINS
//   • Client boundary declaration
//   • useNotifications hook usage
//   • Derived counts for the filter bar
//   • Props passed down to pure UI components
//
// ❌ WHAT THIS FILE MUST NEVER CONTAIN
//   • Supabase logic
//   • Filtering / sorting logic
//   • Direct notification utility calls
//   • State management beyond hook destructuring
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo } from "react";
import { useNotifications } from "@/lib/hooks/admin/notifications/useNotifications";
import type { NotifType } from "@/lib/types/admin/notifications/notifications.types";
import {
  NotificationsHeader,
  NotificationForm,
  NotificationFilterBar,
  NotificationList,
} from "@/components/dashboard/admin/notifications";
import styles from "./notifications.module.css";

const TYPE_OPTIONS: NotifType[] = ["exam", "result", "general"];

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const {
    // State
    notifications,
    students,
    loading,
    sending,
    fetchError,
    filterType,
    showForm,
    // Derived
    filteredNotifications,
    unreadCount,
    // Actions
    setFilterType,
    setShowForm,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendNotification,
  } = useNotifications();

  /** Per-type counts – memoised so the filter bar never triggers extra renders. */
  const countByType = useMemo(
    () =>
      TYPE_OPTIONS.reduce<Record<NotifType, number>>(
        (acc, t) => ({
          ...acc,
          [t]: notifications.filter((n) => n.type === t).length,
        }),
        { exam: 0, result: 0, general: 0 }
      ),
    [notifications]
  );

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <NotificationsHeader
        totalCount={notifications.length}
        unreadCount={unreadCount}
        showForm={showForm}
        onToggleForm={() => setShowForm(!showForm)}
        onMarkAllRead={markAllAsRead}
      />

      {/* ── Send Form ── */}
      {showForm && (
        <NotificationForm
          students={students}
          sending={sending}
          fetchError={fetchError}
          onSubmit={sendNotification}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Filter Bar ── */}
      <NotificationFilterBar
        filterType={filterType}
        totalCount={notifications.length}
        countByType={countByType}
        onFilter={setFilterType}
      />

      {/* ── Notification List ── */}
      <NotificationList
        notifications={filteredNotifications}
        loading={loading}
        onMarkRead={markAsRead}
        onDelete={deleteNotification}
      />
    </div>
  );
}