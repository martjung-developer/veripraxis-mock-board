// lib/supabase/client.ts
// Browser-side Supabase client.
// Uses @supabase/ssr so the session cookie is read correctly,
// meaning auth.role() = 'authenticated' and RLS policies work as expected.

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}