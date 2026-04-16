/**
 * lib/services/admin/students/program.service.ts
 *
 * Pure data layer for programs used on the students admin page.
 * No React, no UI state, no business logic.
 */

import type { SupabaseClient }    from '@supabase/supabase-js'
import type { Database }          from '@/lib/types/database'
import type {
  FetchProgramsResult,
  Program,
} from '@/lib/types/admin/students/program.types'

type AppClient = SupabaseClient<Database>

/**
 * Fetches all programs ordered by code ascending.
 * Returns only the columns needed by the students page.
 */
export async function getPrograms(
  client: AppClient,
): Promise<FetchProgramsResult> {
  const { data, error } = await client
    .from('programs')
    .select('id, code, name')
    .order('code', { ascending: true })

  if (error) {
    return { programs: [], error: error.message }
  }

  return { programs: (data ?? []) as Program[], error: null }
}