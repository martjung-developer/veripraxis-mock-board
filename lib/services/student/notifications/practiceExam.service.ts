// lib/services/student/practice-exams/practiceExam.service.ts

import { PRACTICE_STATUS } from '@/lib/constants/student/practice-exams/practice-exams'
import { createBulkNotifications } from '@/lib/utils/admin/notifications/notifications'
//       ☝️ admin util — signature is { user_ids[], title, message, type }
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database'

const supabase: SupabaseClient<Database> = createClient('your-supabase-url', 'your-supabase-key')

export async function completeAttempt(
  submissionId: string,
  score:        number,
  percentage:   number,
  passed:       boolean,
  examTitle:    string,
  studentName:  string,
): Promise<{ error: string | null }> {

  // 1. Update submission status
  const { error } = await supabase
    .from('submissions')
    .update({
      status: PRACTICE_STATUS.SUBMITTED,
      submitted_at: new Date().toISOString(),
      score,
      percentage,
      passed,
    } as Partial<Database['public']['Tables']['submissions']['Update']>)
    .eq('id', submissionId)

  if (error) return { error: 'Could not save final result.' }

  // 2. Fetch staff IDs via SECURITY DEFINER RPC
  const { data: staffRows, error: staffErr } = await supabase.rpc('get_staff_ids')

  if (staffErr) {
    console.error('[completeAttempt] get_staff_ids RPC error:', staffErr.message)
    return { error: null } // non-fatal
  }

  const staffIds: string[] = (staffRows as { id: string }[] ?? []).map((r) => r.id)

  if (staffIds.length === 0) {
    console.warn('[completeAttempt] no staff found — notification skipped')
    return { error: null }
  }

  // 3. Insert notifications — admin util takes a single object, not an array
  const { error: notifErr } = await createBulkNotifications({
    user_ids: staffIds,
    type:     'exam',
    title:    'Practice Exam Submitted',
    message:  `${studentName} completed "${examTitle}" with a score of ${percentage}%.`,
  })

  if (notifErr) {
    console.error('[completeAttempt] createBulkNotifications error:', notifErr)
  }

  return { error: null }
}

