/**
 * lib/utils/student/profile/upload.ts
 *
 * Pure Supabase helpers for avatar upload and deletion.
 * Zero React. Zero UI. Zero side effects beyond Supabase calls.
 *
 * Storage layout:
 *   bucket : avatars
 *   path   : {userId}/avatar.png   (always upserted — one file per user)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'

type AppClient = SupabaseClient<Database>

const BUCKET   = 'avatars'
const MAX_BYTES = 10 * 1024 * 1024   // 10 MB hard cap
const ALLOWED   = ['image/jpeg', 'image/png', 'image/webp'] as const

// ── Validation ────────────────────────────────────────────────────────────────

export interface FileValidation {
  ok:      boolean
  reason:  string | null
}

/**
 * Client-side validation before the file ever reaches the server.
 * Returns `{ ok: true, reason: null }` when all checks pass.
 */
export function validateAvatarFile(file: File): FileValidation {
  if (!(ALLOWED as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'Only JPG, PNG, and WebP images are supported.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: 'Image must be smaller than 5 MB.' }
  }
  return { ok: true, reason: null }
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadAvatarResult {
  publicUrl: string | null
  error:     string | null
}

/**
 * Converts a base64 data-URL (produced by the canvas cropper) to a Blob,
 * upserts it to Supabase Storage at `{userId}/avatar.png`, then persists the
 * public URL to `profiles.avatar_url`.
 *
 * A cache-bust timestamp is appended to the public URL so browsers always
 * fetch the latest version despite the path never changing.
 */
export async function uploadAvatar(
  client:  AppClient,
  userId:  string,
  dataUrl: string,
): Promise<UploadAvatarResult> {
  const blob = dataUrlToBlob(dataUrl)
  if (!blob) return { publicUrl: null, error: 'Failed to process the cropped image.' }

  const path = `${userId}/avatar.png`

  const { error: storageError } = await client
    .storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType:  'image/png',
      upsert:       true,
      cacheControl: '3600',
    })

  if (storageError) return { publicUrl: null, error: storageError.message }

  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(path)
  const raw = urlData?.publicUrl ?? null

  if (!raw) return { publicUrl: null, error: 'Could not retrieve public URL.' }

  // Cache-bust so Next.js Image doesn't serve the stale version
  const publicUrl = `${raw}?t=${Date.now()}`

  const { error: dbError } = await client
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)

  if (dbError) return { publicUrl: null, error: dbError.message }

  return { publicUrl, error: null }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export interface DeleteAvatarResult {
  error: string | null
}

/**
 * Removes `{userId}/avatar.png` from storage (soft-fail — the file may not
 * exist) and sets `profiles.avatar_url` to NULL in the database.
 */
export async function deleteAvatar(
  client: AppClient,
  userId: string,
): Promise<DeleteAvatarResult> {
  // Storage removal is best-effort — ignore its error
  await client.storage.from(BUCKET).remove([`${userId}/avatar.png`])

  const { error } = await client
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId)

  return { error: error?.message ?? null }
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Converts a base64 data-URL string to a Blob.
 * Returns `null` on any parse failure.
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, b64] = dataUrl.split(',')
    if (!header || !b64) return null

    const mime   = header.match(/:(.*?);/)?.[1] ?? 'image/png'
    const binary = atob(b64)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}