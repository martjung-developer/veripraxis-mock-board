// app/api/auth/create-profile/route.ts
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

interface CreateProfileBody {
  studentId: string
  fullName: string
  programCode: string
  yearLevel: string
  phone?: string
}

async function getSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
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
    console.log('[create-profile] HIT')

    const raw = (await req.json()) as Partial<CreateProfileBody>

    if (!raw.studentId || !raw.fullName || !raw.programCode || !raw.yearLevel) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const yearLevelNum = parseInt(raw.yearLevel, 10)

    if (isNaN(yearLevelNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid year level' },
        { status: 400 }
      )
    }

    const supabase = (await getSupabaseServer()) as any

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id

    // PROFILE
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: user.email!,
          full_name: raw.fullName.trim(),
          role: 'student',
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      console.error('[profiles error]', profileError)
      return NextResponse.json(
        { success: false, error: profileError.message },
        { status: 500 }
      )
    }

    // PROGRAM
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id')
      .eq('code', raw.programCode.trim())
      .single()

    if (programError || !program) {
      return NextResponse.json(
        { success: false, error: 'Invalid program code' },
        { status: 400 }
      )
    }

    // STUDENT
    const { error: studentError } = await supabase
      .from('students')
      .upsert(
        {
          id: userId,
          student_id: raw.studentId.trim(),
          year_level: yearLevelNum,
          program_id: program.id,
        },
        { onConflict: 'id' }
      )

    if (studentError) {
      console.error('[students error]', studentError)
      return NextResponse.json(
        { success: false, error: studentError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId,
    })
  } catch (error) {
    console.error('[create-profile error]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}