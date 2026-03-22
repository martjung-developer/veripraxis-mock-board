// app/(dashboard)/student/layout.tsx
import { requireRole }   from '@/lib/auth/helpers'
import StudentSidebar    from '@/components/dashboard/student/StudentSidebar'
import StudentTopbar     from '@/components/dashboard/student/StudentTopbar'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireRole(['student'])

  return (
    <div style={{
      display:         'flex',
      minHeight:       '100vh',
      backgroundColor: '#f8fafc',
      fontFamily:      "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    }}>
      <StudentSidebar profile={profile} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <StudentTopbar profile={profile} />
        <main style={{
          flex:      1,
          padding:   '2rem 2.5rem',
          overflowY: 'auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}