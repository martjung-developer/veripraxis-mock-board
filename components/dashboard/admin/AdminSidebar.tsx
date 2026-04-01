// components/dashboard/admin/AdminSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BookOpen,
  FileText,
  BarChart2,
  Bell,
  Settings,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  FolderOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AdminSidebar.module.css";

/* ── Nav structure ── */
const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      {
        href:  "/admin/dashboard",
        icon:  LayoutDashboard,
        label: "Dashboard",
        iconColor: "#3b82f6",
        iconBg:    "rgba(59,130,246,0.15)",
      },
      {
        href:  "/admin/notifications",
        icon:  Bell,
        label: "Notifications",
        iconColor: "#f59e0b",
        iconBg:    "rgba(245,158,11,0.15)",
        badge: 3,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        href:  "/admin/students",
        icon:  Users,
        label: "Students",
        iconColor: "#10b981",
        iconBg:    "rgba(16,185,129,0.15)",
      },
      {
        href:  "/admin/exams",
        icon:  ClipboardList,
        label: "Mock Exams",
        iconColor: "#6366f1",
        iconBg:    "rgba(99,102,241,0.15)",
      },
      {
        href:  "/admin/practice-exams",
        icon:  BookOpen,
        label: "Practice Exams",
        iconColor: "#8b5cf6",
        iconBg:    "rgba(139,92,246,0.15)",
      },
      {
        href:  "/admin/questions",
        icon:  FileText,
        label: "Question Bank",
        iconColor: "#f97316",
        iconBg:    "rgba(249,115,22,0.15)",
      },
    ],
  },
  {
    label: "Academic",
    items: [
      {
        href:  "/admin/programs",
        icon:  GraduationCap,
        label: "Programs",
        iconColor: "#ec4899",
        iconBg:    "rgba(236,72,153,0.15)",
      },
      {
        href:  "/admin/reviewers",
        icon:  FolderOpen,
        label: "Reviewers",
        iconColor: "#14b8a6",
        iconBg:    "rgba(20,184,166,0.15)",
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        href:  "/admin/analytics",
        icon:  BarChart2,
        label: "Analytics",
        iconColor: "#06b6d4",
        iconBg:    "rgba(6,182,212,0.15)",
      },
    ],
  },
];

const BOTTOM_ITEMS = [
  {
    href:  "/admin/settings",
    icon:  Settings,
    label: "Settings",
    iconColor: "#64748b",
    iconBg:    "rgba(100,116,139,0.15)",
  },
];

/* ── Helpers ── */
function getInitials(name: string | null): string {
  if (!name) return "AD";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ═════════════════════════════════════
   COMPONENT
═════════════════════════════════════ */
export default function AdminSidebar() {
  const pathname = usePathname();
  const supabase = createClient();

  const [collapsed,  setCollapsed]  = useState(false);
  const [adminName,  setAdminName]  = useState<string | null>(null);
  const [adminRole,  setAdminRole]  = useState("Faculty");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", data.user.id)
        .single()
        .then(({ data: profile }: { data: { full_name: string | null; role: string } | null }) => {
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

  const initials = getInitials(adminName);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>

      {/* ── Logo ── */}
      <div className={styles.logoArea}>
        <Image
          src="/images/veripraxis-logo.png"
          alt="VeriPraxis"
          width={32}
          height={32}
          className={styles.logoImg}
          priority
        />
        <div className={styles.logoTextWrap}>
          <div className={styles.logoName}>VeriPraxis</div>
          <div className={styles.logoRole}>Admin Panel</div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className={styles.nav}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className={styles.sectionLabel}>{section.label}</div>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <div
                    className={styles.navIcon}
                    style={{ background: item.iconBg }}
                  >
                    <item.icon size={16} color={item.iconColor} strokeWidth={2} />
                  </div>
                  <span className={styles.navLabel}>{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span className={styles.navBadge}>{item.badge}</span>
                  )}
                </Link>
              );
            })}
            <div className={styles.divider} />
          </div>
        ))}

        {/* Bottom items */}
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={styles.navIcon}
                style={{ background: item.iconBg }}
              >
                <item.icon size={16} color={item.iconColor} strokeWidth={2} />
              </div>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── User panel ── */}
      <div className={styles.userPanel}>
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight size={14} />
            : <><ChevronLeft size={14} /><span className={styles.collapseBtnLabel}>Collapse</span></>
          }
        </button>

        <div className={styles.userCard} title={collapsed ? (adminName ?? "Admin") : undefined}>
          <div className={styles.userAvatar}>{initials}</div>
          <div>
            <div className={styles.userName}>
              {adminName ?? "Admin"}
            </div>
            <div className={styles.userRole}>{adminRole}</div>
          </div>
          {!collapsed && (
            <ChevronRight size={13} className={styles.userChevron} />
          )}
        </div>
      </div>

    </aside>
  );
}