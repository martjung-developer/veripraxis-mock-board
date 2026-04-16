// lib/hooks/admin/students/[examId]/useAuthGuard.ts
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser }   from '@/lib/context/AuthContext'

export function useAuthGuard(): { authLoading: boolean } {
  const router = useRouter()
  const { user, loading: authLoading } = useUser()

  useEffect(() => {
    if (authLoading) { return }
    if (!user) { router.replace('/login') }
  }, [authLoading, user, router])

  return { authLoading }
}