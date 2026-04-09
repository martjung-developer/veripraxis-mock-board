// app/(dashboard)/student/results/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, TrendingUp, Trophy, CheckCircle2,
  Clock, Search, X, ChevronLeft, ChevronRight,
  Eye, ClipboardList, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser }       from "@/lib/context/AuthContext";
import styles from "./results.module.css";

// ── Status constants ──────────────────────────────────────────────────────────
// Only 'released' submissions are shown to students.
// 'submitted' / 'graded' → shown in the pending banner, NOT in the table.
const RELEASED_STATUS = 'released' as const
const PENDING_STATUSES = ['submitted', 'graded'] as const

// ── Types ─────────────────────────────────────────────────────────────────────

type ExamTypeFilter = "all" | "mock" | "practice";
type StatusFilter   = "all" | "passed" | "failed";

interface ResultRow {
  id:                 string;
  exam_id:            string;
  exam_title:         string;
  exam_type:          "mock" | "practice";
  category:           string;
  score:              number | null;
  total_points:       number;
  percentage:         number | null;
  passed:             boolean | null;
  status:             string;
  time_spent_seconds: number | null;
  submitted_at:       string | null;
}
interface PendingRow {
  id:           string;
  exam_title:   string;
  submitted_at: string | null;
  status:       string;
}
interface SummaryStats {
  totalExams:       number;
  passed:           number;
  averageScore:     number | null;
  highestScore:     number | null;
  totalTimeMinutes: number;
}

