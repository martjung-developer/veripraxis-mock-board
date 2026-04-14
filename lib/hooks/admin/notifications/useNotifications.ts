// lib/hooks/admin/notifications/useNotifications.ts
// ─────────────────────────────────────────────────────────────────────────────
// Custom hook that owns ALL UI state for the Admin Notifications page.
// - Calls only the service layer (no direct Supabase calls).
// - Integrates a real-time Supabase subscription that patches local state
//   incrementally (no full re-fetch needed for most events).
// - Optimises renders via useCallback / useMemo.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import * as NotificationsService from "@/lib/services/admin/notifications/notifications.service";
import type {
  FilterType,
  Notification,
  SendNotificationPayload,
  StudentWithProfile,
  UseNotificationsReturn,
} from "@/lib/types/admin/notifications/notifications.types";

// ─────────────────────────────────────────────────────────────────────────────

export function useNotifications(): UseNotificationsReturn {
  const supabase = useMemo(() => createClient(), []);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fetchError, setFetchError] = useState<string>("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [showForm, setShowForm] = useState(false);

  // Guard against state updates after unmount
  const mountedRef = useRef(true);

  // ── Derived state ───────────────────────────────────────────────────────────

  const filteredNotifications = useMemo<Notification[]>(
    () =>
      filterType === "all"
        ? notifications
        : notifications.filter((n) => n.type === filterType),
    [notifications, filterType]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // ── Data fetching ───────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }
    setLoading(true);
    setFetchError("");

    const [notifResult, studentsResult] = await Promise.all([
      NotificationsService.fetchNotifications(supabase),
      NotificationsService.fetchStudents(supabase),
    ]);

    if (!mountedRef.current) {
      return;
    }

    if (notifResult.error) {
      console.error("[useNotifications] fetchNotifications:", notifResult.error);
    }
    if (studentsResult.error) {
      setFetchError(studentsResult.error);
    }

    setNotifications(notifResult.data ?? []);
    setStudents(studentsResult.data ?? []);
    setLoading(false);
  }, [supabase]);

  // ── Real-time subscription ──────────────────────────────────────────────────
  // We subscribe to INSERT / UPDATE / DELETE events on the `notifications`
  // table and patch local state in-place so we avoid full network round-trips.

  useEffect(() => {
    const channel = supabase
      .channel("admin:notifications:realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          if (!mountedRef.current) {
            return;
          }
          const newRow = payload.new as Notification;
          setNotifications((prev) => {
            // Avoid duplicates (e.g. the row we just inserted ourselves)
            if (prev.some((n) => n.id === newRow.id)) {
              return prev;
            }
            return [newRow, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          if (!mountedRef.current) {
            return;
          }
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          if (!mountedRef.current) {
            return;
          }
          // `payload.old` carries the id for DELETE events
          const deletedId = (payload.old as Partial<Notification>).id;
          if (!deletedId) {
            return;
          }
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    const loadData = async () => {
      await refetch();
    };
    void loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [refetch]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      const result = await NotificationsService.markAsRead(supabase, id);
      if (result.error) {
        // Rollback on failure
        console.error("[useNotifications] markAsRead:", result.error);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
        );
      }
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    const unreadIds = notifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);
    if (!unreadIds.length) {
      return;
    }

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    const result = await NotificationsService.markAllAsRead(supabase, unreadIds);
    if (result.error) {
      console.error("[useNotifications] markAllAsRead:", result.error);
      // Re-fetch to restore truth from DB
      void refetch();
    }
  }, [notifications, supabase, refetch]);

  const deleteNotification = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic removal
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const result = await NotificationsService.deleteNotification(supabase, id);
      if (result.error) {
        console.error("[useNotifications] deleteNotification:", result.error);
        // Re-fetch to restore deleted row
        void refetch();
      }
    },
    [supabase, refetch]
  );

  /**
   * Sends one or more notifications.
   * Returns an error message string on failure, or null on success.
   */
  const sendNotification = useCallback(
    async (payload: SendNotificationPayload): Promise<string | null> => {
      setSending(true);
      const result = await NotificationsService.sendNotification(
        supabase,
        payload
      );
      setSending(false);

      if (result.error) {
        return result.error;
      }

      // Real-time subscription will pick up the new rows, but we also
      // trigger a manual refetch so the admin sees counts update immediately.
      void refetch();
      return null;
    },
    [supabase, refetch]
  );

  // ── Return surface ──────────────────────────────────────────────────────────

  return {
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
    refetch,
  };
}