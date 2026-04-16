// lib/hooks/admin/students/create/useAuthGuard.ts
//
// Redirects unauthenticated users to /login.
// Extracted so any admin page can reuse it without touching AuthContext directly.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser }   from '@/lib/context/AuthContext'

/**
 * Redirects to /login when auth loading is complete and no user is found.
 * Safe to call at the top of any 'use client' admin page.
 */
export function useAuthGuard(): void {
  const router                    = useRouter()
  const { user, loading: authLoading } = useUser()

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login')
  }, [authLoading, user, router])
}