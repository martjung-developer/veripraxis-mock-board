// app/(dashboard)/faculty/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList, BookOpen, BarChart2,
  Plus, FileText, GraduationCap, CheckCircle2,
  Clock, ArrowRight, Activity, UserCheck, Award,
  Upload, Key, Send, AlertCircle, ChevronRight,
  Layers, PenLine, TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./dashboard.module.css";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface FacultyStats {
  assignedStudents:   number;
  publishedExams:     number;
  practiceExams:      number;
  pendingGrading:     number;
  passRate:           number | null;
  avgScore:           number | null;
  totalSubmissions:   number;
}

interface PendingSubmission {
  id:           string;
  student_name: string;
  exam_title:   string;
  submitted_at: string | null;
  status:       string;
  percentage:   number | null;
  passed:       boolean | null;
}

interface RecentActivity {
  id:         string;
  type:       "assigned" | "graded" | "uploaded" | "published";
  label:      string;
  sub:        string;
  time:       string | null;
}

interface ExamNeedingKey {
  id:    string;
  title: string;
  total_points: number;
  question_count: number;
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function scoreColor(pct: number | null): string {
  if (pct === null) return "var(--c-text-muted)";
  if (pct >= 75) return "var(--c-success)";
  if (pct >= 50) return "var(--c-warning)";
  return "var(--c-danger)";
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
function Skeleton({ w = "100%", h = 13 }: { w?: string; h?: number }) {
  return (
    <div
      className={styles.skeleton}
      style={{ width: w, height: h }}
    />
  );
}

function Badge({ passed }: { passed: boolean | null }) {
  if (passed === true)  return <span className={styles.badgePassed}>Passed</span>;
  if (passed === false) return <span className={styles.badgeFailed}>Failed</span>;
  return <span className={styles.badgePending}>Pending</span>;
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function FacultyDashboardPage() {
  const supabase = createClient();

  const [facultyName,   setFacultyName]   = useState<string | null>(null);
  const [facultyId,     setFacultyId]     = useState<string | null>(null);
  const [stats,         setStats]         = useState<FacultyStats>({
    assignedStudents: 0, publishedExams: 0, practiceExams: 0,
    pendingGrading: 0, passRate: null, avgScore: null, totalSubmissions: 0,
  });
  const [pendingSubs,   setPendingSubs]   = useState<PendingSubmission[]>([]);
  const [recentActivity,setRecentActivity]= useState<RecentActivity[]>([]);
  const [examsNeedingKey,setExamsNeedingKey] = useState<ExamNeedingKey[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [mounted,       setMounted]       = useState(false);

  const fetchDashboard = useCallback(async (fid: string) => {
    /* ── 1. Exams created by this faculty ── */
    const { data: myExams } = await supabase
      .from("exams")
      .select("id, title, is_published, total_points")
      .eq("created_by", fid);

    const myExamIds = (myExams ?? []).map((e: { id: string; title: string; is_published: boolean; total_points: number }) => e.id);
    const publishedCount = (myExams ?? []).filter((e: { id: string; title: string; is_published: boolean; total_points: number }) => e.is_published).length;

    /* ── 2. Practice exams by this faculty ── */
    const { count: practiceCount } = await supabase
      .from("practice_exams")
      .select("id", { count: "exact", head: true })
      .eq("created_by", fid)
      .eq("is_published", true);

    /* ── 3. Submissions for faculty's exams ── */
    let pendingGrading = 0;
    let passRate: number | null = null;
    let avgScore: number | null = null;
    let totalSubmissions = 0;
    let rawPending: PendingSubmission[] = [];

    if (myExamIds.length > 0) {
      const { data: allSubs } = await supabase
        .from("submissions")
        .select("id, student_id, exam_id, status, percentage, passed, submitted_at")
        .in("exam_id", myExamIds)
        .in("status", ["submitted", "graded"])
        .order("submitted_at", { ascending: false });

      const subs = (allSubs ?? []) as Array<{ id: string; student_id: string | null; exam_id: string | null; status: string; percentage: number | null; passed: boolean | null; submitted_at: string | null }>;
      totalSubmissions = subs.length;
      pendingGrading   = subs.filter((s: typeof subs[0]) => s.status === "submitted").length;

      const scores = subs.map((s: typeof subs[0]) => s.percentage).filter((v): v is number => v !== null);
      const passed = subs.filter((s: typeof subs[0]) => s.passed === true).length;
      if (subs.length > 0) passRate = Math.round((passed / subs.length) * 100);
      if (scores.length > 0) avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);

      /* pending grading — latest 5 "submitted" (not yet graded) */
      const pending5 = subs.filter((s: typeof subs[0]) => s.status === "submitted").slice(0, 5);
      if (pending5.length > 0) {
        const studentIds = [...new Set(pending5.map((s: typeof subs[0]) => s.student_id).filter(Boolean))] as string[];
        const examIds    = [...new Set(pending5.map((s: typeof subs[0]) => s.exam_id).filter(Boolean))]    as string[];
        const [profRes, examRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", studentIds),
          supabase.from("exams").select("id, title").in("id", examIds),
        ]);
        const profMap = new Map((profRes.data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Unknown"]));
        const examMap = new Map((examRes.data ?? []).map((e: { id: string; title: string }) => [e.id, e.title]));
        rawPending = pending5.map((r: typeof subs[0]) => ({
          id:           r.id,
          student_name: profMap.get(r.student_id ?? "") ?? "Unknown",
          exam_title:   examMap.get(r.exam_id    ?? "") ?? "Unknown Exam",
          submitted_at: r.submitted_at,
          status:       r.status,
          percentage:   r.percentage !== null ? Math.round(r.percentage) : null,
          passed:       r.passed,
        }));
      }
    }
    setPendingSubs(rawPending);

    /* ── 4. Exams missing answer keys (no questions with correct_answer) ── */
    let examsNeedingKeys: ExamNeedingKey[] = [];
    if (myExamIds.length > 0) {
      const { data: qRows } = await supabase
        .from("questions")
        .select("exam_id, correct_answer")
        .in("exam_id", myExamIds);

      const examQMap: Record<string, { total: number; withKey: number }> = {};
      (qRows ?? []).forEach((q: { exam_id: string | null; correct_answer: string | null }) => {
        if (!q.exam_id) return;
        if (!examQMap[q.exam_id]) examQMap[q.exam_id] = { total: 0, withKey: 0 };
        examQMap[q.exam_id].total++;
        if (q.correct_answer) examQMap[q.exam_id].withKey++;
      });

      examsNeedingKeys = (myExams ?? [])
        .filter((e: { id: string; title: string; is_published: boolean; total_points: number }) => {
          const q = examQMap[e.id];
          return !q || q.withKey < q.total;
        })
        .slice(0, 3)
        .map((e: { id: string; title: string; is_published: boolean; total_points: number }) => ({
          id: e.id, title: e.title, total_points: e.total_points,
          question_count: examQMap[e.id]?.total ?? 0,
        }));
    }
    setExamsNeedingKey(examsNeedingKeys);

    /* ── 5. Assigned students (students who have taken faculty's exams) ── */
    let assignedStudents = 0;
    if (myExamIds.length > 0) {
      const { count } = await supabase
        .from("submissions")
        .select("student_id", { count: "exact", head: true })
        .in("exam_id", myExamIds);
      assignedStudents = count ?? 0;
    }

    /* ── 6. Recent activity feed ── */
    const activity: RecentActivity[] = [];
    if (myExams && myExams.length > 0) {
      myExams.slice(0, 2).forEach((e: { id: string; title: string; is_published: boolean; total_points: number }) => {
        activity.push({ id: e.id, type: "published", label: e.title, sub: "Exam published", time: null });
      });
    }
    if (rawPending.length > 0) {
      rawPending.slice(0, 2).forEach((s) => {
        activity.push({ id: s.id, type: "assigned", label: s.student_name, sub: `Submitted ${s.exam_title}`, time: s.submitted_at });
      });
    }
    setRecentActivity(activity.slice(0, 5));

    setStats({
      assignedStudents,
      publishedExams:   publishedCount,
      practiceExams:    practiceCount ?? 0,
      pendingGrading,
      passRate,
      avgScore,
      totalSubmissions,
    });

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setFacultyId(auth.user.id);
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", auth.user.id).single() as { data: { full_name: string | null } | null };
      setFacultyName(profile?.full_name ?? "Faculty");
      await fetchDashboard(auth.user.id);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Stat card data ─── */
  const STAT_CARDS = [
    {
      Icon: UserCheck,    bg: "#eff6ff", color: "#2563eb",
      label: "Students Reached",  value: String(stats.assignedStudents),
      sub: "submitted your exams", href: "/admin/students",
      empty: stats.assignedStudents === 0,
    },
    {
      Icon: ClipboardList, bg: "#f0fdf4", color: "#059669",
      label: "Mock Exams",         value: String(stats.publishedExams),
      sub: "published",            href: "/admin/exams",
      empty: stats.publishedExams === 0,
    },
    {
      Icon: BookOpen,      bg: "#fffbeb", color: "#d97706",
      label: "Practice Exams",     value: String(stats.practiceExams),
      sub: "published",            href: "/admin/practice-exams",
      empty: stats.practiceExams === 0,
    },
    {
      Icon: PenLine,       bg: "#fef2f2", color: "#dc2626",
      label: "Pending Grading",    value: String(stats.pendingGrading),
      sub: "awaiting your review", href: "/admin/grading",
      empty: stats.pendingGrading === 0,
      urgent: stats.pendingGrading > 0,
    },
    {
      Icon: BarChart2,     bg: "#f5f3ff", color: "#7c3aed",
      label: "Avg Score",          value: stats.avgScore !== null ? `${stats.avgScore}%` : "—",
      sub: "across all submissions",href: "/admin/analytics",
      empty: stats.avgScore === null,
    },
    {
      Icon: Award,         bg: "#ecfeff", color: "#0891b2",
      label: "Pass Rate",          value: stats.passRate !== null ? `${stats.passRate}%` : "—",
      sub: `${stats.totalSubmissions} total submissions`, href: "/admin/analytics",
      empty: stats.passRate === null,
    },
  ];

  const QUICK_ACTIONS = [
    { Icon: Plus,         bg: "#eff6ff", color: "#2563eb", label: "Create Exam",       sub: "New mock exam",          href: "/admin/exams/create"          },
    { Icon: Upload,       bg: "#f0fdf4", color: "#059669", label: "Upload Questions",  sub: "Import by program",      href: "/admin/questionnaires"       },
    { Icon: Send,         bg: "#fffbeb", color: "#d97706", label: "Assign Exam",       sub: "Send to students",       href: "/admin/exams"           },
    { Icon: Key,          bg: "#fef2f2", color: "#dc2626", label: "Set Answer Key",    sub: "Score an exam",          href: "/admin/questionnaires"  },
    { Icon: PenLine,      bg: "#f5f3ff", color: "#7c3aed", label: "Grade Submissions", sub: "Review answers",         href: "/admin/questionnaires"                },
    { Icon: FileText,     bg: "#ecfeff", color: "#0891b2", label: "Add Practice Exam", sub: "Upload practice exam",  href: "/admin/exams/create"  },
  ];

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{getGreeting()}, {facultyName ?? "Faculty"} </h1>
          <p className={styles.greetingSub}>Faculty overview of exams, grading, and student progress.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/exams" className={styles.btnSecondary}>
            <PenLine size={13} /> Grade Submissions
          </Link>
          <Link href="/admin/exams" className={styles.btnSecondary}>
            <Send size={13} /> Assign Exam
          </Link>
          <Link href="/admin/exams/create" className={styles.btnPrimary}>
            <Plus size={13} /> Create Exam
          </Link>
        </div>
      </div>

      {/* ── Urgent alert: pending grading ── */}
      {!loading && stats.pendingGrading > 0 && (
        <div className={styles.urgent}>
          <AlertCircle size={16} className={styles.urgentIcon} />
          <span className={styles.urgentText}>
            <strong>{stats.pendingGrading} submission{stats.pendingGrading > 1 ? "s" : ""}</strong> waiting for your review and grading.
          </span>
          <Link href="/admin/exams" className={styles.urgentLink}>
            Grade now <ChevronRight size={13} />
          </Link>
        </div>
      )}

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>
            <Activity size={10} /> Faculty Control Panel
          </p>
          <h2 className={styles.heroTitle}>
            Assign, grade, and guide<br />your students to success.
          </h2>
          <p className={styles.heroSub}>
            Upload question banks by degree program, set answer keys,
            assign mock and practice exams, and track every student&apos;s performance — all in one place.
          </p>
          <div className={styles.heroActions}>
            <Link href="/admin/exams" className={styles.heroBtnOutline}>
              <Upload size={12} /> Upload Questions
            </Link>
            <Link href="/admin/exams" className={styles.heroBtnOutline}>
              <Send size={12} /> Assign to Students
            </Link>
            <Link href="/admin/analytics" className={styles.heroBtnWhite}>
              View Analytics <ArrowRight size={12} />
            </Link>
          </div>
        </div>
        <div className={styles.heroEmoji}></div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsGrid}>
        {STAT_CARDS.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`${styles.statCard}${(card as { urgent?: boolean }).urgent ? ` ${styles.statCardUrgent}` : ""}`}
          >
            <div className={styles.statTop}>
              <div className={styles.statIcon} style={{ background: card.bg }}>
                <card.Icon size={17} color={card.color} strokeWidth={2} />
              </div>
              {(card as { urgent?: boolean }).urgent
                ? <div className={styles.statUrgentDot} />
                : <span style={{ fontSize: "0.68rem", color: "var(--c-text-muted)" }}>—</span>
              }
            </div>
            {loading
              ? <Skeleton w="55%" h={30} />
              : <div className={`${styles.statValue}${card.empty ? ` ${styles.statValueEmpty}` : ""}`}>{card.value}</div>
            }
            <div className={styles.statLabel}>{card.label}</div>
            <div className={styles.statSub}>{card.sub}</div>
          </Link>
        ))}
      </div>

      {/* ── Row 1: Pending grading table + Quick actions ── */}
      <div className={styles.row}>

        {/* Pending submissions */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}><PenLine size={13} color="#1e3a5f" /></span>
              Needs Grading
            </span>
            <Link href="/admin/exams" className={styles.viewAll}>View all →</Link>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[0,1,2,3].map((i) => <Skeleton key={i} />)}
            </div>
          ) : pendingSubs.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><CheckCircle2 size={20} color="#94a3b8" strokeWidth={1.5} /></div>
              <p className={styles.emptyTitle}>All caught up!</p>
              <p className={styles.emptySub}>No submissions pending review.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Exam</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSubs.map((row) => (
                    <tr key={row.id}>
                      <td><p className={styles.cellName}>{row.student_name}</p></td>
                      <td><p className={styles.cellExam}>{row.exam_title}</p></td>
                      <td>
                        <span className={styles.scoreChip} style={{ color: scoreColor(row.percentage) }}>
                          {row.percentage !== null ? `${row.percentage}%` : "—"}
                        </span>
                      </td>
                      <td><Badge passed={row.passed} /></td>
                      <td><span className={styles.cellTime}>{timeAgo(row.submitted_at)}</span></td>
                      <td>
                        <Link href={`/admin/grading/${row.id}`} className={styles.gradeBtn}>
                          Grade <ChevronRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}><Activity size={13} color="#1e3a5f" /></span>
              Quick Actions
            </span>
          </div>
          <div className={styles.quickGrid}>
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.label} href={a.href} className={styles.quickAction}>
                <div className={styles.quickIcon} style={{ background: a.bg }}>
                  <a.Icon size={15} color={a.color} strokeWidth={2} />
                </div>
                <div>
                  <div className={styles.quickLabel}>{a.label}</div>
                  <div className={styles.quickSub}>{a.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Exams missing answer keys + Recent activity + Overview ── */}
      <div className={styles.row}>

