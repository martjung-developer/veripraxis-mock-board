// app/(dashboard)/admin/AdminLayoutClient.tsx
"use client";

import { useState } from "react";
import AdminSidebar from "@/components/dashboard/admin/AdminSideBar";
import AdminTopbar  from "@/components/dashboard/admin/AdminTopbar";
import styles from "./layout.module.css";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={styles.shell}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <AdminSidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <div className={styles.body}>
        <AdminTopbar />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}