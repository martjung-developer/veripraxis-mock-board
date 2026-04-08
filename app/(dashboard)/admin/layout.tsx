// app/(dashboard)/admin/layout.tsx
// Uses a client wrapper to sync the sidebar's collapsed state
// to a data attribute on the shell div, so layout.module.css
// can respond with the correct margin-left without JavaScript
// style injection.

import type { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata: Metadata = {
  title:       "VERIPRAXIS - Admin Panel",
  description: "Faculty & admin dashboard for managing exams, students, and programs.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}