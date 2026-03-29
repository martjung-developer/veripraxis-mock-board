"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  TrendingUp,
  Trophy,
  Flame,
  Clock,
  CheckCircle2,
  BookOpen,
  Star,
  Zap,
  Award,
  Target,
  BarChart2,
  Lock,
} from "lucide-react";
import styles from "./progress.module.css";

/* ─── Types ─── */
type FilterRange = "7d" | "30d" | "all";

interface StatCard {
  Icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  trend: string;
  trendPositive: boolean | null;
  sub: string;
}

interface ExamRow {
  date: string;
  title: string;
  category: string;
  score: number;
  total: number;
  passed: boolean;
}

interface BarItem {
  label: string;
  score: number;
  color: string;
}

interface DonutSlice {
  label: string;
  pct: number;
  color: string;
}

interface ProgressItem {
  name: string;
  pct: number;
  variant?: "blue" | "amber" | "green";
}

interface Achievement {
  Icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  name: string;
  desc: string;
  earned: boolean;
}

/* ─────────────────────────────────────────────
   MOCK DATA
   When ready to connect Supabase, replace each
   constant below with a server component query
   or a useEffect() fetch using your lib/supabase/client.ts
   ───────────────────────────────────────────── */

const STAT_CARDS: StatCard[] = [
  {
    Icon: FileText,
    iconColor: "#3b82f6", iconBg: "#eff6ff",
    label: "Exams Taken",   value: "34",
    trend: "+3",            trendPositive: true,
    sub: "vs last period",
  },
  {
    Icon: TrendingUp,
    iconColor: "#10b981",  iconBg: "#f0fdf4",
    label: "Average Score", value: "78.4%",
    trend: "+5.2%",         trendPositive: true,
    sub: "improving steadily",
  },
  {
    Icon: Trophy,
    iconColor: "#f59e0b",  iconBg: "#fffbeb",
    label: "Highest Score", value: "96%",
    trend: "—",             trendPositive: null,
    sub: "Civil Engineering Laws",
  },
  {
    Icon: Flame,
    iconColor: "#ef4444",  iconBg: "#fef2f2",
    label: "Study Streak",  value: "12 days",
    trend: "+4",            trendPositive: true,
    sub: "keep it going!",
  },
  {
    Icon: Clock,
    iconColor: "#8b5cf6",  iconBg: "#f5f3ff",
    label: "Total Study Time", value: "47 hrs",
    trend: "+6h",           trendPositive: true,
    sub: "this period",
  },
  {
    Icon: CheckCircle2,
    iconColor: "#10b981",  iconBg: "#f0fdf4",
    label: "Pass Rate",     value: "71%",
    trend: "-2%",           trendPositive: false,
    sub: "24 of 34 passed",
  },
];

const LINE_DATASETS: Record<FilterRange, number[]> = {
  "7d":  [62, 70, 68, 75, 73, 80, 78, 84],
  "30d": [55, 58, 62, 60, 65, 70, 68, 72, 75, 73, 78, 80, 77, 82, 84, 79],
  all:   [45, 50, 55, 53, 58, 62, 60, 65, 67, 70, 68, 72, 75, 73, 78, 80, 77, 82, 84, 79],
};

const BAR_DATA: BarItem[] = [
  { label: "Mathematics",         score: 82, color: "#3b82f6" },
  { label: "Engineering Sci.",    score: 74, color: "#8b5cf6" },
  { label: "General Engineering", score: 88, color: "#10b981" },
  { label: "Engineering Laws",    score: 91, color: "#f59e0b" },
  { label: "Physics",             score: 68, color: "#ef4444" },
];

const DONUT_DATA: DonutSlice[] = [
  { label: "Mock Exams",      pct: 45, color: "#3b82f6" },
  { label: "Reviewers",       pct: 32, color: "#f59e0b" },
  { label: "Study Materials", pct: 23, color: "#10b981" },
];

const RECENT_EXAMS: ExamRow[] = [
  { date: "Mar 28", title: "Fluid Mechanics Mock #4",   category: "Engineering Sciences", score: 84, total: 100, passed: true },
  { date: "Mar 25", title: "Engineering Mathematics",   category: "Mathematics",          score: 91, total: 100, passed: true },
  { date: "Mar 22", title: "Strength of Materials",     category: "Engineering Sciences", score: 63, total: 100, passed: false },
  { date: "Mar 19", title: "Engineering Laws & Ethics", category: "Engineering Laws",     score: 78, total: 100, passed: true },
  { date: "Mar 15", title: "Thermodynamics Exam #2",    category: "Physics",              score: 55, total: 100, passed: false },
];

const REVIEWER_PROGRESS: ProgressItem[] = [
  { name: "Fluid Mechanics Reviewer",  pct: 85, variant: "blue" },
  { name: "Engineering Mathematics",   pct: 62, variant: "blue" },
  { name: "Strength of Materials",     pct: 40, variant: "amber" },
  { name: "Engineering Economics",     pct: 90, variant: "green" },
];

