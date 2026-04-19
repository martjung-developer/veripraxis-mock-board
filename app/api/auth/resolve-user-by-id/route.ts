// app/api/auth/resolve-user-by-id/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Accepts a student_id / faculty_id / admin_id and returns the linked email
// so the client can call supabase.auth.signInWithPassword(email, password).
//
// Uses the Supabase SERVICE ROLE key (server-side only) to query tables
// that normal RLS would otherwise block.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { createClient }                   from '@supabase/supabase-js'
import type { Database }                  from '@/lib/types/database'
import { normaliseId, getRoleFromId }     from '@/lib/utils/auth/index'
import type { ResolveUserResult }         from '@/lib/types/auth/index'

// ── Service-role client (NEVER expose this client to the browser) ─────────────
function getServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY    // secret — server only
  if (!url || !key) throw new Error('Missing Supabase service role env vars')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest): Promise<NextResponse<ResolveUserResult>> {
  try {
    const body = await req.json() as Record<string, unknown>
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

    if (role === 'student') {
      const { data } = await supabase
        .from('students')
        .select('id, profiles:id ( email )')
        .eq('student_id', id)
        .single()
        .returns<{ id: string; profiles: { email: string } | null }>()

      const email = data?.profiles?.email
      if (!email) return NextResponse.json({ found: false, error: 'Student ID not found.' }, { status: 404 })
      return NextResponse.json({ found: true, email, role: 'student' })
    }

    if (role === 'faculty') {
      const { data } = await supabase
        .from('faculty')
        .select('email')
        .eq('faculty_id', id)
        .eq('is_active', true)
        .single()
        .returns<{ email: string } | null>()

      if (!data?.email) return NextResponse.json({ found: false, error: 'Faculty ID not found or account is inactive.' }, { status: 404 })
      return NextResponse.json({ found: true, email: data.email, role: 'faculty' })
    }

    // admin
    const { data } = await supabase
      .from('admins')
      .select('email')
      .eq('admin_id', id)
      .single()
      .returns<{ email: string } | null>()

    if (!data?.email) return NextResponse.json({ found: false, error: 'Admin ID not found.' }, { status: 404 })
    return NextResponse.json({ found: true, email: data.email, role: 'admin' })

  } catch {
    return NextResponse.json({ found: false, error: 'Server error. Please try again.' }, { status: 500 })
  }
}