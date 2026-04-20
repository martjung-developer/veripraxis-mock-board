// app/api/auth/create-profile/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type Body = {
  studentId: string
  fullName: string
  programCode: string
  yearLevel: string
}

async function getSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>

    if (
      !body.studentId ||
      !body.fullName ||
      !body.programCode ||
      !body.yearLevel
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServer()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    const userId = user.id
    const email = user.email

    // ✅ Prevent duplicate profile
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true }) // already created
    }

    // 🔥 Insert into profiles
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      full_name: body.fullName,
      role: 'student',
    })

    if (profileError) {
      console.error('[create-profile] profile error:', profileError.message)
      return NextResponse.json(
        { success: false, error: 'Failed to create profile.' },
        { status: 500 }
      )
    }

    // 🔥 Insert into students table (if you have one)
    const { error: studentError } = await supabase.from('students').insert({
      user_id: userId,
      student_id: body.studentId,
      full_name: body.fullName,
      program_code: body.programCode,
      year_level: body.yearLevel,
    })

    if (studentError) {
      console.error('[create-profile] student error:', studentError.message)
      return NextResponse.json(
        { success: false, error: 'Failed to create student record.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[create-profile] unexpected:', err)
    return NextResponse.json(
      { success: false, error: 'Server error.' },
      { status: 500 }
    )
  }
}