const STUDY_PROGRESS: ProgressItem[] = [
  { name: "Calculus Modules (12 units)", pct: 75, variant: "blue" },
  { name: "Physics Practice Sets",       pct: 50, variant: "amber" },
  { name: "Laws & Ethics Handbook",      pct: 88, variant: "green" },
];

const ACHIEVEMENTS: Achievement[] = [
  { Icon: Target,    iconColor: "#3b82f6", iconBg: "#eff6ff", name: "First Exam",    desc: "Completed your first mock exam",  earned: true },
  { Icon: Flame,     iconColor: "#ef4444", iconBg: "#fef2f2", name: "7-Day Streak",  desc: "Studied 7 days in a row",         earned: true },
  { Icon: Star,      iconColor: "#f59e0b", iconBg: "#fffbeb", name: "Perfect Score", desc: "Scored 100% on any exam",         earned: false },
  { Icon: Trophy,    iconColor: "#f59e0b", iconBg: "#fffbeb", name: "Top Scorer",    desc: "Ranked #1 in your batch",         earned: false },
  { Icon: BookOpen,  iconColor: "#8b5cf6", iconBg: "#f5f3ff", name: "Bookworm",      desc: "Completed 5 full reviewers",      earned: true },
  { Icon: Zap,       iconColor: "#10b981", iconBg: "#f0fdf4", name: "Speed Runner",  desc: "Finished exam in under 10 min",   earned: true },
  { Icon: Award,     iconColor: "#3b82f6", iconBg: "#eff6ff", name: "High Achiever", desc: "Average score above 85%",         earned: false },
  { Icon: BarChart2, iconColor: "#10b981", iconBg: "#f0fdf4", name: "Ready to Pass", desc: "Passed 20+ mock exams",           earned: false },
];