        {/* Answer keys needed */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}><Key size={13} color="#1e3a5f" /></span>
              Answer Keys Needed
            </span>
            <Link href="/admin/questions/answer-keys" className={styles.viewAll}>Manage →</Link>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[0,1,2].map((i) => <Skeleton key={i} w="80%" />)}
            </div>
          ) : examsNeedingKey.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><Key size={20} color="#94a3b8" strokeWidth={1.5} /></div>
              <p className={styles.emptyTitle}>All answer keys set</p>
              <p className={styles.emptySub}>Every exam has a complete answer key.</p>
            </div>
          ) : (
            examsNeedingKey.map((exam) => (
              <div key={exam.id} className={styles.keyItem}>
                <div className={styles.keyItemLeft}>
                  <div className={styles.keyDot} />
                  <div>
                    <div className={styles.keyTitle}>{exam.title.length > 36 ? exam.title.slice(0, 36) + "…" : exam.title}</div>
                    <div className={styles.keyMeta}>{exam.question_count} question{exam.question_count !== 1 ? "s" : ""} · {exam.total_points} pts</div>
                  </div>
                </div>
                <Link href={`/admin/exams/${exam.id}/answer-key`} className={styles.keyLink}>
                  Set key <ChevronRight size={12} />
                </Link>
              </div>
            ))
          )}

          {/* Upload questions CTA */}
          <div style={{
            marginTop: "1rem", paddingTop: "1rem",
            borderTop: "1px solid var(--c-border-soft)",
            display: "flex", gap: "0.65rem",
          }}>
            <Link href="/admin/questionnaires" className={styles.btnPrimary} style={{ flex: 1, justifyContent: "center", fontSize: "0.76rem" }}>
              <Upload size={12} /> Upload Question Bank
            </Link>
            <Link href="/admin/exams/create" className={styles.btnSecondary} style={{ flex: 1, justifyContent: "center", fontSize: "0.76rem" }}>
              <Plus size={12} /> New Exam
            </Link>
          </div>
        </div>

        {/* Recent activity + platform overview stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Recent activity */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}><Layers size={13} color="#1e3a5f" /></span>
                Recent Activity
              </span>
              <span className={styles.cardHint}>live</span>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[0,1,2,3].map((i) => <Skeleton key={i} w="90%" />)}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className={styles.empty} style={{ padding: "1rem" }}>
                <p className={styles.emptyTitle}>No activity yet</p>
                <p className={styles.emptySub}>Start by creating or assigning an exam.</p>
              </div>
            ) : (
              <div className={styles.activity}>
                {recentActivity.map((item) => {
                  const dotColor: Record<RecentActivity["type"], string> = {
                    published: "#2563eb", assigned: "#059669",
                    graded: "#7c3aed", uploaded: "#d97706",
                  };
                  return (
                    <div key={item.id} className={styles.activityItem}>
                      <div className={styles.actDot} style={{ background: dotColor[item.type] }} />
                      <div style={{ flex: 1 }}>
                        <div className={styles.actLabel}>{item.label}</div>
                        <div className={styles.actSub}>{item.sub}</div>
                      </div>
                      <div className={styles.actTime}>
                        <Clock size={9} /> {timeAgo(item.time)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Performance overview */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>
                <span className={styles.cardTitleIcon}><TrendingUp size={13} color="#1e3a5f" /></span>
                Performance Overview
              </span>
            </div>
            {[
              { label: "Pass Rate",       pct: stats.passRate ?? 0,   fillClass: styles.progGreen },
              { label: "Avg Score",       pct: stats.avgScore ?? 0,   fillClass: styles.progBlue  },
              { label: "Exams Published", pct: stats.publishedExams > 0 ? Math.min(stats.publishedExams * 10, 100) : 0, fillClass: styles.progAmber },
            ].map((p) => (
              <div key={p.label} className={styles.progItem}>
                <div className={styles.progTop}>
                  <span className={styles.progName}>{p.label}</span>
                  <span className={styles.progPct}>{p.pct}%</span>
                </div>
                <div className={styles.progTrack}>
                  <div
                    className={`${styles.progFill} ${p.fillClass}`}
                    style={{ width: mounted ? `${p.pct}%` : "0%" }}
                  />
                </div>
              </div>
            ))}

            {/* Nav links */}
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem" }}>
              {[
                { label: "Programs",  Icon: GraduationCap, color: "#ec4899", href: "/admin/programs"  },
                { label: "Analytics", Icon: BarChart2,     color: "#0891b2", href: "/admin/analytics" },
              ].map((item) => (
                <Link key={item.label} href={item.href} style={{
                  flex: 1, display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.55rem 0.75rem",
                  background: "var(--c-bg)", borderRadius: 9,
                  border: "1.5px solid var(--c-border-soft)",
                  textDecoration: "none",
                  transition: "border-color 0.15s",
                }}>
                  <item.Icon size={13} color={item.color} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--c-text)" }}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}