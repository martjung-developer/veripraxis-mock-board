// components/dashboard/admin/AdminTopbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Settings,
  ChevronDown,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AdminTopbar.module.css";

function getInitials(name: string | null): string {
  if (!name) return "FA";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ═════════════════════════════════════
   COMPONENT
═════════════════════════════════════ */
export default function AdminTopbar() {
  const supabase = createClient();

  const [facultyName, setFacultyName] = useState<string | null>(null);
  const [search,      setSearch]      = useState("");
  const [hasNotif,    setHasNotif]    = useState(true);

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
            setFacultyName(profile.full_name ?? "Faculty");
          }
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = getInitials(facultyName);

  return (
    <header className={styles.topbar}>

      {/* ── Left: search bar (moved from center) ── */}
      <div className={styles.left}>
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
      </div>

      {/* ── Right: actions ── */}
      <div className={styles.right}>

        {/* Faculty role pill */}
        <span className={styles.rolePill}>
          <GraduationCap size={11} />
          Faculty
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

        {/* Avatar with real faculty name */}
        <button className={styles.avatarBtn}>
          <div className={styles.avatarCircle}>{initials}</div>
          <span className={styles.avatarName}>{facultyName ?? "Faculty"}</span>
          <ChevronDown size={12} className={styles.avatarChevron} />
        </button>
      </div>

    </header>
  );
}