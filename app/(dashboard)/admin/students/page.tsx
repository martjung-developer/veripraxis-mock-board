// app/(dashboard)/admin/students/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users, Search, Eye, Pencil, Trash2, ChevronLeft,
  ChevronRight, GraduationCap, Loader2, AlertTriangle,
  UserPlus, Filter, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./students.module.css";

// ── Types ──────────────────────────────────────────────────────────────────────
type StudentRow = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  // from students table
  student_id: string | null;
  year_level: number | null;
  target_exam: string | null;
  program_id: string | null;
  school_id: string | null;
  // joined
  program_name: string | null;
  school_name: string | null;
};

type RawJoinRow = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  students: {
    id: string;
    student_id: string | null;
    year_level: number | null;
    target_exam: string | null;
    program_id: string | null;
    school_id: string | null;
    programs: { name: string } | { name: string }[] | null;
    schools:  { name: string } | { name: string }[] | null;
  } | {
    id: string;
    student_id: string | null;
    year_level: number | null;
    target_exam: string | null;
    program_id: string | null;
    school_id: string | null;
    programs: { name: string } | { name: string }[] | null;
    schools:  { name: string } | { name: string }[] | null;
  }[] | null;
};

const PAGE_SIZE = 10;

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow}>
      <td><div className={styles.skelCell} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className={`${styles.skeleton} ${styles.skelAvatar}`} />
        <div style={{ flex: 1 }}>
          <div className={`${styles.skeleton} ${styles.skelText}`} style={{ width: "60%", marginBottom: 5 }} />
          <div className={`${styles.skeleton} ${styles.skelText}`} style={{ width: "80%", height: 10 }} />
        </div>
      </div></td>
      <td><div className={`${styles.skeleton} ${styles.skelText}`} style={{ width: "70%" }} /></td>
      <td><div className={`${styles.skeleton} ${styles.skelText}`} style={{ width: "50%" }} /></td>
      <td><div className={`${styles.skeleton} ${styles.skelBadge}`} /></td>
      <td><div className={`${styles.skeleton} ${styles.skelText}`} style={{ width: "55%" }} /></td>
      <td><div className={styles.skelActions}>
        <div className={`${styles.skeleton} ${styles.skelBtn}`} />
        <div className={`${styles.skeleton} ${styles.skelBtn}`} />
        <div className={`${styles.skeleton} ${styles.skelBtn}`} />
      </div></td>
    </tr>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteModal({
  student, onConfirm, onCancel, deleting,
}: {
  student: StudentRow;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalIcon}>
          <AlertTriangle size={22} color="#dc2626" />
        </div>
        <h3 className={styles.modalTitle}>Delete Student</h3>
        <p className={styles.modalBody}>
          Are you sure you want to delete{" "}
          <strong>{student.full_name ?? student.email}</strong>? This action
          cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button className={styles.btnDanger} onClick={onConfirm} disabled={deleting}>
            {deleting ? <Loader2 size={13} className={styles.spinner} /> : <Trash2 size={13} />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminStudentsPage() {
  const supabase = createClient();

  const [students,    setStudents]    = useState<StudentRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const [filterYear,  setFilterYear]  = useState<number | "all">("all");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: raw, error: err } = await supabase
      .from("profiles")
      .select(`
        id, full_name, email, avatar_url, created_at,
        students(
          id, student_id, year_level, target_exam, program_id, school_id,
          programs(name),
          schools(name)
        )
      `)
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (err) { setError(err.message); setLoading(false); return; }

    const rows = (raw as unknown as RawJoinRow[] ?? []).map((p) => {
      const s = Array.isArray(p.students) ? p.students[0] : p.students;
      const prog = s?.programs
        ? Array.isArray(s.programs) ? s.programs[0] : s.programs
        : null;
      const sch = s?.schools
        ? Array.isArray(s.schools) ? s.schools[0] : s.schools
        : null;
      return {
        id:          p.id,
        full_name:   p.full_name,
        email:       p.email,
        avatar_url:  p.avatar_url,
        created_at:  p.created_at,
        student_id:  s?.student_id  ?? null,
        year_level:  s?.year_level  ?? null,
        target_exam: s?.target_exam ?? null,
        program_id:  s?.program_id  ?? null,
        school_id:   s?.school_id   ?? null,
        program_name: prog?.name ?? null,
        school_name:  sch?.name  ?? null,
      } satisfies StudentRow;
    });

    setStudents(rows);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void fetchStudents(); }, [fetchStudents]);

  // ── Filter + Paginate ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        !q ||
        (s.full_name?.toLowerCase().includes(q) ?? false) ||
        s.email.toLowerCase().includes(q) ||
        (s.program_name?.toLowerCase().includes(q) ?? false) ||
        (s.student_id?.toLowerCase().includes(q) ?? false);
      const matchYear =
        filterYear === "all" || s.year_level === filterYear;
      return matchSearch && matchYear;
    });
  }, [students, search, filterYear]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterYear]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    // Delete from students first (FK), then profiles
    await supabase.from("students").delete().eq("id", deleteTarget.id);
    const { error: e } = await supabase.from("profiles").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (e) { setError(e.message); }
    else {
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  }

  const yearOptions = useMemo(() => {
    const years = [...new Set(students.map((s) => s.year_level).filter(Boolean))] as number[];
    return years.sort((a, b) => a - b);
  }, [students]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Users size={20} color="#fff" />
          </div>
          <div>
            <h1 className={styles.heading}>Students</h1>
            <p className={styles.headingSub}>
              {loading ? "Loading…" : `${filtered.length} enrolled student${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/students/new" className={styles.btnPrimary}>
            <UserPlus size={14} /> Add Student
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by name, email, program, student ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <Filter size={13} className={styles.filterIcon} />
          <select
            className={styles.filterSelect}
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All Years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
        </div>

        {(search || filterYear !== "all") && (
          <button
            className={styles.clearFilters}
            onClick={() => { setSearch(""); setFilterYear("all"); }}
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Program / Year</th>
                <th>Target Exam</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>
                        <GraduationCap size={22} color="var(--text-muted)" />
                      </div>
                      <p className={styles.emptyTitle}>No students found</p>
                      <p className={styles.emptySub}>
                        {search || filterYear !== "all"
                          ? "Try adjusting your search or filters."
                          : "No enrolled students in the system yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id} className={styles.tableRow}>
                    {/* Student */}
                    <td>
                      <div className={styles.studentCell}>
                        <div className={styles.avatar}>
                          {s.avatar_url
                            ? <img src={s.avatar_url} alt="" className={styles.avatarImg} />
                            : <span className={styles.avatarInitials}>{getInitials(s.full_name, s.email)}</span>
                          }
                        </div>
                        <div>
                          <div className={styles.studentName}>{s.full_name ?? "—"}</div>
                          <div className={styles.studentEmail}>{s.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td>
                      <span className={styles.studentIdChip}>
                        {s.student_id ?? <span className={styles.cellMuted}>—</span>}
                      </span>
                    </td>

                    {/* Program / Year */}
                    <td>
                      <div className={styles.programCell}>
                        <span className={styles.programName}>
                          {s.program_name ?? <span className={styles.cellMuted}>No program</span>}
                        </span>
                        {s.year_level && (
                          <span className={styles.yearBadge}>Year {s.year_level}</span>
                        )}
                      </div>
                    </td>

                    {/* Target Exam */}
                    <td>
                      <span className={styles.targetExam}>
                        {s.target_exam ?? <span className={styles.cellMuted}>—</span>}
                      </span>
                    </td>

                    {/* Joined */}
                    <td>
                      <span className={styles.dateCell}>{formatDate(s.created_at)}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/students/${s.id}`} className={styles.actionView} title="View">
                          <Eye size={13} />
                        </Link>
                        <Link href={`/admin/students/${s.id}/edit`} className={styles.actionEdit} title="Edit">
                          <Pencil size={13} />
                        </Link>
                        <button
                          className={styles.actionDelete}
                          onClick={() => setDeleteTarget(s)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className={styles.pageButtons}>
              <button
                className={styles.pageBtn}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…"
                    ? <span key={`e${i}`} className={styles.pageDots}>…</span>
                    : <button
                        key={p}
                        className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
                        onClick={() => setPage(p as number)}
                      >{p}</button>
                )}
              <button
                className={styles.pageBtn}
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          student={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}