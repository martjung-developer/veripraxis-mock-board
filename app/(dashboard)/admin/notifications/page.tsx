// app/(dashboard)/admin/notifications/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/types/database";
import {
  Bell, Send, Trash2, CheckCheck, User, Users,
  Clock, ChevronDown, X, Loader2, Filter, AlertTriangle,
} from "lucide-react";
import styles from "./notifications.module.css";

// ── Types ──────────────────────────────────────────────────────────────────────
type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];
type Profile      = Database["public"]["Tables"]["profiles"]["Row"];
type NotifType    = "exam" | "result" | "general";

const TYPE_OPTIONS: NotifType[] = ["exam", "result", "general"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function TypeBadge({ type }: { type: string | null }) {
  const t = (type ?? "general") as NotifType;
  const cls =
    t === "exam"    ? styles.typeBadgeExam    :
    t === "result"  ? styles.typeBadgeResult  :
                      styles.typeBadgeGeneral;
  return (
    <span className={`${styles.typeBadge} ${cls}`}>
      {t}
    </span>
  );
}

// ── Skeleton Row ───────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className={styles.skeletonItem}>
      <div className={styles.skeleton} style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className={styles.skeleton} style={{ width: "45%", height: 13 }} />
        <div className={styles.skeleton} style={{ width: "75%", height: 11 }} />
        <div className={styles.skeleton} style={{ width: "25%", height: 10 }} />
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminNotificationsPage() {
  const supabase = createClient();
  const notificationsTable = (supabase as any).from("notifications");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [students,      setStudents]      = useState<Profile[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [filterType,    setFilterType]    = useState<"all" | NotifType>("all");
  const [showForm,      setShowForm]      = useState(false);

  // Form
  const [formTitle,   setFormTitle]   = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType,    setFormType]    = useState<NotifType>("general");
  const [targetMode,  setTargetMode]  = useState<"single" | "multiple" | "all">("single");
  const [singleId,    setSingleId]    = useState("");
  const [multiIds,    setMultiIds]    = useState<string[]>([]);
  const [formError,   setFormError]   = useState("");

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    const { data } = await notificationsTable
      .select("*")
      .order("created_at", { ascending: false });
    setNotifications(data ?? []);
  }, [notificationsTable]);

  const fetchStudents = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url, created_at, updated_at")
      .eq("role", "student")
      .order("full_name");
    setStudents(data ?? []);
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([fetchNotifications(), fetchStudents()]);
      setLoading(false);
    })();
  }, [fetchNotifications, fetchStudents]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const filtered     = filterType === "all" ? notifications : notifications.filter((n) => n.type === filterType);
  const unreadCount  = notifications.filter((n) => !n.is_read).length;
  const countFor     = (t: NotifType) => notifications.filter((n) => n.type === t).length;

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function handleMarkRead(id: string) {
    await notificationsTable.update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function handleMarkAllRead() {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;
    await notificationsTable.update({ is_read: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleDelete(id: string) {
    await notificationsTable.delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleSend() {
    setFormError("");

    if (!formTitle.trim() || !formMessage.trim()) {
      setFormError("Title and message are required.");
      return;
    }

    let recipientIds: string[] = [];
    if (targetMode === "all") {
      recipientIds = students.map((s) => s.id);
    } else if (targetMode === "single") {
      if (!singleId) { setFormError("Please select a student."); return; }
      recipientIds = [singleId];
    } else {
      if (!multiIds.length) { setFormError("Select at least one student."); return; }
      recipientIds = multiIds;
    }

    setSending(true);

    const rows = recipientIds.map((uid) => ({
      user_id: uid,
      title:   formTitle.trim(),
      message: formMessage.trim(),
      type:    formType,
      is_read: false,
    })) as NotificationInsert[];

    const { error } = await notificationsTable.insert(rows);
    setSending(false);

    if (error) { setFormError(error.message); return; }

    setFormTitle(""); setFormMessage(""); setFormType("general");
    setTargetMode("single"); setSingleId(""); setMultiIds([]);
    setShowForm(false);
    fetchNotifications();
  }

  function toggleMultiId(id: string) {
    setMultiIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function resetForm() {
    setShowForm(false);
    setFormError("");
    setFormTitle(""); setFormMessage(""); setFormType("general");
    setTargetMode("single"); setSingleId(""); setMultiIds([]);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Bell size={22} color="#fff" />
          </div>
          <div>
            <h1 className={styles.heading}>Notifications</h1>
            <p className={styles.headingSub}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · {notifications.length} total
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <>
              <span className={styles.unreadBadge}>
                <span className={styles.unreadDot} />
                {unreadCount} unread
              </span>
              <button className={styles.btnSecondary} onClick={handleMarkAllRead}>
                <CheckCheck size={14} /> Mark all read
              </button>
            </>
          )}
          <button className={styles.btnPrimary} onClick={() => setShowForm(!showForm)}>
            <Send size={14} /> {showForm ? "Cancel" : "Send Notification"}
          </button>
        </div>
      </div>

      {/* ── Send Form ── */}
      {showForm && (
        <div className={styles.formPanel}>
          <div className={styles.formHeader}>
            <span className={styles.formTitle}>
              <span className={styles.formTitleIcon}><Send size={14} color="#fff" /></span>
              Send Notification
            </span>
            <button className={styles.btnIcon} onClick={resetForm} title="Close">
              <X size={15} />
            </button>
          </div>

          <div className={styles.formBody}>
            {/* Title */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Title</label>
              <input
                className={styles.formInput}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Upcoming Board Exam Reminder"
              />
            </div>

            {/* Type */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Type</label>
              <div className={styles.selectWrap}>
                <select
                  className={styles.formSelect}
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as NotifType)}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className={styles.selectChevron} />
              </div>
            </div>

            {/* Message */}
            <div className={styles.formGroupFull}>
              <label className={styles.formLabel}>Message</label>
              <textarea
                className={styles.formTextarea}
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Write your notification message here…"
                rows={3}
              />
            </div>

            {/* Recipients */}
            <div className={styles.formGroupFull}>
              <label className={styles.formLabel}>Recipients</label>
              <div className={styles.targetModes}>
                {(["single", "multiple", "all"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTargetMode(mode)}
                    className={`${styles.targetMode} ${targetMode === mode ? styles.targetModeActive : ""}`}
                  >
                    {mode === "single"   && <User size={12} />}
                    {mode === "multiple" && <Users size={12} />}
                    {mode === "all"      && <Bell size={12} />}
                    {mode === "single" ? "Single Student" : mode === "multiple" ? "Multiple Students" : `All Students (${students.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Single picker */}
            {targetMode === "single" && (
              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>Select Student</label>
                <div className={styles.selectWrap}>
                  <select
                    className={styles.formSelect}
                    value={singleId}
                    onChange={(e) => setSingleId(e.target.value)}
                  >
                    <option value="">— Choose a student —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={styles.selectChevron} />
                </div>
              </div>
            )}

            {/* Multiple picker */}
            {targetMode === "multiple" && (
              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>
                  Select Students {multiIds.length > 0 && `(${multiIds.length} selected)`}
                </label>
                <div className={styles.studentList}>
                  {students.length === 0 ? (
                    <p className={styles.noStudents}>No students found.</p>
                  ) : students.map((s) => (
                    <label key={s.id} className={styles.studentRow}>
                      <input
                        type="checkbox"
                        className={styles.studentCheckbox}
                        checked={multiIds.includes(s.id)}
                        onChange={() => toggleMultiId(s.id)}
                      />
                      <span className={styles.studentName}>{s.full_name ?? "—"}</span>
                      <span className={styles.studentEmail}>{s.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Broadcast warning */}
            {targetMode === "all" && (
              <div className={styles.formGroupFull}>
                <div className={styles.broadcastAlert}>
                  <AlertTriangle size={15} className={styles.broadcastAlertIcon} />
                  This will send a notification to all <strong>&nbsp;{students.length}&nbsp;</strong> enrolled students.
                </div>
              </div>
            )}

            {formError && (
              <div className={styles.formGroupFull}>
                <p className={styles.formError}>
                  <AlertTriangle size={13} /> {formError}
                </p>
              </div>
            )}
          </div>

          <div className={styles.formFooter}>
            <button className={styles.btnSecondary} onClick={resetForm}>
              <X size={13} /> Cancel
            </button>
            <button className={styles.btnPrimary} onClick={handleSend} disabled={sending}>
              {sending
                ? <Loader2 size={14} className={styles.spinner} />
                : <Send size={14} />}
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className={styles.filterBar}>
        <Filter size={13} color="var(--n-text-muted)" />
        <span className={styles.filterLabel}>Filter</span>

        <button
          className={`${styles.filterChip} ${filterType === "all" ? styles.filterChipActive : ""}`}
          onClick={() => setFilterType("all")}
        >
          All
          <span className={`${styles.filterCount} ${filterType !== "all" ? styles.filterCountDark : ""}`}>
            {notifications.length}
          </span>
        </button>

        {TYPE_OPTIONS.map((t) => (
          <button
            key={t}
            className={`${styles.filterChip} ${filterType === t ? styles.filterChipActive : ""}`}
            onClick={() => setFilterType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={`${styles.filterCount} ${filterType !== t ? styles.filterCountDark : ""}`}>
              {countFor(t)}
            </span>
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>
            <span className={styles.cardTitleIcon}><Bell size={14} color="#fff" /></span>
            All Notifications
          </span>
          <span className={styles.cardMeta}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className={styles.notifList}>
            {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><Bell size={22} color="var(--n-text-muted)" /></div>
            <p className={styles.emptyTitle}>No notifications yet</p>
            <p className={styles.emptySub}>Use the Send Notification button above to reach your students.</p>
          </div>
        ) : (
          <div className={styles.notifList}>
            {filtered.map((notif) => (
              <div
                key={notif.id}
                className={`${styles.notifItem} ${!notif.is_read ? styles.notifItemUnread : ""}`}
              >
                <div className={`${styles.notifDot} ${notif.is_read ? styles.notifDotRead : styles.notifDotUnread}`} />

                <div className={styles.notifContent}>
                  <div className={styles.notifTop}>
                    <span className={`${styles.notifTitle} ${notif.is_read ? styles.notifTitleRead : ""}`}>
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
                      onClick={() => handleMarkRead(notif.id)}
                      title="Mark as read"
                    >
                      <CheckCheck size={13} />
                    </button>
                  )}
                  <button
                    className={styles.btnDanger}
                    onClick={() => handleDelete(notif.id)}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}