// lib/services/admin/notifications/notifications.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service layer that wraps `lib/utils/notifications.ts`.
// Contains ZERO UI logic, ZERO React hooks, and ZERO direct Supabase calls.
// Every method returns a `ServiceResult<T>` so callers can handle errors
// uniformly without try/catch at the component or hook level.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type {
  Notification,
  NotificationInsert,
  SendNotificationPayload,
  ServiceResult,
  StudentWithProfile,
  RawProfileRow,
  RawStudentRow,
} from "@/lib/types/admin/notifications/notifications.types";

// ── Re-export the utility so consumers can import from one place ──────────────
// Adjust this path if your project places it elsewhere.
export {
  fetchNotifications as fetchNotificationsUtil,
  markAsRead as markAsReadUtil,
  markAllAsRead as markAllAsReadUtil,
  deleteNotification as deleteNotificationUtil,
  createNotification as createNotificationUtil,
  createBulkNotifications as createBulkNotificationsUtil,
  NotifTemplates,
} from "@/lib/utils/notifications";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toResult<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

function toError<T = void>(message: string): ServiceResult<T> {
  return { data: null, error: message };
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches ALL notifications ordered by creation date (newest first).
 * Intended for the admin dashboard view.
 */
export async function fetchNotifications(
  supabase: SupabaseClient<Database>
): Promise<ServiceResult<Notification[]>> {
  try {
    // Delegate to the existing utility when it accepts a supabase client,
    // otherwise call Supabase directly here so the service owns the query.
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return toError(error.message);
    }
    return toResult(data ?? []);
  } catch (err) {
    return toError(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Fetches notifications scoped to a single user (student dashboard usage).
 */
export async function fetchNotificationsForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ServiceResult<Notification[]>> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return toError(error.message);
    }
    return toResult(data ?? []);
  } catch (err) {
    return toError(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<ServiceResult> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      return toError(error.message);
    }
    return toResult(undefined);
  } catch (err) {
    return toError(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Marks ALL unread notifications as read (admin bulk action).
 */
export async function markAllAsRead(
  supabase: SupabaseClient<Database>,
  ids: string[]
): Promise<ServiceResult> {
  if (!ids.length) {
    return toResult(undefined);
  }
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids);

    if (error) {
      return toError(error.message);
    }
    return toResult(undefined);
  } catch (err) {
    return toError(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Hard-deletes a notification row.
 */
export async function deleteNotification(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<ServiceResult> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      return toError(error.message);
    }
    return toResult(undefined);
  } catch (err) {
    return toError(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Sends a notification to one or more recipients.
 * Wraps `createBulkNotifications` from the utility layer.
 */
export async function sendNotification(
  supabase: SupabaseClient<Database>,
  payload: SendNotificationPayload
): Promise<ServiceResult> {
  const { title, message, type, recipientIds } = payload;

  if (!title.trim() || !message.trim()) {
    return toError("Title and message are required.");
  }
  if (!recipientIds.length) {
    return toError("At least one recipient is required.");
  }

  try {
    const rows: NotificationInsert[] = recipientIds.map((uid) => ({
      user_id: uid,
      title: title.trim(),
      message: message.trim(),
      type,
      is_read: false,
    }));

    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      return toError(error.message);
    }
    return toResult(undefined);
  } catch (err) {
    return toError(err instanceof Error ? err.message : "Unknown error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ROSTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads all student profiles needed to populate the recipient picker.
 *
 * Strategy:
 *  1. PRIMARY  – profiles LEFT JOIN students (no !inner so we catch all).
 *  2. FALLBACK – students LEFT JOIN profiles (works even when RLS on
 *                `profiles` blocks the primary path).
 */
export async function fetchStudents(
  supabase: SupabaseClient<Database>
): Promise<ServiceResult<StudentWithProfile[]>> {
  // ── PRIMARY ──────────────────────────────────────────────────────────────
  try {
    const { data: rawData, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, students(id)")
      .eq("role", "student")
      .order("full_name");

    // Cast via `unknown` — Supabase's inferred join type conflicts with our
    // explicit RawProfileRow shape (object vs array ambiguity).
    const data = rawData as unknown as RawProfileRow[] | null;

    if (!error && data && data.length > 0) {
      const normalised: StudentWithProfile[] = data.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        students: Array.isArray(p.students)
          ? (p.students[0] ?? null)
          : (p.students ?? null),
      }));
      return toResult(normalised);
    }

    if (error) {
      console.error("[fetchStudents] primary join failed:", error.message);
    }
  } catch (err) {
    console.error("[fetchStudents] primary join threw:", err);
  }

  // ── FALLBACK ─────────────────────────────────────────────────────────────
  try {
    const { data: rawFallback, error: fallbackError } = await supabase
      .from("students")
      .select("id, profiles(id, full_name, email)")
      .order("id");

    const fallback = rawFallback as unknown as RawStudentRow[] | null;

    if (fallbackError) {
      console.error("[fetchStudents] fallback failed:", fallbackError.message);
      return toError(
        "Could not load students. Check RLS policies on `profiles` and `students` tables."
      );
    }

    const normalised: StudentWithProfile[] = (fallback ?? [])
      .filter((s) => s.profiles !== null)
      .map((s) => {
        const profile = Array.isArray(s.profiles)
          ? s.profiles[0]
          : s.profiles;
        return {
          id: profile?.id ?? s.id,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? "—",
          students: { id: s.id },
        };
      });

    return toResult(normalised);
  } catch (err) {
    return toError(err instanceof Error ? err.message : "Unknown fallback error");
  }
}