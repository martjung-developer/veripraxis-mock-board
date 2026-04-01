// app/(dashboard)/admin/layout.tsx
import type { Metadata } from "next";
import AdminSidebar from "@/components/dashboard/admin/AdminSideBar";
import AdminTopbar  from "@/components/dashboard/admin/AdminTopbar";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title:       "VeriPraxis — Admin Panel",
  description: "Faculty & admin dashboard for managing exams, students, and programs.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.body}>
        <AdminTopbar />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}