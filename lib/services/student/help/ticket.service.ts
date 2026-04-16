// lib/services/student/help/ticket.service.ts
// Supabase mutation for creating support tickets. No UI, no state, fully typed.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type { SupportTicketInsert } from '@/lib/types/student/help/ticket.types'

type DB = SupabaseClient<Database>

// ── createTicket ─────────────────────────────────────────────────────────────
// Inserts one support ticket row. Throws on error so the hook can catch and
// surface a typed TicketSubmitError.

export async function createTicket(
  db:      DB,
  payload: SupportTicketInsert,
): Promise<void> {
  // `support_tickets` is not in the generated Database type yet.
  // We cast through `unknown` at this single service boundary, keeping all
  // downstream code free of unsafe casts.
  const { error } = await (db as unknown as {
    from: (table: string) => {
      insert: (rows: SupportTicketInsert[]) => Promise<{ error: { message: string } | null }>
    }
  }).from('support_tickets').insert([payload])

  if (error) {
    throw new Error(error.message)
  }
}