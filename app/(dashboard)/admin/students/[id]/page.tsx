// app/(dashboard)/admin/students/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, GraduationCap, BookOpen,
  Bell, ClipboardList, BarChart2, Pencil, Send,
  PlusCircle, Loader2, AlertTriangle, Clock,
  CheckCircle2, XCircle, FileText, Trophy,
  ChevronRight, Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./id.module.css";

// ── Types ──────────────────────────────────────────────────────────────────────
type StudentDetail = {
  id:          string;
  full_name:   string | null;
  email:       string;
  avatar_url:  string | null;
  created_at:  string;
  role:        string;
  student_id:  string | null;
  year_level:  number | null;
  target_exam: string | null;
  program_name: string | null;
  school_name:  string | null;
  program_id:   string | null;
};

type ExamAssignment = {
  id:          string;
  assigned_at: string;
  deadline:    string | null;
  is_active:   boolean;
  exam_title:  string | null;
  exam_id:     string | null;
};

type Submission = {
  id:           string;
  exam_title:   string | null;
  exam_id:      string | null;
  submitted_at: string | null;
  score:        number | null;
  percentage:   number | null;
  passed:       boolean | null;
  status:       string;
};

type Notification = {
  id:         string;
  title:      string | null;
  message:    string | null;
  type:       string | null;
  is_read:    boolean;
  created_at: string;
};

