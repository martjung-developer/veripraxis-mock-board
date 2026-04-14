// lib/types/admin/notifications/notifications.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Strongly-typed domain types for the Admin Notifications feature.
// All Supabase Row/Insert/Update shapes are derived from the generated
// `Database` type so they stay in sync with the schema automatically.
// ─────────────────────────────────────────────────────────────────────────────

import type { Database } from "@/lib/types/database";

// ── Supabase-derived Row / Insert / Update ────────────────────────────────────

export type Notification =
  Database["public"]["Tables"]["notifications"]["Row"];

export type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

export type NotificationUpdate =
  Database["public"]["Tables"]["notifications"]["Update"];

// ── Domain enums ──────────────────────────────────────────────────────────────

/** The three content categories a notification can carry. */
export type NotifType = "exam" | "result" | "general";

/** UI filter selector – "all" is a synthetic value that is never persisted. */
export type FilterType = "all" | NotifType;

/** Recipient targeting mode used in the send-notification form. */
export type TargetMode = "single" | "multiple" | "all";

// ── Normalised profile shape returned by joined Supabase queries ──────────────

/**
 * A `profiles` row that has been normalised after a LEFT-JOIN with `students`.
 * The `students` field can be null when the related row does not exist yet
 * (e.g. a DB trigger that failed to insert the corresponding student row).
 */
export interface StudentWithProfile {
  /** UUID from `profiles.id` — used as the `user_id` FK in notifications. */
  id: string;
  full_name: string | null;
  email: string;
  /** Null when no matching `students` row exists. */
  students: { id: string } | null;
}

// ── Raw Supabase join shapes ───────────────────────────────────────────────────
// Supabase's TypeScript inference for joined selects can return the related
// side as either an object OR an array depending on the detected cardinality.
// These raw types capture that ambiguity so we can normalise safely.

export interface RawProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  students: { id: string } | { id: string }[] | null;
}

export interface RawStudentRow {
  id: string;
  profiles:
    | { id: string; full_name: string | null; email: string }
    | { id: string; full_name: string | null; email: string }[]
    | null;
}

// ── Form state ────────────────────────────────────────────────────────────────

/** All mutable fields in the "Send Notification" form. */
export interface NotificationFormState {
  title: string;
  message: string;
  type: NotifType;
  targetMode: TargetMode;
  /** Profile UUID of the selected student (used when targetMode === "single"). */
  singleId: string;
  /** Profile UUIDs of selected students (used when targetMode === "multiple"). */
  multiIds: string[];
}

/** Default / reset values for NotificationFormState. */
export const NOTIFICATION_FORM_DEFAULTS: NotificationFormState = {
  title: "",
  message: "",
  type: "general",
  targetMode: "single",
  singleId: "",
  multiIds: [],
} as const;

// ── Service-layer input/output contracts ──────────────────────────────────────

/** Payload accepted by the service's `sendNotification` method. */
export interface SendNotificationPayload {
  title: string;
  message: string;
  type: NotifType;
  /** One or more profile UUIDs that should receive this notification. */
  recipientIds: string[];
}

/** Result returned from any service write operation. */
export interface ServiceResult<T = void> {
  data: T | null;
  error: string | null;
}

// ── Hook state shape ──────────────────────────────────────────────────────────

/** The full state surface exposed by `useNotifications`. */
export interface UseNotificationsState {
  notifications: Notification[];
  students: StudentWithProfile[];
  loading: boolean;
  sending: boolean;
  fetchError: string;
  filterType: FilterType;
  showForm: boolean;
  /** Derived: notifications matching the active filterType. */
  filteredNotifications: Notification[];
  /** Derived: number of unread notifications. */
  unreadCount: number;
}

/** Actions exposed by `useNotifications`. */
export interface UseNotificationsActions {
  setFilterType: (filter: FilterType) => void;
  setShowForm: (show: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  sendNotification: (payload: SendNotificationPayload) => Promise<string | null>;
  refetch: () => Promise<void>;
}

/** Combined hook return type. */
export type UseNotificationsReturn = UseNotificationsState & UseNotificationsActions;