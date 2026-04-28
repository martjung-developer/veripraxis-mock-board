// lib/services/admin/study-materials/storage.service.ts
//
// Handles all Supabase Storage interactions for study materials.
// Returns typed results — never throws silently.

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'study-materials'

export interface UploadResult {
  url:  string
  path: string
}

export interface StorageError {
  message: string
}

export type UploadOutcome =
  | { ok: true;  data: UploadResult }
  | { ok: false; error: StorageError }

export type DeleteOutcome =
  | { ok: true }
  | { ok: false; error: StorageError }

/**
 * Uploads a file to the `study-materials` bucket.
 * Returns the public URL on success.
 *
 * Path pattern: `{folderPrefix}/{timestamp}-{sanitized-filename}`
 */
export async function uploadMaterialFile(
  file: File,
  folderPrefix: string = 'uploads',
): Promise<UploadOutcome> {
  const supabase = createClient()

  const sanitized  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${folderPrefix}/${Date.now()}-${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert:       false,
    })

  if (uploadError) {
    return {
      ok:    false,
      error: { message: uploadError.message },
    }
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  if (!urlData?.publicUrl) {
    return {
      ok:    false,
      error: { message: 'Uploaded file but could not retrieve public URL.' },
    }
  }

  return {
    ok:   true,
    data: { url: urlData.publicUrl, path: storagePath },
  }
}

/**
 * Deletes a file from the `study-materials` bucket by its storage path.
 * Extracts the path from a full public URL if needed.
 */
export async function deleteMaterialFile(
  pathOrUrl: string,
): Promise<DeleteOutcome> {
  const supabase   = createClient()
  const storagePath = extractStoragePath(pathOrUrl)

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath])

  if (error) {
    return { ok: false, error: { message: error.message } }
  }

  return { ok: true }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * If given a full Supabase public URL, strips the bucket prefix so only the
 * relative storage path remains.  If given a plain path, returns it as-is.
 *
 * Example:
 *   https://xxx.supabase.co/storage/v1/object/public/study-materials/uploads/123-file.pdf
 *   → uploads/123-file.pdf
 */
function extractStoragePath(pathOrUrl: string): string {
  const marker = `/object/public/${BUCKET}/`
  const idx    = pathOrUrl.indexOf(marker)
  if (idx !== -1) {
    return pathOrUrl.slice(idx + marker.length)
  }
  return pathOrUrl
}