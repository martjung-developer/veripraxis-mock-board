// lib/services/admin/settings/settings.service.ts
//
// Pure Supabase I/O — no React, no state, no UI logic.
// Every method returns a typed ServiceResult so callers never touch raw errors.

import { createClient } from '@/lib/supabase/client'
import type { Profile, ServiceResult } from '@/lib/types/admin/settings/settings.types'

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Fetch a single profile row by user id.
 */
export async function getProfile(userId: string): Promise<ServiceResult<Profile>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as Profile, error: null }
}

/**
 * Update the full_name field for a profile row.
 */
export async function updateProfileName(
  userId: string,
  fullName: string,
): Promise<ServiceResult<void>> {
  const supabase = createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      updated_at: new Date().toISOString(),
    } as Parameters<ReturnType<typeof supabase.from<'profiles'>>['update']>[0])
    .eq('id', userId)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

/**
 * Upload an image file to the `profile_images` bucket.
 * Returns the public URL of the uploaded file on success.
 *
 * @param userId   - Used to build a deterministic storage path.
 * @param file     - The image File object selected by the user.
 * @param onProgress - Optional callback receiving a rough progress value (0–100).
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ServiceResult<string>> {
  const supabase = createClient()

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${userId}.${ext}`

  // Simulate upload progress using a polling interval since the Supabase JS
  // client v2 storage upload does not expose upload progress natively.
  let pct = 10
  onProgress?.(pct)

  const ticker = setInterval(() => {
    pct = Math.min(pct + 15, 85)
    onProgress?.(pct)
  }, 200)

  const { error: storageError } = await supabase.storage
    .from('profile_images')
    .upload(path, file, { upsert: true, contentType: file.type })

  clearInterval(ticker)

  if (storageError) {
    onProgress?.(0)
    return { data: null, error: storageError.message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('profile_images').getPublicUrl(path)

  onProgress?.(100)
  return { data: publicUrl, error: null }
}

/**
 * Persist a resolved avatar URL back to the `profiles` table.
 */
export async function updateAvatarUrl(
  userId: string,
  url: string,
): Promise<ServiceResult<void>> {
  const supabase = createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: url,
      updated_at: new Date().toISOString(),
    } as Parameters<ReturnType<typeof supabase.from<'profiles'>>['update']>[0])
    .eq('id', userId)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Re-authenticate the current user with their existing password.
 * Used before allowing a password change as a security gate.
 */
export async function verifyPassword(
  email: string,
  password: string,
): Promise<ServiceResult<void>> {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

/**
 * Update the authenticated user's password via Supabase Auth.
 */
export async function updatePassword(newPassword: string): Promise<ServiceResult<void>> {
  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

/**
 * Sign the current user out.
 */
export async function logout(): Promise<ServiceResult<void>> {
  const supabase = createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}