// lib/hooks/admin/students/edit/useAuthGuard.ts
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser }   from '@/lib/context/AuthContext'

/**
 * Redirects unauthenticated users to /login.
 * Returns authLoading so callers can defer rendering while session resolves.
 */
export function useAuthGuard(): { authLoading: boolean } {
  const { user, loading: authLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) {return}
    if (!user) {router.replace('/login')}
  }, [authLoading, user, router])

  return { authLoading }
}