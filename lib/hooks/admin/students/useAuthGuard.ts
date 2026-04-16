/**
 * lib/hooks/admin/students/useAuthGuard.ts
 *
 * Redirects to /login if the user is not authenticated.
 * Returns `isReady` so the caller can gate rendering until auth resolves.
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser }   from '@/lib/context/AuthContext'

export interface UseAuthGuardReturn {
  /** True once auth has resolved AND the user is authenticated. */
  isReady: boolean
}

export function useAuthGuard(): UseAuthGuardReturn {
  const router = useRouter()
  const { user, loading: authLoading } = useUser()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  return { isReady: !authLoading && !!user }
}