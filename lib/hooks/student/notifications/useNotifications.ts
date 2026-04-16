// lib/hooks/student/notifications/useNotifications.ts
//
// Orchestrates all notification logic:
//   • Initial fetch from Supabase
//   • Writes to Zustand store
//   • Subscribes to real-time channel (INSERT / UPDATE / DELETE)
//   • Triggers toast queue on new arrivals
//   • Exposes typed action callbacks to components
//
// Reusable: accepts any `userId` so both student + admin can use it.

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

import {
  useNotificationStore,
  selectNotifications,
  selectLoading,
  selectUnreadCount,
} from '@/lib/stores/notifications/notificationStore'

import {
  fetchNotifications,
  markAsRead    as svcMarkAsRead,
  markAsUnread  as svcMarkAsUnread,
  markAllAsRead as svcMarkAllAsRead,
  deleteNotification as svcDelete,
  mapRowToNotification,
} from '@/lib/utils/student/notifications/notifications'

import type {
  Notification,
  NotificationRow,
} from '@/lib/types/student/notifications/notifications.types'

// ── Return type ────────────────────────────────────────────────────────────

export interface UseNotificationsReturn {
  notifications:      Notification[]
  unreadCount:        number
  loading:            boolean
  markAsRead:         (id: string) => Promise<void>
  markAsUnread:       (id: string) => Promise<void>
  markAllAsRead:      ()           => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refetch:            ()           => Promise<void>
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const {
    setNotifications,
    addNotification,
    updateNotification,
    removeNotification,
    markAllRead,
    setLoading,
    pushToast,
  } = useNotificationStore()

  const notifications = useNotificationStore(selectNotifications)
  const loading       = useNotificationStore(selectLoading)
  const unreadCount   = useNotificationStore(selectUnreadCount)

  // Prevent duplicate subscriptions across StrictMode double-mounts
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    const { data, error } = await fetchNotifications(userId)

    if (!error && data) {
      setNotifications(data)
    }
    setLoading(false)
  }, [userId, setLoading, setNotifications])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // ── Real-time subscription ────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return

    // Tear down any existing channel before creating a new one
    if (channelRef.current) {
      void createClient().removeChannel(channelRef.current)
      channelRef.current = null
    }

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on<NotificationRow>(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = mapRowToNotification(payload.new)
            addNotification(newNotif)

            // Trigger toast popup for new arrivals
            pushToast({
              id:      newNotif.id,
              title:   newNotif.title,
              message: newNotif.message,
            })
          }

          if (payload.eventType === 'UPDATE') {
            const updated = mapRowToNotification(payload.new)
            updateNotification(updated.id, updated)
          }

          if (payload.eventType === 'DELETE' && payload.old.id) {
            removeNotification(payload.old.id)
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, addNotification, updateNotification, removeNotification, pushToast])

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistic update
      updateNotification(id, { is_read: true })
      const { error } = await svcMarkAsRead(id)
      if (error) {
        // Roll back
        updateNotification(id, { is_read: false })
      }
    },
    [updateNotification],
  )

  const markAsUnread = useCallback(
    async (id: string) => {
      updateNotification(id, { is_read: false })
      const { error } = await svcMarkAsUnread(id)
      if (error) {
        updateNotification(id, { is_read: true })
      }
    },
    [updateNotification],
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    // Optimistic
    markAllRead()
    const { error } = await svcMarkAllAsRead(userId)
    if (error) {
      // Re-fetch to restore correct state on failure
      void refetch()
    }
  }, [userId, markAllRead, refetch])

  const deleteNotificationAction = useCallback(
    async (id: string) => {
      // Optimistic remove
      const snapshot = notifications.find((n) => n.id === id) ?? null
      removeNotification(id)
      const { error } = await svcDelete(id)
      if (error && snapshot) {
        // Roll back
        addNotification(snapshot)
      }
    },
    [notifications, removeNotification, addNotification],
  )

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification: deleteNotificationAction,
    refetch,
  }
}