const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s}s` : `${m}m${s > 0 ? ` ${s}s` : ""}`;
}
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function getPctColor(pct: number | null): string {
  if (pct === null) return "#9ca3af";
  if (pct >= 75)    return "#059669";
  if (pct >= 50)    return "#d97706";
  return "#dc2626";
}
function getPctFillClass(pct: number | null, s: typeof styles): string {
  if (pct === null) return "";
  if (pct >= 75)    return s.pctHigh;
  if (pct >= 50)    return s.pctMid;
  return s.pctLow;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td><div className={styles.skeleton} style={{ height: 13, width: "68%", marginBottom: 6, borderRadius: 5 }} /><div className={styles.skeleton} style={{ height: 10, width: "38%", borderRadius: 5 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 18, width: 52, borderRadius: 5 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 8, width: 90, borderRadius: 99 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 22, width: 66, borderRadius: 99 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 13, width: 50, borderRadius: 5 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 13, width: 74, borderRadius: 5 }} /></td>
          <td><div className={styles.skeleton} style={{ height: 30, width: 78, borderRadius: 8 }} /></td>
        </tr>
      ))}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // ── Auth from context — no extra network call ─────────────────────────
  const { user, loading: authLoading, error: authError } = useUser();

  const [results,        setResults]        = useState<ResultRow[]>([]);
  const [pendingRows,    setPendingRows]     = useState<PendingRow[]>([]);
  const [stats,          setStats]          = useState<SummaryStats>({ totalExams: 0, passed: 0, averageScore: null, highestScore: null, totalTimeMinutes: 0 });
  const [categories,     setCategories]     = useState<string[]>([]);
  const [dataLoading,    setDataLoading]    = useState(false);
  const [dataError,      setDataError]      = useState<string | null>(null);
  const [tab,            setTab]            = useState<ExamTypeFilter>("all");
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page,           setPage]           = useState(1);
  const [total,          setTotal]          = useState(0);

  // ── Stats — RELEASED only ─────────────────────────────────────────────
  const fetchStats = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from("submissions")
      .select("score, percentage, passed, time_spent_seconds")
      .eq("student_id", sid)         // ← own data only
      .eq("status", RELEASED_STATUS);

    if (!data || data.length === 0) return;
    const scores = data
      .map((r: { percentage: number | null }) => r.percentage)
      .filter((v: number | null): v is number => v !== null);
    setStats({
      totalExams:       data.length,
      passed:           data.filter((r: { passed: boolean | null }) => r.passed === true).length,
      averageScore:     scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null,
      highestScore:     scores.length > 0 ? Math.round(Math.max(...scores)) : null,
      totalTimeMinutes: Math.round(data.reduce((acc: number, r: { time_spent_seconds: number | null }) => acc + (r.time_spent_seconds ?? 0), 0) / 60),
    });
  }, [supabase]);

  // ── Pending banner — submitted OR graded ─────────────────────────────
  const fetchPending = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from("submissions")
      .select("id, submitted_at, status, exams ( title )")
      .eq("student_id", sid)         // ← own data only
      .in("status", PENDING_STATUSES)
      .order("submitted_at", { ascending: false })
      .limit(10);

    setPendingRows(
      (data ?? []).map((r: Record<string, unknown>) => ({
        id:           r.id as string,
        exam_title:   (r.exams as { title: string } | null)?.title ?? "Untitled Exam",
        submitted_at: r.submitted_at as string | null,
        status:       r.status as string,
      }))
    );
  }, [supabase]);

  // ── Results table — RELEASED only ────────────────────────────────────
  const fetchResults = useCallback(async (sid: string) => {
    setDataLoading(true);
    setDataError(null);

    let query = supabase
      .from("submissions")
      .select(
        `id, exam_id, score, percentage, passed, status, time_spent_seconds, submitted_at,
         exams ( title, total_points, exam_type, exam_categories ( name ) )`,
        { count: "exact" }
      )
      .eq("student_id", sid)          // ← own data only
      .eq("status", RELEASED_STATUS)
      .order("submitted_at", { ascending: false });

    if (statusFilter === "passed") query = query.eq("passed", true);
    if (statusFilter === "failed") query = query.eq("passed", false);

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await query;

    if (error) {
      setDataError("Could not load results. Please try again.");
      setDataLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shaped: ResultRow[] = (data ?? []).map((row: any) => ({
      id:                 row.id,
      exam_id:            row.exam_id,
      exam_title:         (row.exams?.title ?? "Untitled Exam") as string,
      exam_type:          (row.exams?.exam_type ?? "mock") as "mock" | "practice",
      category:           (row.exams?.exam_categories?.name ?? "Uncategorised") as string,
      score:              row.score,
      total_points:       row.exams?.total_points ?? 100,
      percentage:         row.percentage !== null ? Math.round(row.percentage) : null,
      passed:             row.passed,
      status:             row.status,
      time_spent_seconds: row.time_spent_seconds,
      submitted_at:       row.submitted_at,
    }));

    // Client-side secondary filters
    if (tab !== "all")            shaped = shaped.filter(r => r.exam_type === tab);
    if (search.trim())            shaped = shaped.filter(r => r.exam_title.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()));
    if (categoryFilter !== "all") shaped = shaped.filter(r => r.category === categoryFilter);

    const cats = Array.from(new Set(shaped.map(r => r.category))).sort();
    setCategories(prev => Array.from(new Set([...prev, ...cats])).sort());

    setResults(shaped);
    setTotal(count ?? 0);
    setDataLoading(false);
  }, [supabase, page, tab, search, statusFilter, categoryFilter]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [tab, search, statusFilter, categoryFilter]);

  // Trigger all fetches once auth resolves
  useEffect(() => {
    if (authLoading || !user) return;
    const sid = user.id;
    void fetchStats(sid);
    void fetchPending(sid);
    void fetchResults(sid);
  }, [authLoading, user, fetchStats, fetchPending, fetchResults]);

  // ── Derived ────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const passRate   = stats.totalExams > 0 ? Math.round((stats.passed / stats.totalExams) * 100) : null;
  const loading    = authLoading || dataLoading;
  const error      = authError   ?? dataError;

  const STAT_CARDS = [
    { Icon: FileText,     iconColor: "#2563eb", iconBg: "#eff6ff", label: "Released Results", value: String(stats.totalExams),      sub: "score visible to you",          empty: stats.totalExams === 0 },
    { Icon: TrendingUp,   iconColor: "#059669", iconBg: "#f0fdf4", label: "Average Score",    value: stats.averageScore !== null ? `${stats.averageScore}%` : "—", sub: "across released exams", empty: stats.averageScore === null },
    { Icon: Trophy,       iconColor: "#d97706", iconBg: "#fffbeb", label: "Highest Score",    value: stats.highestScore !== null ? `${stats.highestScore}%` : "—", sub: "personal best",         empty: stats.highestScore === null },
    { Icon: CheckCircle2, iconColor: "#dc2626", iconBg: "#fef2f2", label: "Pass Rate",        value: passRate !== null ? `${passRate}%` : "—",                   sub: `${stats.passed} of ${stats.totalExams} passed`, empty: stats.totalExams === 0 },
    { Icon: Clock,        iconColor: "#7c3aed", iconBg: "#f5f3ff", label: "Total Time",       value: stats.totalTimeMinutes > 0 ? `${stats.totalTimeMinutes}m` : "—", sub: "combined exam time",   empty: stats.totalTimeMinutes === 0 },
  ];

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>My Results</h1>
          <p className={styles.subtitle}>Scores are shown only after faculty review and release.</p>
        </div>
      </div>

      {/* ── Auth / data error ── */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10,
          padding: '0.8rem 1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.82rem', color: '#991b1b', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── Pending notice ── */}
      {pendingRows.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #fde68a',
          borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '0.5rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
        }}>
          <Clock size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>
              {pendingRows.length} exam{pendingRows.length > 1 ? 's' : ''} awaiting faculty review
            </p>
            <p style={{ fontSize: '0.77rem', color: '#b45309', margin: 0 }}>
              Results will appear here once released:&nbsp;
              {pendingRows.map(r => r.exam_title).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className={styles.statsGrid}>
        {STAT_CARDS.map(card => (
          <div key={card.label} className={styles.statCard}>
            <div className={styles.statTop}>
              <div className={styles.statIcon} style={{ background: card.iconBg }}>
                <card.Icon size={18} color={card.iconColor} strokeWidth={2} />
              </div>
            </div>
            <div className={`${styles.statValue} ${card.empty ? styles.statValueEmpty : ""}`}>{card.value}</div>
            <div className={styles.statLabel}>{card.label}</div>
            <div className={styles.statSub}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className={styles.filterRow}>
        <div className={styles.tabGroup}>
          {(["all", "mock", "practice"] as ExamTypeFilter[]).map(t => (
            <button key={t}
              className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ""}`}
              onClick={() => setTab(t)}>
              {t === "all" ? "All Exams" : t === "mock" ? "Mock Exams" : "Practice Exams"}
            </button>
          ))}
        </div>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><Search size={14} /></span>
          <input className={styles.searchInput} type="text" placeholder="Search exams or categories…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className={styles.searchClear} onClick={() => setSearch("")}><X size={13} /></button>}
        </div>
        <select className={styles.filterSelect} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="all">All Statuses</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
        </select>
        <p className={styles.resultCount}><strong>{results.length}</strong> result{results.length !== 1 ? "s" : ""}</p>
      </div>

      {/* ── Table ── */}
      {!loading && results.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}><ClipboardList size={26} color="#94a3b8" strokeWidth={1.5} /></div>
          <p className={styles.emptyTitle}>
            {search || statusFilter !== "all" || categoryFilter !== "all" || tab !== "all"
              ? "No matching results" : "No released results yet"}
          </p>
          <p className={styles.emptyText}>
            {search || statusFilter !== "all" || categoryFilter !== "all" || tab !== "all"
              ? "Try adjusting your filters."
              : "Your scores will appear here once your faculty reviews and releases your exam results."}
          </p>
          {!search && statusFilter === "all" && categoryFilter === "all" && tab === "all" && (
            <button className={styles.emptyBtn} onClick={() => router.push("/student/mock-exams")}>
              <FileText size={14} /> Take a Mock Exam
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Exam</th><th>Score</th><th>Percentage</th><th>Status</th><th>Time Spent</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows /> : results.map(row => (
                  <tr key={row.id}>
                    <td>
                      <p className={styles.examTitle}>{row.exam_title}</p>
                      <div className={styles.examMeta}>
                        <span className={styles.examCategory}>{row.category}</span>
                        <span className={`${styles.examTypePill} ${row.exam_type === "mock" ? styles.typeMock : styles.typePractice}`}>
                          {row.exam_type}
                        </span>
                      </div>
                    </td>
                    <td>
                      {row.score !== null ? (
                        <div className={styles.scoreWrap}>
                          <span className={styles.scoreNum} style={{ color: getPctColor(row.percentage) }}>{row.score}</span>
                          <span className={styles.scoreTotal}>/{row.total_points}</span>
                        </div>
                      ) : <span className={styles.scoreTotal}>—</span>}
                    </td>
                    <td>
                      <div className={styles.pctWrap}>
                        <div className={styles.pctLabel} style={{ color: getPctColor(row.percentage) }}>
                          {row.percentage !== null ? `${row.percentage}%` : "—"}
                        </div>
                        <div className={styles.pctTrack}>
                          <div className={`${styles.pctFill} ${getPctFillClass(row.percentage, styles)}`}
                            style={{ width: row.percentage !== null ? `${row.percentage}%` : "0%" }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      {row.passed === true
                        ? <span className={`${styles.badge} ${styles.badgePassed}`}><CheckCircle2 size={10} /> Passed</span>
                        : row.passed === false
                          ? <span className={`${styles.badge} ${styles.badgeFailed}`}>Failed</span>
                          : <span className={`${styles.badge} ${styles.badgePending}`}><AlertCircle size={10} /> Released</span>}
                    </td>
                    <td><span className={styles.timeVal}>{formatTime(row.time_spent_seconds)}</span></td>
                    <td><span className={styles.dateVal}>{formatDate(row.submitted_at)}</span></td>
                    <td>
                      <button className={styles.reviewBtn} onClick={() => router.push(`/student/results/${row.id}`)}>
                        <Eye size={13} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && results.length > 0 && (
        <div className={styles.pagination}>
          <p className={styles.pageInfo}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className={styles.pageControls}>
            <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
              <ChevronLeft size={15} />
            </button>
            {pageNumbers.map((p, i) =>
              p === "…"
                ? <span key={`ell-${i}`} className={styles.pageEllipsis}>…</span>
                : <button key={p} className={`${styles.pageNum} ${page === p ? styles.pageNumActive : ""}`}
                    onClick={() => setPage(p as number)}>{p}</button>
            )}
            <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}