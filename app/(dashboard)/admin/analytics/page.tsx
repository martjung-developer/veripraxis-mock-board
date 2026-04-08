// app/(dashboard)/admin/analytics/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, BookOpen, Activity, TrendingUp, Award,
  AlertTriangle, Clock, RefreshCw, BarChart2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from './analytics.module.css';
import {
  containerVariants,
  cardVariants,
  chartVariants,
  tableRowVariants,
  sectionVariants,
} from '@/animations/admin/analytics/analytics';

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface OverviewStats {
  totalStudents:       number;
  totalExams:          number;
  totalAttempts:       number;   // all terminal submissions
  releasedAttempts:    number;   // released only
  averageScore:        number;   // released only
}

interface ProgramPerf {
  program_id: string;
  name: string;
  avg_score: number;
}

interface ExamPerf {
  exam_id: string;
  title: string;
  avg_score: number;
  pass_rate: number;
}

interface TopStudent {
  student_id: string;
  full_name: string;
  average_score: number;
  total_attempts: number;
}

interface AtRiskStudent {
  student_id: string;
  full_name: string;
  average_score: number;
  total_attempts: number;
}

interface EngagementStats {
  totalAttempts:         number;
  releasedAttempts:      number;
  totalTimeMinutes:      number;
  avgTimePerAttempt:     number;
  avgAttemptsPerStudent: number;
}

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function scoreClass(score: number): string {
  if (score >= 75) return styles.scoreHigh;
  if (score >= 50) return styles.scoreMid;
  return styles.scoreLow;
}

function rankClass(i: number): string {
  if (i === 0) return styles.rankGold;
  if (i === 1) return styles.rankSilver;
  if (i === 2) return styles.rankBronze;
  return '';
}

const BAR_COLORS_PROGRAM = ['#0d2540', '#1e3a5f', '#2d4f80', '#3c64a0', '#4f5ff7', '#7c3aed'];
const BAR_COLORS_EXAM    = ['#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#4f5ff7'];

