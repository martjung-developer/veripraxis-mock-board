// app/(dashboard)/student/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, BookOpen, GraduationCap, Target, Hash,
  Building2, FileText, TrendingUp, Trophy,
  CheckCircle2, Pencil, ClipboardList, Calendar,
  School, User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser }       from "@/lib/context/AuthContext";   // ← AuthContext
import {
  pageVariants, staggerContainer, fadeUp,
  heroVariants, avatarVariants, statCardVariants, tableRowVariants,
} from "@/animations/profile/profile";
import styles from "./profile.module.css";

// ── Types ──────────────────────────────────────────────────────────────────

interface ProfileRow {
  full_name:  string | null;
  email:      string;
  avatar_url: string | null;
}
interface StudentRow {
  id:          string;
  student_id:  string | null;
  year_level:  number | null;
  target_exam: string | null;
  school:      string | null;
  program_id:  string | null;
  school_id:   string | null;
}
interface ProgramRow { id: string; name: string; full_name: string; code: string }
interface SchoolRow  { id: string; name: string }
interface SubmissionRow {
  percentage:    number | null;
  passed:        boolean | null;
  submitted_at:  string | null;
  exam_title:    string;
  category_name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function getScoreColor(pct: number | null): string {
  if (pct === null) return "#9ca3af";
  if (pct >= 75)    return "#059669";
  if (pct >= 50)    return "#d97706";
  return "#dc2626";
}
function getPassRateFillClass(rate: number): string {
  if (rate >= 75) return styles.fillGreen;
  if (rate >= 50) return styles.fillAmber;
  return styles.fillRed;
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={`${styles.heroCard} ${styles.skeletonHero}`}>
        <div className={`${styles.skeleton} ${styles.skeletonCircle}`} />
        <div className={styles.skeletonLines}>
          <div className={styles.skeleton} style={{ height: 20, width: "52%" }} />
          <div className={styles.skeleton} style={{ height: 13, width: "36%", marginTop: 2 }} />
          <div className={styles.skeleton} style={{ height: 22, width: "65%", marginTop: 6 }} />
        </div>
      </div>
      <div className={styles.mainGrid} style={{ marginTop: "1rem" }}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.card} style={{ minHeight: 260 }}>
            {[68, 52, 78, 58, 45, 70].map((w, j) => (
              <div key={j} className={styles.skeleton}
                style={{ height: 12, width: `${w}%`, marginBottom: "0.6rem", borderRadius: 5 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router   = useRouter();
  const supabase = createClient();

  // ── Auth from context — no extra network call ─────────────────────────
  const { user, loading: authLoading, error: authError } = useUser();

  const [profile,     setProfile]     = useState<ProfileRow | null>(null);
  const [student,     setStudent]     = useState<StudentRow | null>(null);
  const [program,     setProgram]     = useState<ProgramRow | null>(null);
  const [school,      setSchool]      = useState<SchoolRow | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [totalTaken,  setTotalTaken]  = useState(0);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError,   setDataError]   = useState<string | null>(null);
  const [imgError,    setImgError]    = useState(false);
  const [animate,     setAnimate]     = useState(false);

  useEffect(() => {
    // Wait for auth to resolve before doing anything
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    let cancelled = false;

    const fetchAll = async () => {
      setDataLoading(true);
      setDataError(null);

      try {
        const userId = user.id;   // ← always the logged-in student

        // ── 1. Profile + Student in parallel ─────────────────────────────
        const [profileRes, studentRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, email, avatar_url")
            .eq("id", userId)           // ← own data only
            .single(),
          supabase
            .from("students")
            .select("id, student_id, year_level, target_exam, school, program_id, school_id")
            .eq("id", userId)           // ← own data only
            .single(),
        ]);

        if (cancelled) return;

        const profileData = profileRes.data as ProfileRow | null;
        const studentData = studentRes.data as StudentRow | null;

        // ── 2. Program + School in parallel (only if IDs exist) ───────────
        const [programData, schoolData] = await Promise.all([
          studentData?.program_id
            ? supabase
                .from("programs")
                .select("id, name, full_name, code")
                .eq("id", studentData.program_id)
                .single()
                .then(r => r.data as ProgramRow | null)
            : Promise.resolve(null),
          studentData?.school_id
            ? supabase
                .from("schools")
                .select("id, name")
                .eq("id", studentData.school_id)
                .single()
                .then(r => r.data as SchoolRow | null)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        // ── 3. Total exams taken (submitted + graded + released) ──────────
        const { count: takenCount } = await supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("student_id", userId)     // ← own data only
          .in("status", ["submitted", "graded", "released"]);

        // ── 4. Last 5 RELEASED submissions with score data ────────────────
        //    Released = faculty has explicitly published the result to student
        const { data: rawSubs } = await supabase
          .from("submissions")
          .select("percentage, passed, submitted_at, exam_id")
          .eq("student_id", userId)     // ← own data only
          .eq("status", "released")
          .order("submitted_at", { ascending: false })
          .limit(5);

        if (cancelled) return;

        // ── 5. Enrich submissions with exam + category names ──────────────
        let shapedSubmissions: SubmissionRow[] = [];
        if (rawSubs && rawSubs.length > 0) {
          const examIds = [...new Set(rawSubs.map((s: { exam_id: string | null }) => s.exam_id).filter(Boolean))] as string[];

          const { data: examsRaw } = await supabase
            .from("exams")
            .select("id, title, category_id")
            .in("id", examIds);

          const examsData = (examsRaw ?? []) as { id: string; title: string; category_id: string }[];
          const categoryIds = [...new Set(examsData.map(e => e.category_id).filter(Boolean))] as string[];

          const { data: categoriesRaw } = await supabase
            .from("exam_categories")
            .select("id, name")
            .in("id", categoryIds);

          const examMap     = new Map((examsRaw ?? []).map((e: { id: string; title: string; category_id: string }) => [e.id, e]));
          const categoryMap = new Map((categoriesRaw ?? []).map((c: { id: string; name: string }) => [c.id, c]));

          shapedSubmissions = rawSubs.map((s: { percentage: number | null; passed: boolean | null; submitted_at: string | null; exam_id: string | null }) => {
            const exam     = examMap.get(s.exam_id ?? "");
            const category = categoryMap.get((exam as { category_id?: string })?.category_id ?? "");
            return {
              percentage:    s.percentage,
              passed:        s.passed,
              submitted_at:  s.submitted_at,
              exam_title:    (exam as { title?: string })?.title    ?? "Unknown Exam",
              category_name: (category as { name?: string })?.name  ?? "Uncategorised",
            };
          });
        }

        if (!cancelled) {
          setProfile(profileData);
          setStudent(studentData);
          setProgram(programData);
          setSchool(schoolData);
          setTotalTaken(takenCount ?? 0);
          setSubmissions(shapedSubmissions);
          setTimeout(() => setAnimate(true), 420);
        }
      } catch (err) {
        if (!cancelled) setDataError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [authLoading, user?.id]); // re-run only if auth state changes

  // ── Derived stats (released submissions only) ──────────────────────────
  const scores       = submissions.map(s => s.percentage).filter((v): v is number => v !== null);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const highestScore = scores.length > 0 ? Math.round(Math.max(...scores)) : null;
  const passedCount  = submissions.filter(s => s.passed === true).length;
  const passRate     = submissions.length > 0 ? Math.round((passedCount / submissions.length) * 100) : null;

  // ── Guards ─────────────────────────────────────────────────────────────
  if (authLoading || dataLoading) return <ProfileSkeleton />;

  if (authError || dataError) {
    return (
      <div className={styles.page}>
        <div className={styles.heroCard} style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#dc2626", fontWeight: 600 }}>
            {authError ?? dataError}
          </p>
          <button className={styles.editBtn} style={{ marginTop: "1rem" }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayName  = profile?.full_name ?? "Student";
  const initials     = getInitials(profile?.full_name ?? null);
  const showAvatar   = !!profile?.avatar_url && !imgError;
  const schoolDisplay  = school?.name  ?? student?.school ?? "—";
  const programDisplay = program?.full_name ?? program?.name ?? "—";

  const STAT_MINI = [
    {
      Icon: FileText,     iconColor: "#2563eb", iconBg: "#eff6ff",
      label: "Exams Taken",   value: String(totalTaken),
      empty: totalTaken === 0,
    },
    {
      Icon: TrendingUp,   iconColor: "#059669", iconBg: "#f0fdf4",
      label: "Average Score",
      value: averageScore !== null ? `${averageScore}%` : "—",
      empty: averageScore === null,
    },
    {
      Icon: Trophy,       iconColor: "#d97706", iconBg: "#fffbeb",
      label: "Highest Score",
      value: highestScore !== null ? `${highestScore}%` : "—",
      empty: highestScore === null,
    },
    {
      Icon: CheckCircle2, iconColor: "#dc2626", iconBg: "#fef2f2",
      label: "Pass Rate",
      value: passRate !== null ? `${passRate}%` : "—",
      empty: passRate === null,
    },
  ];

  const INFO_ROWS = [
    { Icon: Mail,         iconColor: "#2563eb", iconBg: "#eff6ff", label: "Email",       value: profile?.email     ?? "—" },
    { Icon: Hash,         iconColor: "#7c3aed", iconBg: "#f5f3ff", label: "Student ID",  value: student?.student_id ?? "—" },
    { Icon: GraduationCap,iconColor: "#d97706", iconBg: "#fffbeb", label: "Program",     value: programDisplay },
    { Icon: BookOpen,     iconColor: "#059669", iconBg: "#f0fdf4", label: "Year Level",  value: student?.year_level ? `Year ${student.year_level}` : "—" },
    { Icon: Building2,    iconColor: "#0891b2", iconBg: "#ecfeff", label: "School",      value: schoolDisplay },
    { Icon: Target,       iconColor: "#dc2626", iconBg: "#fef2f2", label: "Target Exam", value: student?.target_exam ?? "—" },
  ];

  return (
    <motion.div className={styles.page} variants={pageVariants} initial="hidden" animate="visible">

      {/* ── Page header ── */}
      <motion.div className={styles.header} variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className={styles.title}>My Profile</h1>
          <p className={styles.subtitle}>Your personal information and exam performance summary.</p>
        </div>
        <button className={styles.editBtn} onClick={() => router.push("/student/profile/edit")}>
          <Pencil size={14} /> Edit Profile
        </button>
      </motion.div>

      {/* ── Hero card ── */}
      <motion.div className={styles.heroCard} variants={heroVariants} initial="hidden" animate="visible">
        <motion.div className={styles.avatarWrap} variants={avatarVariants} initial="hidden" animate="visible">
          {showAvatar ? (
            <Image src={profile!.avatar_url!} alt={displayName} width={80} height={80}
              className={styles.avatar} onError={() => setImgError(true)} />
          ) : (
            <div className={styles.avatarFallback}>
              <span className={styles.avatarFallbackText}>{initials}</span>
            </div>
          )}
          <span className={styles.onlineDot} />
        </motion.div>
        <div className={styles.heroInfo}>
          <h2 className={styles.heroName}>{displayName}</h2>
          <p className={styles.heroEmail}>{profile?.email}</p>
          <div className={styles.heroBadges}>
            {program?.code        && <span className={`${styles.heroBadge} ${styles.badgeProgram}`}><School size={10} /> {program.code}</span>}
            {student?.year_level  && <span className={`${styles.heroBadge} ${styles.badgeYear}`}><GraduationCap size={10} /> Year {student.year_level}</span>}
            {student?.target_exam && <span className={`${styles.heroBadge} ${styles.badgeTarget}`}><Target size={10} /> {student.target_exam}</span>}
            {student?.student_id  && <span className={`${styles.heroBadge} ${styles.badgeId}`}><Hash size={10} /> {student.student_id}</span>}
          </div>
        </div>
      </motion.div>

      {/* ── Main grid ── */}
      <motion.div className={styles.mainGrid} variants={staggerContainer} initial="hidden" animate="visible">

        {/* Personal info card */}
        <motion.div className={styles.card} variants={fadeUp}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}><User size={14} color="#1e3a5f" /></span>
              Personal Information
            </span>
          </div>
          <motion.div className={styles.infoList} variants={staggerContainer} initial="hidden" animate="visible">
            {INFO_ROWS.map((row) => (
              <motion.div key={row.label} className={styles.infoRow} variants={fadeUp}>
                <div className={styles.infoIconWrap} style={{ background: row.iconBg }}>
                  <row.Icon size={14} color={row.iconColor} strokeWidth={2} />
                </div>
                <div>
                  <div className={styles.infoLabel}>{row.label}</div>
                  <div className={`${styles.infoValue} ${row.value === "—" ? styles.infoValueMuted : ""}`}>
                    {row.value}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Stats card */}
        <motion.div className={styles.card} variants={fadeUp}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}><TrendingUp size={14} color="#1e3a5f" /></span>
              Exam Performance
            </span>
          </div>
          <motion.div className={styles.statsGrid} variants={staggerContainer} initial="hidden" animate="visible">
            {STAT_MINI.map((s) => (
              <motion.div key={s.label} className={styles.statMini} variants={statCardVariants}>
                <div className={styles.statMiniIcon} style={{ background: s.iconBg }}>
                  <s.Icon size={16} color={s.iconColor} strokeWidth={2} />
                </div>
                <div className={`${styles.statMiniValue} ${s.empty ? styles.statMiniValueEmpty : ""}`}>{s.value}</div>
                <div className={styles.statMiniLabel}>{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
          {submissions.length > 0 && (
            <div className={styles.progressSection}>
              <div className={styles.progressLabel}>
                <span className={styles.progressLabelText}>Pass Rate</span>
                <span className={styles.progressLabelPct}>{passRate ?? 0}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${getPassRateFillClass(passRate ?? 0)}`}
                  style={{ width: animate ? `${passRate ?? 0}%` : "0%" }}
                />
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Recent results table (released only) ── */}
      <motion.div className={styles.tableCard} variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.28 }}>
        <div className={styles.tableHead}>
          <span className={styles.tableHeadTitle}>
            <ClipboardList size={15} color="#1e3a5f" strokeWidth={2} /> Recent Results
          </span>
          <span className={styles.tableHeadHint}>last 5 released exams</span>
        </div>

        <AnimatePresence mode="wait">
          {submissions.length === 0 ? (
            <motion.div key="empty" className={styles.emptyState}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className={styles.emptyIconWrap}>
                <ClipboardList size={22} color="#94a3b8" strokeWidth={1.5} />
              </div>
              <p className={styles.emptyTitle}>No released results yet</p>
              <p className={styles.emptyText}>
                Complete a mock or practice exam and your results will appear here once your faculty releases them.
              </p>
            </motion.div>
          ) : (
            <motion.div key="table" className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Exam</th><th>Category</th><th>Score</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <motion.tr key={i} custom={i} variants={tableRowVariants} initial="hidden" animate="visible">
                      <td style={{ maxWidth: 220 }}>
                        <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.82rem",
                          display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.exam_title}
                        </span>
                      </td>
                      <td><span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 500 }}>{s.category_name}</span></td>
                      <td>
                        {s.percentage !== null ? (
                          <span className={styles.scoreVal} style={{ color: getScoreColor(s.percentage) }}>
                            {Math.round(s.percentage)}<span className={styles.scoreTotal}>%</span>
                          </span>
                        ) : <span className={styles.scoreTotal}>—</span>}
                      </td>
                      <td>
                        {s.passed === true
                          ? <span className={`${styles.badge} ${styles.badgePassed}`}><CheckCircle2 size={10} /> Passed</span>
                          : s.passed === false
                            ? <span className={`${styles.badge} ${styles.badgeFailed}`}>Failed</span>
                            : <span className={styles.badge} style={{ background: "#f0f5fa", color: "#64748b", border: "1px solid #e2e8f0" }}>Released</span>}
                      </td>
                      <td>
                        <span className={styles.dateVal}>
                          <Calendar size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                          {formatDate(s.submitted_at)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}