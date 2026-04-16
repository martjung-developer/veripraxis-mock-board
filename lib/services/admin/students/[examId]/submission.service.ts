// lib/services/admin/students/[examId]/submission.service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import type { SubmissionRaw, Submission } from '@/lib/types/admin/students/[examId]/submission.types'
import { mapSubmissionRow } from '@/lib/utils/admin/students/[examId]/mappers'

type TypedClient = SupabaseClient<Database>

export async function getSubmissions(
  client:    TypedClient,
  studentId: string,
): Promise<Submission[]> {
  const { data, error } = await client
    .from('submissions')
    .select(`
      id, status, percentage, passed, submitted_at,
      exams ( title, exam_type )
    `)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(20)

  if (error) { throw new Error(error.message) }

  return (data ?? []).map((row) => mapSubmissionRow(row as unknown as SubmissionRaw))
}