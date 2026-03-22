// app/(dashboard)/student/dashboard/page.tsx
import { requireRole }   from '@/lib/auth/helpers'
import DashboardClient   from '../DashboardClient'

export default async function StudentDashboardPage() {
  const { profile } = await requireRole(['student'])
  const firstName   = profile.full_name?.split(' ')[0] ?? 'Student'

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return <DashboardClient firstName={firstName} greeting={greeting} />
}