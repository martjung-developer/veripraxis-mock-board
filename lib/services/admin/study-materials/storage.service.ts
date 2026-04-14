// lib/services/admin/study-materials/storage.service.ts
//
// Handles all Supabase Storage operations for study-material document uploads.
// Intentionally kept separate from the data CRUD service so each can evolve
// independently (e.g. swap storage provider without touching the DB layer).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const BUCKET = 'study-materials'

export interface UploadResult {
  publicUrl: string
}

/**
 * Uploads a document file to the study-materials bucket and returns its
 * public URL. Throws on any upload error.
 */
export async function uploadMaterialFile(
  supabase: SupabaseClient<Database>,
  file: File,
): Promise<UploadResult> {
  const ext      = file.name.split('.').pop() ?? 'bin'
  const filePath = `study-materials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    throw new Error(`File upload failed: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath)

  return { publicUrl: urlData.publicUrl }
}