/* ─── SVG Line Chart ─── */
function LineChart({ data }: { data: number[] }) {
  const W = 520; const H = 155;
  const P = { top: 18, right: 12, bottom: 26, left: 30 };

  const minV = Math.min(...data) - 8;
  const maxV = Math.max(...data) + 8;
  const xFn = (i: number) => P.left + (i / (data.length - 1)) * (W - P.left - P.right);
  const yFn = (v: number) => P.top + ((maxV - v) / (maxV - minV)) * (H - P.top - P.bottom);

  const polyPts = data.map((v, i) => `${xFn(i)},${yFn(v)}`).join(" ");
  const areaClose = `${xFn(data.length - 1)},${H - P.bottom} ${xFn(0)},${H - P.bottom}`;
  const gridVals = [60, 70, 80, 90];

  const labelDate = (i: number) => {
    const d = new Date(2026, 2, 28 - (data.length - 1 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const showIdx = data.length <= 8
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 3), Math.floor(2 * (data.length - 1) / 3), data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.lineSvg} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
        </linearGradient>
      </defs>
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={P.left} x2={W - P.right} y1={yFn(v)} y2={yFn(v)} stroke="#f1f5f9" strokeWidth="1" />
          <text x={P.left - 5} y={yFn(v) + 4} fill="#94a3b8" fontSize="9" textAnchor="end">{v}</text>
        </g>
      ))}
      {showIdx.map((i) => (
        <text key={i} x={xFn(i)} y={H - P.bottom + 14} fill="#94a3b8" fontSize="9" textAnchor="middle">
          {labelDate(i)}
        </text>
      ))}
      <polygon points={`${polyPts} ${areaClose}`} fill="url(#lineArea)" />
      <polyline points={polyPts} fill="none" stroke="#3b82f6" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => {
        const isLast = i === data.length - 1;
        return (
          <g key={i}>
            <circle cx={xFn(i)} cy={yFn(v)} r={isLast ? 5 : 3}
              fill={isLast ? "#3b82f6" : "#fff"} stroke="#3b82f6" strokeWidth="2" />
            {isLast && (
              <text x={xFn(i)} y={yFn(v) - 9} fill="#3b82f6" fontSize="10"
                fontWeight="700" textAnchor="middle">{v}%</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── SVG Donut Chart ─── */
function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const R = 42; const CX = 56; const CY = 56;
  const CIRC = 2 * Math.PI * R;
  const arcs = slices.reduce((acc, s, i) => {
    const cumPct = slices.slice(0, i).reduce((sum, slice) => sum + slice.pct, 0);
    const dash = (s.pct / 100) * CIRC;
    const offset = CIRC - cumPct * (CIRC / 100);
    acc.push({ ...s, dash, offset });
    return acc;
  }, [] as Array<DonutSlice & { dash: number; offset: number }>);
  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 112 112" className={styles.donutSvg}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        {arcs.map((a, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={a.color}
            strokeWidth="12"
            strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
            strokeDashoffset={a.offset}
            transform={`rotate(-90 ${CX} ${CY})`} />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="700">100%</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fill="#94a3b8" fontSize="7.5">of time</text>
      </svg>
      <div className={styles.donutLegend}>
        {slices.map((s) => (
          <div key={s.label} className={styles.legendRow}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendPct}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function ProgressPage() {
  const [filter, setFilter]   = useState<FilterRange>("30d");

  const filters: { label: string; value: FilterRange }[] = [
    { label: "7 Days",   value: "7d" },
    { label: "30 Days",  value: "30d" },
    { label: "All Time", value: "all" },
  ];
  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned).length;

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>My Progress</h1>
          <p className={styles.pageSubtitle}>Track your performance and improvement over time</p>
        </div>
        <div className={styles.filterGroup}>
          {filters.map((f) => (
            <button
              key={f.value}
              className={`${styles.filterBtn} ${filter === f.value ? styles.filterBtnActive : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsGrid}>
        {STAT_CARDS.map((card, idx) => (
          <div key={card.label} className={styles.statCard} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className={styles.statTop}>
              <div className={styles.statIcon} style={{ background: card.iconBg }}>
                <card.Icon size={18} color={card.iconColor} strokeWidth={2} />
              </div>
              {card.trendPositive === null
                ? <span className={styles.trendNeutral}>{card.trend}</span>
                : card.trendPositive
                  ? <span className={styles.trendUp}>{card.trend}</span>
                  : <span className={styles.trendDown}>{card.trend}</span>
              }
            </div>
            <div className={styles.statValue}>{card.value}</div>
            <div className={styles.statLabel}>{card.label}</div>
            <div className={styles.statSub}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Line chart + Bar chart ── */}
      <div className={styles.row2}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Performance Over Time</span>
            <span className={styles.cardHint}>score %</span>
          </div>
          <div className={styles.lineWrap}>
            <LineChart data={LINE_DATASETS[filter]} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Scores by Subject</span>
            <span className={styles.cardHint}>avg %</span>
          </div>
          <div className={styles.barList}>
            {BAR_DATA.map((item) => (
              <div key={item.label} className={styles.barRow}>
                <div className={styles.barLabelWrap}>
                  <span className={styles.barDot} style={{ background: item.color }} />
                  <span className={styles.barLabel}>{item.label}</span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill}
                    style={{ width: `${item.score}%`, background: item.color }} />
                </div>
                <span className={styles.barValue} style={{ color: item.color }}>{item.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Reviewer progress + Donut ── */}
      <div className={styles.row2wide}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Reviewer Completion</span>
            <span className={styles.cardHint}>by module</span>
          </div>
          <div className={styles.progressList}>
            {REVIEWER_PROGRESS.map((r) => (
              <div key={r.name} className={styles.progressItem}>
                <div className={styles.progressTop}>
                  <span className={styles.progressName}>{r.name}</span>
                  <span className={styles.progressPct}>{r.pct}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={`${styles.progressFill} ${styles[`fill_${r.variant ?? "blue"}`]}`}
                    style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Study Distribution</span>
          </div>
          <DonutChart slices={DONUT_DATA} />
        </div>
      </div>

      {/* ── Recent exams + Study materials ── */}
      <div className={styles.row2}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Recent Exams</span>
            <span className={styles.cardHint}>last 5 attempts</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_EXAMS.map((exam, i) => (
                  <tr key={i}>
                    <td>
                      <p className={styles.examTitle}>{exam.title}</p>
                      <p className={styles.examCategory}>{exam.category}</p>
                    </td>
                    <td>
                      <span className={styles.scoreVal}
                        style={{ color: exam.score >= 75 ? "#10b981" : "#ef4444" }}>
                        {exam.score}
                        <span className={styles.scoreTotal}>/{exam.total}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${exam.passed ? styles.badgePassed : styles.badgeFailed}`}>
                        {exam.passed ? "Passed" : "Failed"}
                      </span>
                    </td>
                    <td><span className={styles.examDate}>{exam.date}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Study Materials</span>
            <span className={styles.cardHint}>completion</span>
          </div>
          <div className={styles.progressList}>
            {STUDY_PROGRESS.map((s) => (
              <div key={s.name} className={styles.progressItem}>
                <div className={styles.progressTop}>
                  <span className={styles.progressName}>{s.name}</span>
                  <span className={styles.progressPct}>{s.pct}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={`${styles.progressFill} ${styles[`fill_${s.variant ?? "blue"}`]}`}
                    style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Achievements ── */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Achievements</span>
          <span className={styles.cardHint}>{earnedCount} of {ACHIEVEMENTS.length} earned</span>
        </div>
        <div className={styles.achieveGrid}>
          {ACHIEVEMENTS.map((a, i) => (
            <div key={a.name}
              className={`${styles.achieveCard} ${!a.earned ? styles.achieveLocked : ""}`}
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className={styles.achieveIcon} style={{ background: a.iconBg }}>
                {a.earned
                  ? <a.Icon size={20} color={a.iconColor} strokeWidth={2} />
                  : <Lock size={16} color="#94a3b8" strokeWidth={2} />}
              </div>
              <p className={styles.achieveName}>{a.name}</p>
              <p className={styles.achieveDesc}>{a.desc}</p>
              <span className={`${styles.achieveBadge} ${a.earned ? styles.badgePassed : styles.achieveBadgeLocked}`}>
                {a.earned ? "Earned" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}