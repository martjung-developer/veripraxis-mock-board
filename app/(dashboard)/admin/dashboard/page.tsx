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
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: "var(--c-skeleton-base)",
      animation: "shimmer 1.5s infinite linear",
      backgroundImage: "linear-gradient(90deg, var(--c-skeleton-base) 25%, var(--c-skeleton-shine) 50%, var(--c-skeleton-base) 75%)",
      backgroundSize: "200% 100%",
    }} />
  );
}

function Badge({ passed }: { passed: boolean | null }) {
  if (passed === true)  return <span style={badgeStyle("#dcfce7","#15803d")}>Passed</span>;
  if (passed === false) return <span style={badgeStyle("#fef2f2","#dc2626")}>Failed</span>;
  return <span style={badgeStyle("#fef9c3","#b45309")}>Pending</span>;
}
function badgeStyle(bg: string, color: string) {
  return {
    display: "inline-block",
    padding: "2px 9px",
    borderRadius: 20,
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.03em",
    background: bg,
    color,
  } as React.CSSProperties;
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
      sub: "submitted your exams", href: "/faculty/students",
      empty: stats.assignedStudents === 0,
    },
    {
      Icon: ClipboardList, bg: "#f0fdf4", color: "#059669",
      label: "Mock Exams",         value: String(stats.publishedExams),
      sub: "published",            href: "/faculty/exams",
      empty: stats.publishedExams === 0,
    },
    {
      Icon: BookOpen,      bg: "#fffbeb", color: "#d97706",
      label: "Practice Exams",     value: String(stats.practiceExams),
      sub: "published",            href: "/faculty/practice-exams",
      empty: stats.practiceExams === 0,
    },
    {
      Icon: PenLine,       bg: "#fef2f2", color: "#dc2626",
      label: "Pending Grading",    value: String(stats.pendingGrading),
      sub: "awaiting your review", href: "/faculty/grading",
      empty: stats.pendingGrading === 0,
      urgent: stats.pendingGrading > 0,
    },
    {
      Icon: BarChart2,     bg: "#f5f3ff", color: "#7c3aed",
      label: "Avg Score",          value: stats.avgScore !== null ? `${stats.avgScore}%` : "—",
      sub: "across all submissions",href: "/faculty/analytics",
      empty: stats.avgScore === null,
    },
    {
      Icon: Award,         bg: "#ecfeff", color: "#0891b2",
      label: "Pass Rate",          value: stats.passRate !== null ? `${stats.passRate}%` : "—",
      sub: `${stats.totalSubmissions} total submissions`, href: "/faculty/analytics",
      empty: stats.passRate === null,
    },
  ];

  const QUICK_ACTIONS = [
    { Icon: Plus,         bg: "#eff6ff", color: "#2563eb", label: "Create Exam",       sub: "New mock exam",          href: "/faculty/exams/create"          },
    { Icon: Upload,       bg: "#f0fdf4", color: "#059669", label: "Upload Questions",  sub: "Import by program",      href: "/faculty/questions/upload"       },
    { Icon: Send,         bg: "#fffbeb", color: "#d97706", label: "Assign Exam",       sub: "Send to students",       href: "/faculty/exams/assign"           },
    { Icon: Key,          bg: "#fef2f2", color: "#dc2626", label: "Set Answer Key",    sub: "Score an exam",          href: "/faculty/questions/answer-keys"  },
    { Icon: PenLine,      bg: "#f5f3ff", color: "#7c3aed", label: "Grade Submissions", sub: "Review answers",         href: "/faculty/grading"                },
    { Icon: FileText,     bg: "#ecfeff", color: "#0891b2", label: "Add Practice Exam", sub: "Upload study material",  href: "/faculty/practice-exams/create"  },
  ];

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <>
      {/* ── Injected styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

        :root {
          --c-bg:           #f5f7fa;
          --c-surface:      #ffffff;
          --c-border:       #e8edf3;
          --c-border-soft:  #f0f4f8;
          --c-text:         #0f1c2e;
          --c-text-sub:     #4b5a6b;
          --c-text-muted:   #94a3b8;
          --c-primary:      #1a56db;
          --c-primary-dark: #1344b8;
          --c-success:      #059669;
          --c-warning:      #d97706;
          --c-danger:       #dc2626;
          --c-accent:       #7c3aed;
          --c-skeleton-base:  #eef2f7;
          --c-skeleton-shine: #f8fafc;
          --font-head: 'Sora', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --radius-card: 14px;
          --radius-btn:  9px;
          --shadow-card: 0 1px 3px rgba(15,28,46,0.06), 0 4px 16px rgba(15,28,46,0.05);
          --shadow-hover: 0 4px 20px rgba(15,28,46,0.1);
        }

        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.3); }
          50%       { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
        }

        .fac-page {
          font-family: var(--font-body);
          background: var(--c-bg);
          min-height: 100vh;
          padding: 1.75rem 2rem 3rem;
          color: var(--c-text);
          animation: fadeUp 0.35s ease both;
        }

        /* ── Header ── */
        .fac-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }
        .fac-greeting {
          font-family: var(--font-head);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--c-text);
          margin: 0 0 0.2rem;
          letter-spacing: -0.01em;
        }
        .fac-greeting-sub {
          font-size: 0.82rem;
          color: var(--c-text-sub);
          margin: 0;
        }
        .fac-header-actions {
          display: flex;
          gap: 0.65rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-btn);
          border: 1.5px solid var(--c-border);
          background: var(--c-surface);
          color: var(--c-text-sub);
          font-family: var(--font-body);
          font-size: 0.8rem; font-weight: 600;
          text-decoration: none; cursor: pointer;
          transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
        }
        .btn-secondary:hover { border-color: var(--c-primary); color: var(--c-primary); box-shadow: var(--shadow-hover); }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1.1rem;
          border-radius: var(--radius-btn);
          border: none;
          background: var(--c-primary);
          color: #fff;
          font-family: var(--font-body);
          font-size: 0.8rem; font-weight: 600;
          text-decoration: none; cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .btn-primary:hover { background: var(--c-primary-dark); box-shadow: 0 4px 14px rgba(26,86,219,0.35); }
        .btn-danger {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1.1rem;
          border-radius: var(--radius-btn);
          border: none;
          background: var(--c-danger);
          color: #fff;
          font-family: var(--font-body);
          font-size: 0.8rem; font-weight: 600;
          text-decoration: none;
          animation: pulseRing 2s infinite;
        }
        .btn-danger:hover { background: #b91c1c; }

        /* ── Hero banner ── */
        .fac-hero {
          background: linear-gradient(135deg, #0f2656 0%, #1a56db 55%, #2563eb 100%);
          border-radius: 18px;
          padding: 2rem 2.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 1.75rem;
          position: relative;
          overflow: hidden;
        }
        .fac-hero::before {
          content: "";
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
        }
        .fac-hero-content { position: relative; z-index: 1; }
        .fac-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.65);
          margin-bottom: 0.65rem;
        }
        .fac-hero-title {
          font-family: var(--font-head);
          font-size: 1.55rem; font-weight: 700;
          color: #fff; line-height: 1.25;
          margin: 0 0 0.65rem;
          letter-spacing: -0.02em;
        }
        .fac-hero-sub {
          font-size: 0.82rem; color: rgba(255,255,255,0.72);
          margin: 0 0 1.25rem;
          max-width: 460px;
          line-height: 1.6;
        }
        .fac-hero-actions { display: flex; gap: 0.65rem; flex-wrap: wrap; }
        .hero-btn-outline {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-btn);
          border: 1.5px solid rgba(255,255,255,0.35);
          background: transparent; color: #fff;
          font-family: var(--font-body); font-size: 0.78rem; font-weight: 600;
          text-decoration: none;
          transition: background 0.15s;
        }
        .hero-btn-outline:hover { background: rgba(255,255,255,0.12); }
        .hero-btn-white {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-btn);
          border: none; background: #fff;
          color: var(--c-primary);
          font-family: var(--font-body); font-size: 0.78rem; font-weight: 700;
          text-decoration: none;
          transition: box-shadow 0.15s;
        }
        .hero-btn-white:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
        .fac-hero-emoji {
          font-size: 5rem; line-height: 1;
          opacity: 0.9;
          position: relative; z-index: 1;
          flex-shrink: 0;
        }

        /* ── Urgent alert strip ── */
        .fac-urgent {
          display: flex; align-items: center; gap: 0.75rem;
          background: #fff7ed;
          border: 1.5px solid #fed7aa;
          border-radius: 12px;
          padding: 0.85rem 1.1rem;
          margin-bottom: 1.5rem;
          font-size: 0.82rem;
        }
        .fac-urgent-icon { color: var(--c-warning); flex-shrink: 0; }
        .fac-urgent-text { color: #92400e; flex: 1; font-weight: 500; }
        .fac-urgent-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-weight: 700; color: var(--c-warning); text-decoration: none; font-size: 0.78rem;
        }
        .fac-urgent-link:hover { text-decoration: underline; }

        /* ── Stat cards ── */
        .fac-stats {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 1rem;
          margin-bottom: 1.75rem;
        }
        .fac-stat-card {
          background: var(--c-surface);
          border: 1.5px solid var(--c-border);
          border-radius: var(--radius-card);
          padding: 1.15rem 1.25rem 1rem;
          box-shadow: var(--shadow-card);
          text-decoration: none; color: inherit;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          display: block;
          position: relative;
          overflow: hidden;
        }
        .fac-stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); border-color: #d0dce8; }
        .fac-stat-card.urgent { border-color: #fca5a5; }
        .fac-stat-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.9rem; }
        .fac-stat-icon {
          width: 36px; height: 36px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .fac-stat-value {
          font-family: var(--font-head);
          font-size: 1.75rem; font-weight: 700;
          color: var(--c-text);
          line-height: 1; margin-bottom: 0.25rem;
        }
        .fac-stat-value.empty { color: var(--c-text-muted); }
        .fac-stat-label { font-size: 0.77rem; font-weight: 600; color: var(--c-text-sub); margin-bottom: 0.15rem; }
        .fac-stat-sub   { font-size: 0.7rem; color: var(--c-text-muted); }
        .fac-stat-urgent-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--c-danger);
          animation: pulseRing 1.8s infinite;
        }

        /* ── Two-column rows ── */
        .fac-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
        .fac-row-3 { display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
        @media (max-width: 900px) {
          .fac-row, .fac-row-3 { grid-template-columns: 1fr; }
        }

        /* ── Card ── */
        .fac-card {
          background: var(--c-surface);
          border: 1.5px solid var(--c-border);
          border-radius: var(--radius-card);
          padding: 1.25rem 1.4rem;
          box-shadow: var(--shadow-card);
        }
        .fac-card-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.1rem;
        }
        .fac-card-title {
          display: flex; align-items: center; gap: 7px;
          font-family: var(--font-head);
          font-size: 0.9rem; font-weight: 700; color: var(--c-text);
        }
        .fac-card-title-icon {
          width: 26px; height: 26px; border-radius: 7px;
          background: #f0f4f8;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .view-all {
          font-size: 0.75rem; font-weight: 600; color: var(--c-primary);
          text-decoration: none;
        }
        .view-all:hover { text-decoration: underline; }
        .card-hint { font-size: 0.7rem; color: var(--c-text-muted); }

        /* ── Table ── */
        .fac-table-wrap { overflow-x: auto; }
        .fac-table {
          width: 100%; border-collapse: collapse;
          font-size: 0.79rem;
        }
        .fac-table thead tr { border-bottom: 1.5px solid var(--c-border-soft); }
        .fac-table th {
          text-align: left; padding: 0 0.75rem 0.6rem;
          font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--c-text-muted);
        }
        .fac-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--c-border-soft); vertical-align: middle; }
        .fac-table tbody tr:last-child td { border-bottom: none; }
        .fac-table tbody tr:hover td { background: #f9fbfd; }
        .cell-name { font-weight: 600; color: var(--c-text); font-size: 0.8rem; }
        .cell-sub  { font-size: 0.72rem; color: var(--c-text-sub); margin-top: 1px; }
        .cell-exam { font-weight: 500; color: var(--c-text-sub); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cell-time { font-size: 0.7rem; color: var(--c-text-muted); }
        .grade-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 20px;
          background: var(--c-primary); color: #fff;
          font-size: 0.68rem; font-weight: 700;
          text-decoration: none;
          transition: background 0.13s;
        }
        .grade-btn:hover { background: var(--c-primary-dark); }

        /* ── Quick actions grid ── */
        .fac-quick-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;
        }
        .fac-quick-action {
          display: flex; align-items: center; gap: 0.7rem;
          padding: 0.7rem 0.85rem;
          border: 1.5px solid var(--c-border-soft);
          border-radius: 11px;
          text-decoration: none; color: inherit;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
          background: var(--c-bg);
        }
        .fac-quick-action:hover { border-color: #c8d9ea; box-shadow: var(--shadow-hover); transform: translateY(-1px); }
        .fac-quick-icon {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .fac-quick-label { font-size: 0.78rem; font-weight: 700; color: var(--c-text); }
        .fac-quick-sub   { font-size: 0.68rem; color: var(--c-text-muted); }

        /* ── Answer keys needed list ── */
        .key-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.7rem 0;
          border-bottom: 1px solid var(--c-border-soft);
        }
        .key-item:last-child { border-bottom: none; }
        .key-item-left { display: flex; align-items: center; gap: 0.6rem; }
        .key-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--c-warning); flex-shrink: 0;
        }
        .key-title { font-size: 0.8rem; font-weight: 600; color: var(--c-text); }
        .key-meta  { font-size: 0.7rem; color: var(--c-text-muted); }
        .key-link  {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 0.72rem; font-weight: 700; color: var(--c-primary); text-decoration: none;
        }
        .key-link:hover { text-decoration: underline; }

        /* ── Activity feed ── */
        .fac-activity { display: flex; flex-direction: column; gap: 0; }
        .fac-activity-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.65rem 0;
          border-bottom: 1px solid var(--c-border-soft);
        }
        .fac-activity-item:last-child { border-bottom: none; }
        .fac-act-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
        }
        .fac-act-label { font-size: 0.8rem; font-weight: 600; color: var(--c-text); }
        .fac-act-sub   { font-size: 0.7rem; color: var(--c-text-sub); }
        .fac-act-time  {
          display: flex; align-items: center; gap: 3px;
          font-size: 0.68rem; color: var(--c-text-muted);
          margin-left: auto; flex-shrink: 0;
        }

        /* ── Empty state ── */
        .fac-empty {
          display: flex; flex-direction: column; align-items: center;
          padding: 2rem 1rem; text-align: center;
        }
        .fac-empty-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: var(--c-bg);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.75rem;
        }
        .fac-empty-title { font-size: 0.85rem; font-weight: 700; color: var(--c-text-sub); margin: 0 0 0.25rem; }
        .fac-empty-sub   { font-size: 0.75rem; color: var(--c-text-muted); margin: 0; }

        /* ── Progress bars ── */
        .prog-item { margin-bottom: 1rem; }
        .prog-item:last-child { margin-bottom: 0; }
        .prog-top { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .prog-name { font-size: 0.77rem; font-weight: 600; color: var(--c-text-sub); }
        .prog-pct  { font-size: 0.77rem; font-weight: 700; color: var(--c-text); }
        .prog-track { height: 7px; background: var(--c-border-soft); border-radius: 10px; overflow: hidden; }
        .prog-fill  { height: 100%; border-radius: 10px; transition: width 1s cubic-bezier(0.34,1.56,0.64,1); }
        .prog-fill.blue  { background: linear-gradient(90deg, #60a5fa, #2563eb); }
        .prog-fill.green { background: linear-gradient(90deg, #34d399, #059669); }
        .prog-fill.amber { background: linear-gradient(90deg, #fbbf24, #d97706); }

        /* ── Score chip ── */
        .score-chip { font-size: 0.8rem; font-weight: 700; }
      `}</style>

      <div className="fac-page">

        {/* ── Header ── */}
        <div className="fac-header">
          <div>
            <h1 className="fac-greeting">{getGreeting()}, {facultyName ?? "Faculty"} 👋</h1>
            <p className="fac-greeting-sub">Faculty overview — exams, grading, and student progress.</p>
          </div>
          <div className="fac-header-actions">
            <Link href="/faculty/grading" className="btn-secondary">
              <PenLine size={13} /> Grade Submissions
            </Link>
            <Link href="/faculty/exams/assign" className="btn-secondary">
              <Send size={13} /> Assign Exam
            </Link>
            <Link href="/faculty/exams/create" className="btn-primary">
              <Plus size={13} /> Create Exam
            </Link>
          </div>
        </div>

        {/* ── Urgent alert: pending grading ── */}
        {!loading && stats.pendingGrading > 0 && (
          <div className="fac-urgent">
            <AlertCircle size={16} className="fac-urgent-icon" />
            <span className="fac-urgent-text">
              <strong>{stats.pendingGrading} submission{stats.pendingGrading > 1 ? "s" : ""}</strong> waiting for your review and grading.
            </span>
            <Link href="/faculty/grading" className="fac-urgent-link">
              Grade now <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* ── Hero ── */}
        <div className="fac-hero">
          <div className="fac-hero-content">
            <p className="fac-hero-eyebrow">
              <Activity size={10} /> Faculty Control Panel
            </p>
            <h2 className="fac-hero-title">
              Assign, grade, and guide<br />your students to success.
            </h2>
            <p className="fac-hero-sub">
              Upload question banks by degree program, set answer keys,
              assign mock and practice exams, and track every student&apos;s performance — all in one place.
            </p>
            <div className="fac-hero-actions">
              <Link href="/faculty/questions/upload" className="hero-btn-outline">
                <Upload size={12} /> Upload Questions
              </Link>
              <Link href="/faculty/exams/assign" className="hero-btn-outline">
                <Send size={12} /> Assign to Students
              </Link>
              <Link href="/faculty/analytics" className="hero-btn-white">
                View Analytics <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          <div className="fac-hero-emoji">📋</div>
        </div>

        {/* ── Stat cards ── */}
        <div className="fac-stats">
          {STAT_CARDS.map((card) => (
            <Link key={card.label} href={card.href} className={`fac-stat-card${(card as { urgent?: boolean }).urgent ? " urgent" : ""}`}>
              <div className="fac-stat-top">
                <div className="fac-stat-icon" style={{ background: card.bg }}>
                  <card.Icon size={17} color={card.color} strokeWidth={2} />
                </div>
                {(card as { urgent?: boolean }).urgent
                  ? <div className="fac-stat-urgent-dot" />
                  : <span style={{ fontSize: "0.68rem", color: "var(--c-text-muted)" }}>—</span>
                }
              </div>
              {loading
                ? <Skeleton w="55%" h={30} />
                : <div className={`fac-stat-value${card.empty ? " empty" : ""}`}>{card.value}</div>
              }
              <div className="fac-stat-label">{card.label}</div>
              <div className="fac-stat-sub">{card.sub}</div>
            </Link>
          ))}
        </div>

        {/* ── Row 1: Pending grading table + Quick actions ── */}
        <div className="fac-row">

          {/* Pending submissions */}
          <div className="fac-card">
            <div className="fac-card-head">
              <span className="fac-card-title">
                <span className="fac-card-title-icon"><PenLine size={13} color="#1e3a5f" /></span>
                Needs Grading
              </span>
              <Link href="/faculty/grading" className="view-all">View all →</Link>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[0,1,2,3].map((i) => <Skeleton key={i} />)}
              </div>
            ) : pendingSubs.length === 0 ? (
              <div className="fac-empty">
                <div className="fac-empty-icon"><CheckCircle2 size={20} color="#94a3b8" strokeWidth={1.5} /></div>
                <p className="fac-empty-title">All caught up!</p>
                <p className="fac-empty-sub">No submissions pending review.</p>
              </div>
            ) : (
              <div className="fac-table-wrap">
                <table className="fac-table">
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
                        <td><p className="cell-name">{row.student_name}</p></td>
                        <td><p className="cell-exam">{row.exam_title}</p></td>
                        <td>
                          <span className="score-chip" style={{ color: scoreColor(row.percentage) }}>
                            {row.percentage !== null ? `${row.percentage}%` : "—"}
                          </span>
                        </td>
                        <td><Badge passed={row.passed} /></td>
                        <td><span className="cell-time">{timeAgo(row.submitted_at)}</span></td>
                        <td>
                          <Link href={`/faculty/grading/${row.id}`} className="grade-btn">
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
          <div className="fac-card">
            <div className="fac-card-head">
              <span className="fac-card-title">
                <span className="fac-card-title-icon"><Activity size={13} color="#1e3a5f" /></span>
                Quick Actions
              </span>
            </div>
            <div className="fac-quick-grid">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.label} href={a.href} className="fac-quick-action">
                  <div className="fac-quick-icon" style={{ background: a.bg }}>
                    <a.Icon size={15} color={a.color} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="fac-quick-label">{a.label}</div>
                    <div className="fac-quick-sub">{a.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 2: Exams missing answer keys + Recent activity + Overview ── */}
        <div className="fac-row">

          {/* Answer keys needed */}
          <div className="fac-card">
            <div className="fac-card-head">
              <span className="fac-card-title">
                <span className="fac-card-title-icon"><Key size={13} color="#1e3a5f" /></span>
                Answer Keys Needed
              </span>
              <Link href="/faculty/questions/answer-keys" className="view-all">Manage →</Link>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[0,1,2].map((i) => <Skeleton key={i} w="80%" />)}
              </div>
            ) : examsNeedingKey.length === 0 ? (
              <div className="fac-empty">
                <div className="fac-empty-icon"><Key size={20} color="#94a3b8" strokeWidth={1.5} /></div>
                <p className="fac-empty-title">All answer keys set</p>
                <p className="fac-empty-sub">Every exam has a complete answer key.</p>
              </div>
            ) : (
              examsNeedingKey.map((exam) => (
                <div key={exam.id} className="key-item">
                  <div className="key-item-left">
                    <div className="key-dot" />
                    <div>
                      <div className="key-title">{exam.title.length > 36 ? exam.title.slice(0, 36) + "…" : exam.title}</div>
                      <div className="key-meta">{exam.question_count} question{exam.question_count !== 1 ? "s" : ""} · {exam.total_points} pts</div>
                    </div>
                  </div>
                  <Link href={`/faculty/exams/${exam.id}/answer-key`} className="key-link">
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
              <Link href="/faculty/questions/upload" className="btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: "0.76rem" }}>
                <Upload size={12} /> Upload Question Bank
              </Link>
              <Link href="/faculty/exams/create" className="btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: "0.76rem" }}>
                <Plus size={12} /> New Exam
              </Link>
            </div>
          </div>

          {/* Recent activity + platform overview stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Recent activity */}
            <div className="fac-card">
              <div className="fac-card-head">
                <span className="fac-card-title">
                  <span className="fac-card-title-icon"><Layers size={13} color="#1e3a5f" /></span>
                  Recent Activity
                </span>
                <span className="card-hint">live</span>
              </div>

              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {[0,1,2,3].map((i) => <Skeleton key={i} w="90%" />)}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="fac-empty" style={{ padding: "1rem" }}>
                  <p className="fac-empty-title">No activity yet</p>
                  <p className="fac-empty-sub">Start by creating or assigning an exam.</p>
                </div>
              ) : (
                <div className="fac-activity">
                  {recentActivity.map((item) => {
                    const dotColor: Record<RecentActivity["type"], string> = {
                      published: "#2563eb", assigned: "#059669",
                      graded: "#7c3aed", uploaded: "#d97706",
                    };
                    return (
                      <div key={item.id} className="fac-activity-item">
                        <div className="fac-act-dot" style={{ background: dotColor[item.type] }} />
                        <div style={{ flex: 1 }}>
                          <div className="fac-act-label">{item.label}</div>
                          <div className="fac-act-sub">{item.sub}</div>
                        </div>
                        <div className="fac-act-time">
                          <Clock size={9} /> {timeAgo(item.time)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Performance overview */}
            <div className="fac-card">
              <div className="fac-card-head">
                <span className="fac-card-title">
                  <span className="fac-card-title-icon"><TrendingUp size={13} color="#1e3a5f" /></span>
                  Performance Overview
                </span>
              </div>
              {[
                { label: "Pass Rate",         pct: stats.passRate ?? 0,   variant: "green" },
                { label: "Avg Score",         pct: stats.avgScore ?? 0,   variant: "blue"  },
                { label: "Exams Published",   pct: stats.publishedExams > 0 ? Math.min(stats.publishedExams * 10, 100) : 0, variant: "amber" },
              ].map((p) => (
                <div key={p.label} className="prog-item">
                  <div className="prog-top">
                    <span className="prog-name">{p.label}</span>
                    <span className="prog-pct">{p.pct}%</span>
                  </div>
                  <div className="prog-track">
                    <div
                      className={`prog-fill ${p.variant}`}
                      style={{ width: mounted ? `${p.pct}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}

              {/* Nav links */}
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem" }}>
                {[
                  { label: "Programs",  Icon: GraduationCap, color: "#ec4899", href: "/faculty/programs"  },
                  { label: "Analytics", Icon: BarChart2,     color: "#0891b2", href: "/faculty/analytics" },
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
    </>
  );
}