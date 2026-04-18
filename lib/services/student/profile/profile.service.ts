// lib/services/student/profile/profile.service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'

type TypedClient = SupabaseClient<Database>

// ── Row shapes derived from DB types ─────────────────────────────────────────
export type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'full_name' | 'email' | 'avatar_url'
>

export type StudentRow = Pick<
  Database['public']['Tables']['students']['Row'],
  'id' | 'student_id' | 'year_level' | 'target_exam' | 'school' | 'program_id' | 'school_id'
>

export type ProgramRow = Pick<
  Database['public']['Tables']['programs']['Row'],
  'id' | 'name' | 'full_name' | 'code'
>

export type SchoolRow = Pick<
  Database['public']['Tables']['schools']['Row'],
  'id' | 'name'
>

export interface SubmissionRow {
  percentage:    number | null
  passed:        boolean | null
  submitted_at:  string | null
  exam_title:    string
  category_name: string
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getProfile(
  client: TypedClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data } = await client
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', userId)
    .single()

  return data as ProfileRow | null
}

export async function getStudent(
  client: TypedClient,
  userId: string,
): Promise<StudentRow | null> {
  const { data } = await client
    .from('students')
    .select('id, student_id, year_level, target_exam, school, program_id, school_id')
    .eq('id', userId)
    .single()

  return data as StudentRow | null
}

export async function getProgram(
  client:    TypedClient,
  programId: string,
): Promise<ProgramRow | null> {
  const { data } = await client
    .from('programs')
    .select('id, name, full_name, code')
    .eq('id', programId)
    .single()

  return data as ProgramRow | null
}

export async function getSchool(
  client:   TypedClient,
  schoolId: string,
): Promise<SchoolRow | null> {
  const { data } = await client
    .from('schools')
    .select('id, name')
    .eq('id', schoolId)
    .single()

  return data as SchoolRow | null
}

export async function getTotalTaken(
  client: TypedClient,
  userId: string,
): Promise<number> {
  const { count } = await client
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)
    .in('status', ['submitted', 'graded', 'released'])

  return count ?? 0
}

// Raw shape from the submissions query before we join exams/categories
interface RawSubmission {
  percentage:   number | null
  passed:       boolean | null
  submitted_at: string | null
  exam_id:      string | null
}

interface RawExam {
  id:          string
  title:       string
  category_id: string | null
}

interface RawCategory {
  id:   string
  name: string
}

export async function getRecentSubmissions(
  client: TypedClient,
  userId: string,
): Promise<SubmissionRow[]> {
  const { data: rawSubs } = await client
    .from('submissions')
    .select('percentage, passed, submitted_at, exam_id')
    .eq('student_id', userId)
    .eq('status', 'released')
    .order('submitted_at', { ascending: false })
    .limit(5)

  if (!rawSubs || rawSubs.length === 0) { return [] }

  const subs = rawSubs as RawSubmission[]

  const examIds = [
    ...new Set(subs.map((s) => s.exam_id).filter((id): id is string => id !== null)),
  ]

  const { data: examsRaw } = await client
    .from('exams')
    .select('id, title, category_id')
    .in('id', examIds)

  const exams = (examsRaw ?? []) as RawExam[]

  const categoryIds = [
    ...new Set(exams.map((e) => e.category_id).filter((id): id is string => id !== null)),
  ]

  const { data: categoriesRaw } = await client
    .from('exam_categories')
    .select('id, name')
    .in('id', categoryIds)

  const examMap     = new Map(exams.map((e) => [e.id, e]))
  const categoryMap = new Map((categoriesRaw as RawCategory[] ?? []).map((c) => [c.id, c]))

  return subs.map((s) => {
    const exam     = s.exam_id ? examMap.get(s.exam_id) : undefined
    const category = exam?.category_id ? categoryMap.get(exam.category_id) : undefined
    return {
      percentage:    s.percentage,
      passed:        s.passed,
      submitted_at:  s.submitted_at,
      exam_title:    exam?.title     ?? 'Unknown Exam',
      category_name: category?.name  ?? 'Uncategorised',
    }
  })
}