// app/(dashboard)/student/dashboard/page.tsx
import {
  ClipboardList, BookOpen, FileText,
  BarChart2, Trophy, Flame, TrendingUp,
} from 'lucide-react'
import { requireRole }    from '@/lib/auth/helpers'
import DashboardClient    from './DashboardClient'

export default async function StudentDashboardPage() {
  const { profile } = await requireRole(['student'])
  const firstName   = profile.full_name?.split(' ')[0] ?? 'Student'

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { icon: ClipboardList, label: 'Exams Taken',    value: '0', color: '#2563a8', bg: '#dbeafe', accent: '#3b82f6' },
    { icon: Trophy,        label: 'Best Score',     value: '—', color: '#92600a', bg: '#fef3c7', accent: '#f59e0b' },
    { icon: BookOpen,      label: 'Reviewers Done', value: '0', color: '#15693a', bg: '#d1fae5', accent: '#10b981' },
    { icon: Flame,         label: 'Day Streak',     value: '1', color: '#b91c1c', bg: '#fee2e2', accent: '#ef4444' },
  ]

  const quickActions = [
    { href: '/student/mock-exams',      icon: ClipboardList, label: 'Take a Mock Exam',  desc: 'Timed simulation',   color: '#1d4ed8', bg: '#eff6ff' },
    { href: '/student/reviewers',       icon: BookOpen,      label: 'Start a Reviewer',  desc: 'Practice questions', color: '#047857', bg: '#ecfdf5' },
    { href: '/student/study-materials', icon: FileText,      label: 'Study Materials',   desc: 'Read & learn',       color: '#6d28d9', bg: '#f5f3ff' },
    { href: '/student/progress',        icon: TrendingUp,    label: 'View Progress',     desc: 'Track your growth',  color: '#b45309', bg: '#fffbeb' },
    { href: '/student/results',         icon: Trophy,        label: 'Past Results',      desc: 'See your scores',    color: '#be123c', bg: '#fff1f2' },
    { href: '/student/profile',         icon: BarChart2,     label: 'My Profile',        desc: 'Update your info',   color: '#0e7490', bg: '#ecfeff' },
  ]

  const progressItems = [
    { label: 'Mock Exams Completed', pct: 0, color: '#3b82f6' },
    { label: 'Reviewers Finished',   pct: 0, color: '#10b981' },
    { label: 'Study Materials Read', pct: 0, color: '#8b5cf6' },
  ]

  return (
    <DashboardClient
      firstName={firstName}
      greeting={greeting}
      stats={stats}
      quickActions={quickActions}
      progressItems={progressItems}
    />
  )
}