function getInitials(name: string | null, email: string) {
  if (name) {
    const p = name.trim().split(" ");
    return p.length >= 2
      ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
      : p[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Stat Mini Card ─────────────────────────────────────────────────────────────
function StatMini({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className={styles.statMini}>
      <div className={styles.statMiniIcon} style={{ background: color + "18", color }}>
        {icon}
      </div>
      <div>
        <div className={styles.statMiniValue}>{value}</div>
        <div className={styles.statMiniLabel}>{label}</div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StudentDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;
  const supabase = createClient();

  const [student,       setStudent]       = useState<StudentDetail | null>(null);
  const [assignments,   setAssignments]   = useState<ExamAssignment[]>([]);
  const [submissions,   setSubmissions]   = useState<Submission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [activeTab,     setActiveTab]     = useState<"exams" | "submissions" | "notifications">("exams");

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");

    // Profile + student row
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select(`
        id, full_name, email, avatar_url, created_at, role,
        students(
          student_id, year_level, target_exam, program_id,
          programs(name),
          schools(name)
        )
      `)
      .eq("id", id)
      .single();

    if (profErr || !prof) {
      setError(profErr?.message ?? "Student not found.");
      setLoading(false);
      return;
    }

    const raw = prof as unknown as {
      id: string; full_name: string | null; email: string;
      avatar_url: string | null; created_at: string; role: string;
      students: {
        student_id: string | null; year_level: number | null;
        target_exam: string | null; program_id: string | null;
        programs: { name: string } | { name: string }[] | null;
        schools:  { name: string } | { name: string }[] | null;
      } | null;
    };

    const s = raw.students;
    const prog = s?.programs ? (Array.isArray(s.programs) ? s.programs[0] : s.programs) : null;
    const sch  = s?.schools  ? (Array.isArray(s.schools)  ? s.schools[0]  : s.schools)  : null;

    setStudent({
      id:           raw.id,
      full_name:    raw.full_name,
      email:        raw.email,
      avatar_url:   raw.avatar_url,
      created_at:   raw.created_at,
      role:         raw.role,
      student_id:   s?.student_id  ?? null,
      year_level:   s?.year_level  ?? null,
      target_exam:  s?.target_exam ?? null,
      program_name: prog?.name ?? null,
      school_name:  sch?.name  ?? null,
      program_id:   s?.program_id ?? null,
    });

    // Exam assignments
    const { data: assign } = await supabase
      .from("exam_assignments")
      .select("id, assigned_at, deadline, is_active, exam_id, exams(title)")
      .eq("student_id", id)
      .order("assigned_at", { ascending: false });

    setAssignments(
      ((assign ?? []) as unknown as Array<{
        id: string; assigned_at: string; deadline: string | null;
        is_active: boolean; exam_id: string | null;
        exams: { title: string } | { title: string }[] | null;
      }>).map((a) => ({
        id:          a.id,
        assigned_at: a.assigned_at,
        deadline:    a.deadline,
        is_active:   a.is_active,
        exam_id:     a.exam_id,
        exam_title:  a.exams
          ? Array.isArray(a.exams) ? a.exams[0]?.title : a.exams.title
          : null,
      }))
    );

    // Submissions
    const { data: subs } = await supabase
      .from("submissions")
      .select("id, submitted_at, score, percentage, passed, status, exam_id, exams(title)")
      .eq("student_id", id)
      .order("submitted_at", { ascending: false });

    setSubmissions(
      ((subs ?? []) as unknown as Array<{
        id: string; submitted_at: string | null; score: number | null;
        percentage: number | null; passed: boolean | null; status: string;
        exam_id: string | null;
        exams: { title: string } | { title: string }[] | null;
      }>).map((s) => ({
        id:           s.id,
        submitted_at: s.submitted_at,
        score:        s.score,
        percentage:   s.percentage,
        passed:       s.passed,
        status:       s.status,
        exam_id:      s.exam_id,
        exam_title:   s.exams
          ? Array.isArray(s.exams) ? s.exams[0]?.title : s.exams.title
          : null,
      }))
    );

    // Notifications
    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    setNotifications(notifs ?? []);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const avgScore   = submissions.length
    ? Math.round(submissions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / submissions.length)
    : null;
  const passedCount = submissions.filter((s) => s.passed === true).length;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 size={28} className={styles.spinnerLarge} />
        <p>Loading student profile…</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className={styles.errorScreen}>
        <AlertTriangle size={28} color="#dc2626" />
        <p>{error || "Student not found."}</p>
        <button className={styles.btnSecondary} onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Back */}
      <Link href="/admin/students" className={styles.backLink}>
        <ArrowLeft size={14} /> All Students
      </Link>

      {/* Profile Hero */}
      <div className={styles.profileHero}>
        <div className={styles.profileHeroLeft}>
          <div className={styles.avatarLg}>
            {student.avatar_url
              ? <img src={student.avatar_url} alt="" className={styles.avatarImg} />
              : <span className={styles.avatarInitials}>
                  {getInitials(student.full_name, student.email)}
                </span>
            }
          </div>
          <div className={styles.profileInfo}>
            <h1 className={styles.profileName}>{student.full_name ?? "—"}</h1>
            <div className={styles.profileMeta}>
              <span className={styles.metaItem}><Mail size={12} />{student.email}</span>
              {student.student_id && (
                <span className={styles.metaItem}><User size={12} />ID: {student.student_id}</span>
              )}
              {student.program_name && (
                <span className={styles.metaItem}><GraduationCap size={12} />{student.program_name}</span>
              )}
              {student.year_level && (
                <span className={styles.metaItem}><BookOpen size={12} />Year {student.year_level}</span>
              )}
              <span className={styles.metaItem}><Calendar size={12} />Joined {formatDate(student.created_at)}</span>
            </div>
            {student.target_exam && (
              <div className={styles.targetBadge}>
                <Trophy size={11} /> Target: {student.target_exam}
              </div>
            )}
          </div>
        </div>

        <div className={styles.profileHeroActions}>
          <Link href={`/admin/students/${id}/edit`} className={styles.btnSecondary}>
            <Pencil size={13} /> Edit Profile
          </Link>
          <Link href={`/admin/notifications?student=${id}`} className={styles.btnOutline}>
            <Send size={13} /> Send Notification
          </Link>
          <Link href={`/admin/exams/assign?student=${id}`} className={styles.btnPrimary}>
            <PlusCircle size={13} /> Assign Exam
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <StatMini
          icon={<ClipboardList size={15} />}
          label="Assigned Exams"
          value={assignments.length}
          color="#0d2540"
        />
        <StatMini
          icon={<FileText size={15} />}
          label="Submissions"
          value={submissions.length}
          color="#7c3aed"
        />
        <StatMini
          icon={<CheckCircle2 size={15} />}
          label="Passed"
          value={passedCount}
          color="#059669"
        />
        <StatMini
          icon={<BarChart2 size={15} />}
          label="Avg Score"
          value={avgScore !== null ? `${avgScore}%` : "—"}
          color="#d97706"
        />
        <StatMini
          icon={<Bell size={15} />}
          label="Notifications"
          value={notifications.length}
          color="#0891b2"
        />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(["exams", "submissions", "notifications"] as const).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "exams"         && <ClipboardList size={13} />}
            {tab === "submissions"   && <FileText size={13} />}
            {tab === "notifications" && <Bell size={13} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={styles.tabCount}>
              {tab === "exams"         ? assignments.length
               : tab === "submissions" ? submissions.length
               : notifications.length}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>

        {/* ── Assigned Exams ── */}
        {activeTab === "exams" && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}><ClipboardList size={14} /></span>
                Assigned Exams
              </span>
              <Link href={`/admin/exams/assign?student=${id}`} className={styles.cardAction}>
                <PlusCircle size={12} /> Assign New
              </Link>
            </div>

            {assignments.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><ClipboardList size={20} color="var(--text-muted)" /></div>
                <p className={styles.emptyTitle}>No exams assigned</p>
                <p className={styles.emptySub}>Assign a mock exam to get this student started.</p>
              </div>
            ) : (
              <div className={styles.assignList}>
                {assignments.map((a) => (
                  <div key={a.id} className={styles.assignItem}>
                    <div className={styles.assignLeft}>
                      <div className={`${styles.assignStatus} ${a.is_active ? styles.assignStatusActive : styles.assignStatusInactive}`} />
                      <div>
                        <div className={styles.assignTitle}>{a.exam_title ?? "Untitled Exam"}</div>
                        <div className={styles.assignMeta}>
                          <Clock size={10} /> Assigned {formatDate(a.assigned_at)}
                          {a.deadline && <> · Due {formatDate(a.deadline)}</>}
                        </div>
                      </div>
                    </div>
                    <div className={styles.assignRight}>
                      <span className={a.is_active ? styles.badgeActive : styles.badgeInactive}>
                        {a.is_active ? "Active" : "Inactive"}
                      </span>
                      {a.exam_id && (
                        <Link href={`/admin/exams/${a.exam_id}`} className={styles.viewLink}>
                          View <ChevronRight size={11} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Submissions ── */}
        {activeTab === "submissions" && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}><FileText size={14} /></span>
                Exam Submissions
              </span>
            </div>

            {submissions.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><FileText size={20} color="var(--text-muted)" /></div>
                <p className={styles.emptyTitle}>No submissions yet</p>
                <p className={styles.emptySub}>This student hasn&apos;t submitted any exams.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Submitted</th>
                      <th>Score</th>
                      <th>Result</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id} className={styles.tableRow}>
                        <td>
                          <span className={styles.submissionExam}>
                            {sub.exam_title ?? "—"}
                          </span>
                        </td>
                        <td>
                          <span className={styles.submissionDate}>
                            {formatDateTime(sub.submitted_at)}
                          </span>
                        </td>
                        <td>
                          {sub.percentage !== null
                            ? <span className={styles.scoreChip} style={{
                                color: sub.percentage >= 75 ? "var(--success)" : "var(--danger)",
                              }}>
                                {sub.percentage.toFixed(1)}%
                              </span>
                            : <span className={styles.cellMuted}>—</span>
                          }
                        </td>
                        <td>
                          {sub.passed === true  && <span className={styles.badgePassed}><CheckCircle2 size={10} /> Passed</span>}
                          {sub.passed === false && <span className={styles.badgeFailed}><XCircle size={10} /> Failed</span>}
                          {sub.passed === null  && <span className={styles.badgePending}>Pending</span>}
                        </td>
                        <td>
                          <span className={styles.statusChip}>
                            {sub.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Notifications ── */}
        {activeTab === "notifications" && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}><Bell size={14} /></span>
                Notifications Sent
              </span>
              <Link href={`/admin/notifications?student=${id}`} className={styles.cardAction}>
                <Send size={12} /> Send New
              </Link>
            </div>

            {notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><Bell size={20} color="var(--text-muted)" /></div>
                <p className={styles.emptyTitle}>No notifications sent</p>
                <p className={styles.emptySub}>Send a notification to keep this student informed.</p>
              </div>
            ) : (
              <div className={styles.notifList}>
                {notifications.map((n) => (
                  <div key={n.id} className={`${styles.notifItem} ${!n.is_read ? styles.notifUnread : ""}`}>
                    <div className={`${styles.notifDot} ${n.is_read ? styles.notifDotRead : styles.notifDotUnread}`} />
                    <div className={styles.notifContent}>
                      <div className={styles.notifHeader}>
                        <span className={styles.notifTitle}>{n.title ?? "—"}</span>
                        <span className={`${styles.notifTypeBadge} ${
                          n.type === "exam"   ? styles.typeExam   :
                          n.type === "result" ? styles.typeResult :
                                               styles.typeGeneral
                        }`}>{n.type ?? "general"}</span>
                        {!n.is_read && <span className={styles.newTag}>New</span>}
                      </div>
                      <p className={styles.notifMsg}>{n.message ?? "—"}</p>
                      <span className={styles.notifTime}><Clock size={10} /> {formatDateTime(n.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}