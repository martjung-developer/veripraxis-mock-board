/**
 * lib/services/admin/students/student.service.ts
 *
 * Pure data layer for the students admin domain.
 * No React, no UI state, no business logic beyond data fetching.
 */

import type { SupabaseClient }  from '@supabase/supabase-js'
import type { Database }        from '@/lib/types/database'
import type {
  DeleteStudentResult,
  FetchStudentsResult,
  StudentRaw,
} from '@/lib/types/admin/students/student.types'
import { mapStudentRow } from '@/lib/utils/admin/students/mappers'

type AppClient = SupabaseClient<Database>

// ── Fetch ─────────────────────────────────────────────────────────────────────

/* Fetches all students with their profile and program joins. */
export async function getStudentsWithProfiles(
  client: AppClient,
): Promise<FetchStudentsResult> {
  const { data, error } = await client
    .from('students')
    .select(`
      id,
      student_id,
      year_level,
      program_id,
      created_at,
      profiles!inner (
        full_name,
        email,
        role
      ),
      programs (
        id,
        code,
        name
      )
    `)
    .eq('profiles.role', 'student')
    .order('created_at', { ascending: false })

  if (error) {
    return { students: [], error: 'Failed to load students.' }
  }

  const students = (data as unknown as StudentRaw[]).map(mapStudentRow)
  return { students, error: null }
}

export async function createStudent(
  client: AppClient,
  payload: { student_id: string; year_level: number; program_id: string }
) {
  const { data, error } = await client
    .from('students')
    .insert([payload])
    .select()

  if (error) {
    return { student: null, error: error.message }
  }

  return { student: data?.[0] ?? null, error: null }
}


// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Deletes a student by removing their profile row.
 * Cascade rules in the database handle the linked `students` row.
 */
export async function deleteStudentById(
  client: AppClient,
  id:     string,
): Promise<DeleteStudentResult> {
  const { error } = await client
    .from('profiles')
    .delete()
    .eq('id', id)

  return { error: error?.message ?? null }
}