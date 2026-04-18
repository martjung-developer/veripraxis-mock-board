/**
 * lib/hooks/student/profile/useAvatarUpload.ts
 *
 * The single brain of the avatar feature.
 * Manages the complete upload lifecycle as an explicit state machine:
 *
 *   idle ──► cropping ──► previewing ──► uploading ──► idle
 *    ▲                                                   │
 *    └──────────────── deleting ◄────────────────────────┘
 *
 * Rules:
 *  - No JSX
 *  - No direct Supabase calls (everything goes through utils/upload.ts)
 *  - All callbacks are useCallback-stabilised
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient }                    from '@/lib/supabase/client'
import {
  validateAvatarFile,
  uploadAvatar,
  deleteAvatar,
} from '@/lib/utils/student/profile/upload'

// ── Stage type ────────────────────────────────────────────────────────────────

export type AvatarStage =
  | 'idle'
  | 'cropping'
  | 'previewing'
  | 'uploading'
  | 'deleting'

// ── Toast ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error'

export interface AvatarToast {
  id:      number
  message: string
  variant: ToastVariant
}

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseAvatarUploadReturn {
  // Stage
  stage:           AvatarStage

  // Source file handed to the cropper
  selectedFile:    File | null
  // Cropped data-URL handed to the preview modal + upload
  croppedDataUrl:  string | null
  // Live avatar URL shown in the hero card (updates without page reload)
  liveAvatarUrl:   string | null

  // Toast queue (self-managing auto-dismiss)
  toasts:          AvatarToast[]
  dismissToast:    (id: number) => void

  // Dropzone callback — validates + opens cropper
  onFilesAccepted: (files: File[]) => void

  // Cropper callbacks
  onCropComplete:  (dataUrl: string) => void
  onCropCancel:    () => void

  // Preview modal callbacks
  onConfirmUpload: () => Promise<void>
  onCancelPreview: () => void   // sends user back to cropper

  // Delete
  onDeleteAvatar:  () => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const TOAST_DURATION_MS = 4_000

export function useAvatarUpload(
  userId:           string,
  initialAvatarUrl: string | null,
): UseAvatarUploadReturn {
  const supabase = useMemo(() => createClient(), [])

  const [stage,          setStage]          = useState<AvatarStage>('idle')
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null)
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null)
  const [liveAvatarUrl,  setLiveAvatarUrl]  = useState<string | null>(initialAvatarUrl)
  const [toasts,         setToasts]         = useState<AvatarToast[]>([])

  // ── Toast helpers ─────────────────────────────────────────────────────────

  const pushToast = useCallback((message: string, variant: ToastVariant) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Dropzone: files accepted ──────────────────────────────────────────────

  const onFilesAccepted = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return

    const validation = validateAvatarFile(file)
    if (!validation.ok) {
      pushToast(validation.reason ?? 'Invalid file.', 'error')
      return
    }

    setSelectedFile(file)
    setStage('cropping')
  }, [pushToast])

  // ── Cropper ───────────────────────────────────────────────────────────────

  const onCropComplete = useCallback((dataUrl: string) => {
    setCroppedDataUrl(dataUrl)
    setStage('previewing')
  }, [])

  const onCropCancel = useCallback(() => {
    setSelectedFile(null)
    setCroppedDataUrl(null)
    setStage('idle')
  }, [])

  // ── Preview modal ─────────────────────────────────────────────────────────

  const onConfirmUpload = useCallback(async () => {
    if (!croppedDataUrl) return
    setStage('uploading')

    const result = await uploadAvatar(supabase, userId, croppedDataUrl)

    if (result.error) {
      pushToast(`Upload failed: ${result.error}`, 'error')
      setStage('idle')
      return
    }

    setLiveAvatarUrl(result.publicUrl)
    setSelectedFile(null)
    setCroppedDataUrl(null)
    setStage('idle')
    pushToast('Avatar updated successfully!', 'success')
  }, [supabase, userId, croppedDataUrl, pushToast])

  const onCancelPreview = useCallback(() => {
    // Return to cropper rather than abandoning the flow entirely
    setStage('cropping')
  }, [])

  // ── Delete ────────────────────────────────────────────────────────────────

  const onDeleteAvatar = useCallback(async () => {
    setStage('deleting')

    const result = await deleteAvatar(supabase, userId)

    if (result.error) {
      pushToast(`Could not remove avatar: ${result.error}`, 'error')
      setStage('idle')
      return
    }

    setLiveAvatarUrl(null)
    setStage('idle')
    pushToast('Avatar removed.', 'success')
  }, [supabase, userId, pushToast])

  return {
    stage,
    selectedFile,
    croppedDataUrl,
    liveAvatarUrl,
    toasts,
    dismissToast,
    onFilesAccepted,
    onCropComplete,
    onCropCancel,
    onConfirmUpload,
    onCancelPreview,
    onDeleteAvatar,
  }
}