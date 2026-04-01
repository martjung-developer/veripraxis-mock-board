// components/dashboard/admin/AdminTopbar.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bell,
  Settings,
  ChevronDown,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AdminTopbar.module.css";

/* ── Build breadcrumb from pathname ── */
function buildBreadcrumb(pathname: string): { label: string; href: string }[] {
  const LABELS: Record<string, string> = {
    admin:           "Admin",
    dashboard:       "Dashboard",
    students:        "Students",
    exams:           "Mock Exams",
    "practice-exams":"Practice Exams",
    questions:       "Question Bank",
    programs:        "Programs",
    reviewers:       "Reviewers",
    analytics:       "Analytics",
    notifications:   "Notifications",
    settings:        "Settings",
    results:         "Results",
    assign:          "Assign Exam",
    create:          "Create",
    edit:            "Edit",
  };

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";

  for (const seg of segments) {
    path += `/${seg}`;
    crumbs.push({
      label: LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      href:  path,
    });
  }

  return crumbs;
}

function getInitials(name: string | null): string {
  if (!name) return "AD";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ═════════════════════════════════════
   COMPONENT
═════════════════════════════════════ */
export default function AdminTopbar() {
  const pathname = usePathname();
  const supabase = createClient();

  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState("Faculty");
  const [search,    setSearch]    = useState("");
  const [hasNotif,  setHasNotif]  = useState(true);

  useEffect(() => {
      supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", data.user.id)
        .single()
        .then(({ data: profile }: { data: { full_name: string; role: string } | null }) => {
          if (profile) {
            setAdminName(profile.full_name ?? "Admin");
            setAdminRole(
              profile.role === "faculty" ? "Faculty" :
              profile.role === "admin"   ? "Admin"   : "Staff"
            );
          }
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crumbs   = buildBreadcrumb(pathname);
  const initials = getInitials(adminName);

  return (
    <header className={styles.topbar}>

      {/* ── Left: breadcrumb ── */}
      <div className={styles.left}>
        <nav className={styles.breadcrumb}>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={crumb.href} className={styles.breadcrumb}>
                {i > 0 && <span className={styles.breadcrumbSep}>/</span>}
                {isLast ? (
                  <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className={styles.breadcrumbItem}>
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      {/* ── Center: search ── */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}><Search size={14} /></span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search students, exams, programs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Right: actions ── */}
      <div className={styles.right}>
        {/* Role pill */}
        <span className={styles.rolePill}>
          <Shield size={11} />
          {adminRole}
        </span>

        {/* Notifications */}
        <button
          className={styles.iconBtn}
          title="Notifications"
          onClick={() => setHasNotif(false)}
        >
          <Bell size={15} />
          {hasNotif && <span className={styles.notifDot} />}
        </button>

        {/* Settings shortcut */}
        <Link href="/admin/settings" className={styles.iconBtn} title="Settings">
          <Settings size={15} />
        </Link>

        {/* Avatar */}
        <button className={styles.avatarBtn}>
          <div className={styles.avatarCircle}>{initials}</div>
          <span className={styles.avatarName}>{adminName ?? "Admin"}</span>
          <ChevronDown size={12} className={styles.avatarChevron} />
        </button>
      </div>

    </header>
  );
}