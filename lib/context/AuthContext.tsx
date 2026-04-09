// lib/context/AuthContext.tsx
'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthState {
  user:    User    | null
  session: Session | null
  loading: boolean
  error:   string  | null
}

interface AuthContextValue extends AuthState {
  /** Call this to force a manual refresh (rare). */
  refresh: () => Promise<void>
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:    null,
    session: null,
    loading: true,
    error:   null,
  })

  const fetchingRef = useRef(false)

  const supabase = createClient()

  async function loadSession() {
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        setState({ user: null, session: null, loading: false, error: null })
        return
      }

      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        setState({ user: null, session: null, loading: false, error: error.message })
        return
      }

      setState({
        user,
        session: sessionData.session,
        loading: false,
        error:   null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown auth error'
      setState({ user: null, session: null, loading: false, error: message })
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState(prev => ({
          ...prev,
          user:    session?.user ?? null,
          session: session ?? null,
          loading: false,
          error:   null,
        }))
      },
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ ...state, refresh: loadSession }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useUser(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useUser() must be used inside <AuthProvider>.')
  }
  return ctx
}