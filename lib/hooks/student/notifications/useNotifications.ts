// lib/hooks/student/notifications/useNotifications.ts
//
// ─────────────────────────────────────────────────────────────────────────────
// Orchestrates all notification state for the student dashboard.
//
//   • Initial fetch from Supabase (via notification.service.ts)
//   • Writes to Zustand store
//   • Real-time channel — INSERT / UPDATE / DELETE, filtered to current user
//   • Pushes toasts for new arrivals
//   • Exposes strongly-typed action callbacks to components
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient }                   from '@/lib/supabase/client'

import {
  useNotificationStore,
  selectNotifications,
  selectLoading,
  selectUnreadCount,
} from '@/lib/stores/notifications/notificationStore'

import {
  fetchNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationById,
} from '@/lib/services/notifications/notification.service'

import {
  rowToDTO,
  type NotificationDTO,
  type NotificationRow,
} from '@/lib/types/notifications/notification.dto'

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseStudentNotificationsReturn {
  notifications:      NotificationDTO[]
  unreadCount:        number
  loading:            boolean
  markAsRead:         (id: string) => Promise<void>
  markAsUnread:       (id: string) => Promise<void>
  markAllAsRead:      ()           => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refetch:            ()           => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications(
  userId: string | null,
): UseStudentNotificationsReturn {
  const {
    setNotifications,
    addNotification,
    updateNotification,
    removeNotification,
    markAllRead,
    setLoading,
    pushToast,
  } = useNotificationStore()

  const notifications = useNotificationStore(selectNotifications) as NotificationDTO[]
  const loading       = useNotificationStore(selectLoading)       as boolean
  const unreadCount   = useNotificationStore(selectUnreadCount)   as number

  // Prevent duplicate channels across StrictMode double-mounts
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>['channel']
  > | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const refetch = useCallback(async (): Promise<void> => {
    if (userId === null) {return}

    setLoading(true)
    const { data, error } = await fetchNotificationsForUser(
      createClient(),
      userId,
    )

    if (error === null && data !== null) {
      setNotifications(data)
    }
    setLoading(false)
  }, [userId, setLoading, setNotifications])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // ── Real-time subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (userId === null) {return}

    // Tear down stale channel before creating a new one
    if (channelRef.current !== null) {
      void createClient().removeChannel(channelRef.current)
      channelRef.current = null
    }

    const supabase  = createClient()
    const channelId = `student:notifications:${userId}`

    const channel = supabase
      .channel(channelId)
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
            const dto = rowToDTO(payload.new)
            addNotification(dto)
            pushToast({
              id:      dto.id,
              title:   dto.title,
              message: dto.message,
            })
          }

          if (payload.eventType === 'UPDATE') {
            const dto = rowToDTO(payload.new)
            updateNotification(dto.id, dto)
          }

          if (
            payload.eventType === 'DELETE' &&
            typeof payload.old.id === 'string'
          ) {
            removeNotification(payload.old.id)
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current !== null) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, addNotification, updateNotification, removeNotification, pushToast])

  // ── Actions ────────────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      updateNotification(id, { isRead: true })
      const { error } = await markNotificationRead(createClient(), id, true)
      if (error !== null) {
        updateNotification(id, { isRead: false })
      }
    },
    [updateNotification],
  )

  const markAsUnread = useCallback(
    async (id: string): Promise<void> => {
      updateNotification(id, { isRead: false })
      const { error } = await markNotificationRead(createClient(), id, false)
      if (error !== null) {
        updateNotification(id, { isRead: true })
      }
    },
    [updateNotification],
  )

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (userId === null) {return}
    markAllRead()
    const { error } = await markAllNotificationsRead(createClient(), userId)
    if (error !== null) {
      void refetch()
    }
  }, [userId, markAllRead, refetch])

  const deleteNotification = useCallback(
    async (id: string): Promise<void> => {
      const snapshot = notifications.find((n) => n.id === id) ?? null
      removeNotification(id)
      const { error } = await deleteNotificationById(createClient(), id)
      if (error !== null && snapshot !== null) {
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
    deleteNotification,
    refetch,
  }
}