// app/(dashboard)/student/layout.tsx
import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentSidebar   from '@/components/dashboard/student/StudentSidebar'
import StudentTopbar    from '@/components/dashboard/student/StudentTopbar'
import type { Profile } from '@/lib/types/auth'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile: Profile = {
    id:         user.id,
    email:      user.email ?? '',
    full_name:  user.user_metadata?.full_name ?? 'Student',
    role:       (user.user_metadata?.role ?? 'student') as 'student',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <div style={{
      display:    'flex',
      minHeight:  '100vh',
      background: '#eef2f7',   /* cool-blue tinted light grey — not stark white, not dark */
      fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    }}>
      <StudentSidebar profile={profile} />
      <div style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        minWidth:      0,
        background:    '#eef2f7',
      }}>
        <StudentTopbar profile={profile} />
        <main style={{
          flex:      1,
          padding:   '1.75rem 2rem',
          overflowY: 'auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}