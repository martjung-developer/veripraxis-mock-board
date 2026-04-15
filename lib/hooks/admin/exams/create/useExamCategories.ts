// lib/hooks/admin/exams/create/useExamCategories.ts
// Fetches exam categories once on mount via the service layer.
// Returns a stable loading flag + typed category list.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchCategories } from '@/lib/services/admin/exams/create/exam.service'
import type { CategoryOption, UseExamCategoriesReturn } from '@/lib/types/admin/exams/create/exam.types'

export function useExamCategories(): UseExamCategoriesReturn {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [catLoading, setCatLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const supabase = createClient()
        const data = await fetchCategories(supabase)
        if (!cancelled) setCategories(data)
      } catch {
        // Categories failing to load is non-fatal — the user sees an empty dropdown
        // and can still submit (category_id is nullable in the schema).
        if (!cancelled) setCategories([])
      } finally {
        if (!cancelled) setCatLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, []) // no deps — runs once on mount

  return { categories, catLoading }
}