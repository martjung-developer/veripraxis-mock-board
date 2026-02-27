import DashboardLayout from '@/components/layout/DashboardLayout'

export default function StudentGroupLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="student">{children}</DashboardLayout>
}
