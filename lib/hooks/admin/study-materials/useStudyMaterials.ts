// lib/hooks/admin/study-materials/useStudyMaterials.ts
//
// Manages server state for the Study Materials list:
//   - fetching materials + programs
//   - optimistic updates for toggle-publish and delete
//   - delegating mutations to the service layer
//

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StudyMaterial, ProgramOption } from '@/lib/types/admin/study-materials/study-materials'
import type { RawFormState } from '@/lib/utils/admin/study-materials/validators'
import {
  fetchStudyMaterials,
  fetchPrograms,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  toggleMaterialPublish,
} from '@/lib/services/admin/study-materials/studyMaterials.service'

// ── Hook return shape ─────────────────────────────────────────────────────────

export interface UseStudyMaterialsReturn {
  // data
  materials:  StudyMaterial[]
  programs:   ProgramOption[]
  // status
  loading:    boolean
  error:      string | null
  // actions
  refresh:    () => Promise<void>
  clearError: () => void
  create:     (form: RawFormState, file: File | null) => Promise<void>
  update:     (id: string, form: RawFormState, file: File | null, existingFileUrl: string | null) => Promise<void>
  remove:     (id: string) => Promise<void>
  togglePublish: (id: string, currentValue: boolean) => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStudyMaterials(): UseStudyMaterialsReturn {
  const supabase = useMemo(() => createClient(), [])

  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [programs,  setPrograms]  = useState<ProgramOption[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Abort controller ref: cancels in-flight fetches when component unmounts
  // or when refresh() is called again before the previous one finishes.
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    // Cancel any in-flight fetch
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const [mats, progs] = await Promise.all([
        fetchStudyMaterials(supabase),
        fetchPrograms(supabase),
      ])

      // Only commit if this fetch wasn't aborted
      if (!controller.signal.aborted) {
        setMaterials(mats)
        setPrograms(progs)
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to load data.')
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [supabase])

  useEffect(() => {
    void refresh()
    return () => { abortRef.current?.abort() }
  }, [refresh])

  // ── Optimistic toggle publish ─────────────────────────────────────────────

  const togglePublish = useCallback(async (id: string, currentValue: boolean) => {
    const next = !currentValue

    // Optimistic update
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_published: next } : m)),
    )

    try {
      await toggleMaterialPublish(supabase, id, next)
    } catch (err) {
      // Roll back
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_published: currentValue } : m)),
      )
      setError(err instanceof Error ? err.message : 'Failed to update publish status.')
    }
  }, [supabase])

  // ── Optimistic delete ─────────────────────────────────────────────────────

  const remove = useCallback(async (id: string) => {
    const snapshot = materials.find((m) => m.id === id) ?? null

    // Optimistic remove
    setMaterials((prev) => prev.filter((m) => m.id !== id))

    try {
      await deleteStudyMaterial(supabase, id)
    } catch (err) {
      // Roll back
      if (snapshot) {
        setMaterials((prev) => [snapshot, ...prev])
      }
      setError(err instanceof Error ? err.message : 'Failed to delete material.')
    }
  }, [supabase, materials])

  // ── Create ────────────────────────────────────────────────────────────────

  const create = useCallback(async (
    form: RawFormState,
    file: File | null,
  ) => {
    await createStudyMaterial({ supabase, form, file })
    await refresh()
  }, [supabase, refresh])

  // ── Update ────────────────────────────────────────────────────────────────

  const update = useCallback(async (
    id: string,
    form: RawFormState,
    file: File | null,
    existingFileUrl: string | null,
  ) => {
    await updateStudyMaterial({ supabase, id, form, file, existingFileUrl })
    await refresh()
  }, [supabase, refresh])

  return {
    materials,
    programs,
    loading,
    error,
    refresh,
    clearError: () => setError(null),
    create,
    update,
    remove,
    togglePublish,
  }
}