/* ─────────────────────────────────────────
   Custom Tooltip
───────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.customTooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p className={styles.tooltipValue}>{payload[0].value.toFixed(1)}%</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function AnalyticsDashboardPage() {
  const supabase = createClient();

  const [overview,    setOverview]    = useState<OverviewStats | null>(null);
  const [programPerf, setProgramPerf] = useState<ProgramPerf[]>([]);
  const [examPerf,    setExamPerf]    = useState<ExamPerf[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [atRisk,      setAtRisk]      = useState<AtRiskStudent[]>([]);
  const [engagement,  setEngagement]  = useState<EngagementStats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [refreshed,   setRefreshed]   = useState<Date | null>(null);

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, examsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('exams').select('id', { count: 'exact', head: true }),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (examsRes.error)    throw examsRes.error;

      // ── Fetch submissions directly from the submissions table ─────────────
      // We split into two queries:
      //   1. ALL terminal submissions — for total attempt counts and time metrics
      //   2. RELEASED submissions only — for score/pass-rate analytics
      //
      // This prevents 'submitted'/'graded' rows (where percentage is null)
      // from contaminating average score and pass rate calculations.
      const [allSubsRes, releasedSubsRes] = await Promise.all([
        supabase
          .from('submissions')
          .select('id, student_id, exam_id, status, time_spent_seconds')
          .in('status', ['submitted', 'graded', 'released']),
        supabase
          .from('submissions')
          .select('id, student_id, exam_id, percentage, passed, time_spent_seconds')
          .eq('status', 'released'),  // ← score analytics from released only
      ]);

      if (allSubsRes.error)      throw allSubsRes.error;
      if (releasedSubsRes.error) throw releasedSubsRes.error;

      const allSubs      = allSubsRes.data      ?? [];
      const releasedSubs = releasedSubsRes.data ?? [];

      /* ── Overview ── */
      const releasedWithScore = releasedSubs.filter((r: { percentage: number | null }) => r.percentage != null);
      const avgScore = releasedWithScore.length > 0
        ? releasedWithScore.reduce((s: number, r: { percentage: number | null }) => s + (r.percentage ?? 0), 0) / releasedWithScore.length
        : 0;

      setOverview({
        totalStudents:    studentsRes.count ?? 0,
        totalExams:       examsRes.count    ?? 0,
        totalAttempts:    allSubs.length,
        releasedAttempts: releasedSubs.length,
        averageScore:     avgScore,
      });

      // ── Fetch exam and program metadata ───────────────────────────────────
      const allExamIds      = [...new Set([
        ...allSubs.map((r: { exam_id: string | null }) => r.exam_id),
        ...releasedSubs.map((r: { exam_id: string | null }) => r.exam_id),
      ].filter(Boolean))] as string[];

      let examRows: { id: string; title: string; program_id: string | null }[] = [];
      if (allExamIds.length > 0) {
        const eRes = await supabase.from('exams').select('id, title, program_id').in('id', allExamIds);
        if (!eRes.error) examRows = eRes.data ?? [];
      }

      const examTitles:   Record<string, string>        = {};
      const examPrograms: Record<string, string | null> = {};
      for (const e of examRows) {
        examTitles[e.id]   = e.title;
        examPrograms[e.id] = e.program_id;
      }

      // ── Program performance — from released submissions ────────────────────
      const programMap: Record<string, { sum: number; count: number }> = {};
      for (const r of releasedSubs as { exam_id: string | null; percentage: number | null }[]) {
        if (!r.exam_id || r.percentage == null) continue;
        const pid = examPrograms[r.exam_id];
        if (!pid) continue;
        if (!programMap[pid]) programMap[pid] = { sum: 0, count: 0 };
        programMap[pid].sum += r.percentage;
        programMap[pid].count += 1;
      }

      const programIds = Object.keys(programMap);
      let programNames: Record<string, string> = {};
      if (programIds.length > 0) {
        const pRes = await supabase.from('programs').select('id, name').in('id', programIds);
        if (!pRes.error) for (const p of pRes.data ?? []) programNames[p.id] = p.name;
      }

      const programPerfData: ProgramPerf[] = programIds.map((pid) => ({
        program_id: pid,
        name:      programNames[pid] ?? pid,
        avg_score: parseFloat((programMap[pid].sum / programMap[pid].count).toFixed(1)),
      }));
      setProgramPerf(programPerfData.sort((a, b) => b.avg_score - a.avg_score));

      // ── Exam performance — from released submissions ───────────────────────
      const examBuckets: Record<string, { sum: number; count: number; passed: number }> = {};
      for (const r of releasedSubs as { exam_id: string | null; percentage: number | null; passed: boolean | null }[]) {
        if (!r.exam_id || r.percentage == null) continue;
        if (!examBuckets[r.exam_id]) examBuckets[r.exam_id] = { sum: 0, count: 0, passed: 0 };
        examBuckets[r.exam_id].sum += r.percentage;
        examBuckets[r.exam_id].count += 1;
        if (r.passed === true) examBuckets[r.exam_id].passed += 1;
      }

      const examPerfData: ExamPerf[] = Object.keys(examBuckets).map((eid) => ({
        exam_id:   eid,
        title:     (examTitles[eid] ?? eid).slice(0, 30),
        avg_score: parseFloat((examBuckets[eid].sum  / examBuckets[eid].count).toFixed(1)),
        pass_rate: parseFloat(((examBuckets[eid].passed / examBuckets[eid].count) * 100).toFixed(1)),
      }));
      setExamPerf(examPerfData.sort((a, b) => b.avg_score - a.avg_score).slice(0, 8));

      // ── Per-student aggregation — from released submissions ───────────────
      const studentAgg: Record<string, { sumScore: number; count: number; attempts: number }> = {};
      for (const r of releasedSubs as { student_id: string | null; percentage: number | null }[]) {
        if (!r.student_id) continue;
        if (!studentAgg[r.student_id]) studentAgg[r.student_id] = { sumScore: 0, count: 0, attempts: 0 };
        if (r.percentage != null) {
          studentAgg[r.student_id].sumScore += r.percentage;
          studentAgg[r.student_id].count += 1;
        }
        studentAgg[r.student_id].attempts += 1;
      }
      // Also count all-status attempts for engagement depth
      for (const r of allSubs as { student_id: string | null }[]) {
        if (!r.student_id) continue;
        if (!studentAgg[r.student_id]) studentAgg[r.student_id] = { sumScore: 0, count: 0, attempts: 0 };
      }

      const studentIds = Object.keys(studentAgg);
      let profileNames: Record<string, string> = {};
      if (studentIds.length > 0) {
        const prRes = await supabase.from('profiles').select('id, full_name').in('id', studentIds);
        if (!prRes.error) for (const p of prRes.data ?? []) profileNames[p.id] = p.full_name;
      }

      const studentList = studentIds
        .filter((sid) => studentAgg[sid].count > 0)
        .map((sid) => ({
          student_id:     sid,
          full_name:      profileNames[sid] ?? 'Unknown',
          average_score:  parseFloat((studentAgg[sid].sumScore / studentAgg[sid].count).toFixed(1)),
          total_attempts: studentAgg[sid].attempts,
        }));

      setTopStudents(
        [...studentList].sort((a, b) => b.average_score - a.average_score).slice(0, 8)
      );

      const atRiskList = studentList.filter(
        (s) => s.average_score < 50 || (s.total_attempts >= 3 && s.average_score < 65)
      );
      setAtRisk(atRiskList.sort((a, b) => a.average_score - b.average_score).slice(0, 8));

      // ── Engagement — from all submissions (time is always tracked) ─────────
      const totalTime = allSubs.reduce(
        (s: number, r: { time_spent_seconds: number | null }) => s + (r.time_spent_seconds ?? 0), 0
      ) / 60;
      const totalAtt  = allSubs.length;
      const uniqueStu = studentIds.length;

      setEngagement({
        totalAttempts:         totalAtt,
        releasedAttempts:      releasedSubs.length,
        totalTimeMinutes:      Math.round(totalTime),
        avgTimePerAttempt:     totalAtt > 0 ? parseFloat((totalTime / totalAtt).toFixed(1)) : 0,
        avgAttemptsPerStudent: uniqueStu > 0 ? parseFloat((totalAtt / uniqueStu).toFixed(1)) : 0,
      });

      setRefreshed(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─────────────────────────────────────────
     Skeleton
  ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={`${styles.skeleton}`} style={{ width: 42, height: 42, borderRadius: 11 }} />
            <div>
              <div className={`${styles.skeleton}`} style={{ width: 180, height: 20, marginBottom: 6 }} />
              <div className={`${styles.skeleton}`} style={{ width: 120, height: 13 }} />
            </div>
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {[0,1,2,3].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className={`${styles.skeleton}`} style={{ width: 40, height: 40, borderRadius: 10 }} />
                <div>
                  <div className={`${styles.skeleton}`} style={{ width: 70, height: 24, marginBottom: 6 }} />
                  <div className={`${styles.skeleton}`} style={{ width: 90, height: 12 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.chartsRow}>
          {[0,1].map((i) => (
            <div key={i} className={`${styles.skeletonCard}`} style={{ padding: '1.35rem 1.4rem', height: 280 }}>
              <div className={`${styles.skeleton}`} style={{ width: 160, height: 18, marginBottom: 8 }} />
              <div className={`${styles.skeleton}`} style={{ width: '100%', height: 200, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  return (
    <motion.div
      className={styles.page}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <BarChart2 size={20} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className={styles.heading}>Analytics</h1>
            <p className={styles.headingSub}>
              Performance overview · scores from released exams only
              {refreshed && <> · refreshed {refreshed.toLocaleTimeString()}</>}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* ── Overview Cards ── */}
      <motion.div className={styles.overviewGrid} variants={sectionVariants} initial="hidden" animate="visible">
        {[
          {
            icon: <Users size={18} color="#fff" strokeWidth={2.2} />,
            bg: '#0d2540',
            value: overview?.totalStudents.toLocaleString() ?? '—',
            label: 'Total Students',
          },
          {
            icon: <BookOpen size={18} color="#fff" strokeWidth={2.2} />,
            bg: '#4f5ff7',
            value: overview?.totalExams.toLocaleString() ?? '—',
            label: 'Total Exams',
          },
          {
            icon: <Activity size={18} color="#fff" strokeWidth={2.2} />,
            bg: '#0891b2',
            // Show both totals for transparency
            value: overview ? `${overview.releasedAttempts.toLocaleString()} / ${overview.totalAttempts.toLocaleString()}` : '—',
            label: 'Released / Total Attempts',
          },
          {
            icon: <TrendingUp size={18} color="#fff" strokeWidth={2.2} />,
            bg: '#059669',
            value: overview ? `${overview.averageScore.toFixed(1)}%` : '—',
            label: 'Avg Score (Released)',
          },
        ].map((stat, i) => (
          <motion.div key={i} className={styles.statCard} variants={cardVariants}>
            <div className={styles.statIconWrap} style={{ background: stat.bg }}>
              {stat.icon}
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Charts Row ── */}
      <motion.div className={styles.chartsRow} variants={sectionVariants} initial="hidden" animate="visible">

        {/* Program Performance */}
        <motion.div className={styles.chartCard} variants={chartVariants}>
          <div className={styles.chartCardHeader}>
            <div>
              <h2 className={styles.chartCardTitle}>Program Performance</h2>
              <p className={styles.chartCardSub}>Average score per program (released exams)</p>
            </div>
            <span className={styles.chartBadge}>{programPerf.length} programs</span>
          </div>
          <div className={styles.chartWrap}>
            {programPerf.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={programPerf} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e9f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8a9ab5', fontWeight: 600 }} angle={-35} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8a9ab5' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0f3f8' }} />
                  <Bar dataKey="avg_score" radius={[5, 5, 0, 0]} maxBarSize={42}>
                    {programPerf.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS_PROGRAM[idx % BAR_COLORS_PROGRAM.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Exam Performance */}
        <motion.div className={styles.chartCard} variants={chartVariants}>
          <div className={styles.chartCardHeader}>
            <div>
              <h2 className={styles.chartCardTitle}>Exam Performance</h2>
              <p className={styles.chartCardSub}>Average score per exam — top 8 (released only)</p>
            </div>
            <span className={styles.chartBadge}>{examPerf.length} exams</span>
          </div>
          <div className={styles.chartWrap}>
            {examPerf.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={examPerf} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e9f0" vertical={false} />
                  <XAxis dataKey="title" tick={{ fontSize: 10, fill: '#8a9ab5', fontWeight: 600 }} angle={-35} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8a9ab5' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0f3f8' }} />
                  <Bar dataKey="avg_score" radius={[5, 5, 0, 0]} maxBarSize={42}>
                    {examPerf.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS_EXAM[idx % BAR_COLORS_EXAM.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Bottom Row ── */}
      <motion.div className={styles.bottomRow} variants={sectionVariants} initial="hidden" animate="visible">

        {/* Top Performing Students */}
        <motion.div className={styles.tableCard} variants={cardVariants}>
          <div className={styles.tableCardHeader}>
            <div>
              <h2 className={styles.tableCardTitle}>
                <Award size={14} style={{ marginRight: 5, verticalAlign: 'middle', color: '#d97706' }} />
                Top Students
              </h2>
              <p className={styles.tableCardSub}>Sorted by average score (released exams)</p>
            </div>
          </div>
          <div className={styles.tableBody}>
            {topStudents.length === 0 ? (
              <EmptyTable label="No data available" />
            ) : (
              topStudents.map((s, i) => (
                <motion.div key={s.student_id} className={styles.tableRow} custom={i} variants={tableRowVariants} initial="hidden" animate="visible">
                  <div className={`${styles.rankBadge} ${rankClass(i)}`}>{i + 1}</div>
                  <div className={styles.studentAvatar}>{initials(s.full_name)}</div>
                  <div className={styles.studentInfo}>
                    <div className={styles.studentName}>{s.full_name}</div>
                    <div className={styles.studentMeta}>{s.total_attempts} attempt{s.total_attempts !== 1 ? 's' : ''}</div>
                  </div>
                  <span className={`${styles.scoreChip} ${scoreClass(s.average_score)}`}>
                    {s.average_score.toFixed(1)}%
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* At-Risk Students */}
        <motion.div className={styles.tableCard} variants={cardVariants}>
          <div className={styles.tableCardHeader}>
            <div>
              <h2 className={styles.tableCardTitle}>
                <AlertTriangle size={14} style={{ marginRight: 5, verticalAlign: 'middle', color: '#dc2626' }} />
                At-Risk Students
              </h2>
              <p className={styles.tableCardSub}>Low score or high attempts, low result (released exams)</p>
            </div>
          </div>
          <div className={styles.tableBody}>
            {atRisk.length === 0 ? (
              <EmptyTable label="No at-risk students" />
            ) : (
              atRisk.map((s, i) => (
                <motion.div key={s.student_id} className={styles.tableRow} custom={i} variants={tableRowVariants} initial="hidden" animate="visible">
                  <div className={styles.studentAvatar}>{initials(s.full_name)}</div>
                  <div className={styles.studentInfo}>
                    <div className={styles.studentName}>{s.full_name}</div>
                    <div className={styles.studentMeta}>{s.total_attempts} attempt{s.total_attempts !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`${styles.scoreChip} ${scoreClass(s.average_score)}`}>
                      {s.average_score.toFixed(1)}%
                    </span>
                    <span className={styles.riskBadge}>
                      <span className={styles.riskDot} /> At-Risk
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Engagement Metrics */}
        <motion.div className={styles.engagementCard} variants={cardVariants}>
          <div className={styles.engagementHeader}>
            <h2 className={styles.engagementTitle}>
              <Clock size={14} style={{ marginRight: 5, verticalAlign: 'middle', color: '#0891b2' }} />
              Engagement
            </h2>
            <p className={styles.engagementSub}>Attempt & time metrics (all submissions)</p>
          </div>
          <div className={styles.engagementBody}>
            {[
              {
                icon: <Activity size={15} color="#fff" strokeWidth={2.2} />,
                bg: '#0891b2', bgPale: '#ecfeff',
                label: 'Total Attempts',
                sub: 'All submitted exams',
                value: engagement?.totalAttempts.toLocaleString() ?? '—',
                unit: 'attempts',
              },
              {
                icon: <Award size={15} color="#fff" strokeWidth={2.2} />,
                bg: '#059669', bgPale: '#ecfdf5',
                label: 'Released Attempts',
                sub: 'Scores visible to students',
                value: engagement?.releasedAttempts.toLocaleString() ?? '—',
                unit: 'released',
              },
              {
                icon: <Clock size={15} color="#fff" strokeWidth={2.2} />,
                bg: '#7c3aed', bgPale: '#f5f3ff',
                label: 'Total Time Spent',
                sub: 'Cumulative across all students',
                value: engagement
                  ? engagement.totalTimeMinutes >= 60
                    ? `${(engagement.totalTimeMinutes / 60).toFixed(1)}h`
                    : `${engagement.totalTimeMinutes}m`
                  : '—',
                unit: 'total time',
              },
              {
                icon: <Users size={15} color="#fff" strokeWidth={2.2} />,
                bg: '#d97706', bgPale: '#fffbeb',
                label: 'Avg Attempts / Student',
                sub: 'Engagement depth',
                value: engagement?.avgAttemptsPerStudent.toString() ?? '—',
                unit: 'per student',
              },
            ].map((m, i) => (
              <div key={i} className={styles.engagementMetric}>
                <div className={styles.engagementMetricLeft}>
                  <div className={styles.engagementMetricIcon} style={{ background: m.bg }}>
                    {m.icon}
                  </div>
                  <div>
                    <div className={styles.engagementMetricLabel}>{m.label}</div>
                    <div className={styles.engagementMetricSub}>{m.sub}</div>
                  </div>
                </div>
                <div>
                  <div className={styles.engagementMetricValue}>{m.value}</div>
                  <div className={styles.engagementMetricUnit}>{m.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function EmptyChart() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}><BarChart2 size={20} color="#8a9ab5" /></div>
      <p className={styles.emptyTitle}>No data yet</p>
      <p className={styles.emptySub}>Analytics will appear once exams are released.</p>
    </div>
  );
}

function EmptyTable({ label }: { label: string }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}><Users size={18} color="#8a9ab5" /></div>
      <p className={styles.emptyTitle}>{label}</p>
    </div>
  );
}