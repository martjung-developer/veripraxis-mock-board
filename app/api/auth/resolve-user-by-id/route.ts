// app/api/auth/resolve-user-by-id/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST { id: string }
//
// Accepts a student_id / faculty_id / admin_id, looks up the linked email in
// the appropriate table, and returns it so the client can call
// supabase.auth.signInWithPassword(email, password).
//
// Uses the Supabase SERVICE ROLE key — server-side only, never exposed to the
// browser. All table queries bypass RLS intentionally.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { createClient }                   from '@supabase/supabase-js'
import type { Database }                  from '@/lib/types/database'
import { normaliseId, getRoleFromId }     from '@/lib/utils/auth'
import type { ResolveUserResult }         from '@/lib/types/auth/'

// ── Service-role client ───────────────────────────────────────────────────────
// NEVER expose this outside of server-side code (API routes, Server Actions).

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service role env vars.')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

// ── Row shapes returned by the .returns<>() helper ───────────────────────────

interface StudentWithProfile {
  id:       string
  profiles: { email: string } | null
}

interface FacultyRow {
  email: string
}

interface AdminRow {
  email: string
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<ResolveUserResult>> {
  try {
    const body  = await req.json() as Record<string, unknown>
    const rawId = typeof body.id === 'string' ? body.id : ''

    if (!rawId) {
      return NextResponse.json({ found: false, error: 'ID is required.' }, { status: 400 })
    }

    const id   = normaliseId(rawId)
    const role = getRoleFromId(id)

    if (!role) {
      return NextResponse.json(
        { found: false, error: 'Invalid ID format. Use STU-…, FAC-…, or ADM-…' },
        { status: 400 },
      )
    }

    const supabase = getServiceClient()

    // ── Student ───────────────────────────────────────────────────────────────
    if (role === 'student') {
      const { data, error } = await supabase
        .from('students')
        .select('id, profiles:id ( email )')
        .eq('student_id', id)
        .single()
        .overrideTypes<StudentWithProfile, { merge: false }>()

      if (error || !data) {
        return NextResponse.json({ found: false, error: 'Student ID not found.' }, { status: 404 })
      }

      const email = data.profiles?.email
      if (!email) {
        return NextResponse.json(
          { found: false, error: 'Student account has no linked email.' },
          { status: 404 },
        )
      }

      return NextResponse.json({ found: true, email, role: 'student' })
    }

    // ── Faculty ───────────────────────────────────────────────────────────────
    if (role === 'faculty') {
      const { data, error } = await supabase
        .from('faculty')
        .select('email')
        .eq('faculty_id', id)
        .eq('is_active', true)
        .single()
        .overrideTypes<FacultyRow, { merge: false }>()

      if (error || !data?.email) {
        return NextResponse.json(
          { found: false, error: 'Faculty ID not found or account is inactive.' },
          { status: 404 },
        )
      }

      return NextResponse.json({ found: true, email: data.email, role: 'faculty' })
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('admins')
      .select('email')
      .eq('admin_id', id)
      .single()
      .overrideTypes<AdminRow, { merge: false }>()

    if (error || !data?.email) {
      return NextResponse.json({ found: false, error: 'Admin ID not found.' }, { status: 404 })
    }

    return NextResponse.json({ found: true, email: data.email, role: 'admin' })

  } catch (err) {
    console.error('[resolve-user-by-id] Unexpected error:', err)
    return NextResponse.json({ found: false, error: 'Server error. Please try again.' }, { status: 500 })
  }
}