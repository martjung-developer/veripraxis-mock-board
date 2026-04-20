// app/api/admin/create/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Called by the Admin panel to create a new faculty account.
// Requires the caller to be authenticated as admin (checked via RLS-safe
// profile lookup).
//
// POST {
//   facultyId: string   // e.g. FAC-ABC123
//   fullName:  string
//   email:     string
//   password:  string   // temporary password; faculty should change on first login
// }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient }              from '@supabase/supabase-js'
import type { Database }             from '@/lib/types/database'
import type { AuthResult }           from '@/lib/types/auth/'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function POST(req: NextRequest): Promise<NextResponse<AuthResult>> {
  try {
    // ── Verify caller is an admin ─────────────────────────────────────────────
    const supabase = createServerClient()
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()

    if (sessionError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorised.' }, { status: 401 })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const { facultyId, fullName, email, password } =
      await req.json() as {
        facultyId?: string
        fullName?:  string
        email?:     string
        password?:  string
      }

    if (!facultyId || !fullName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'All fields are required.' },
        { status: 400 },
      )
    }

    const normFacultyId = facultyId.trim().toUpperCase()
    if (!normFacultyId.startsWith('FAC-')) {
      return NextResponse.json(
        { success: false, error: 'Faculty ID must start with FAC-.' },
        { status: 400 },
      )
    }

    // ── Check faculty_id uniqueness ───────────────────────────────────────────
    const { data: existingFaculty } = await supabaseAdmin
      .from('faculty')
      .select('id')
      .eq('faculty_id', normFacultyId)
      .maybeSingle()

    if (existingFaculty) {
      return NextResponse.json(
        { success: false, error: 'A faculty account with this ID already exists.' },
        { status: 409 },
      )
    }

    // ── 1. Create auth.users row (pre-confirmed — admin-created accounts skip OTP) ──
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name:  fullName.trim(),
        role:       'faculty',
        faculty_id: normFacultyId,
      },
    })

    if (authError || !authData.user) {
      if (authError?.message?.toLowerCase().includes('already')) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists.' },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { success: false, error: authError?.message ?? 'Failed to create account.' },
        { status: 500 },
      )
    }

    const userId = authData.user.id

    // ── 2. Insert profiles row ────────────────────────────────────────────────
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id:        userId,
        email:     email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role:      'faculty',
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { success: false, error: 'Failed to create profile.' },
        { status: 500 },
      )
    }

    // ── 3. Insert faculty row ─────────────────────────────────────────────────
    const { error: facultyError } = await supabaseAdmin
      .from('faculty')
      .insert({
        user_id:    userId,
        faculty_id: normFacultyId,
        full_name:  fullName.trim(),
        email:      email.trim().toLowerCase(),
        is_active:  true,
        created_by: user.id,
      })

    if (facultyError) {
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { success: false, error: 'Failed to create faculty record.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, redirectTo: '/admin/faculty' })
  } catch (err) {
    console.error('[create-faculty] unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Server error.' }, { status: 500 })
  }
}