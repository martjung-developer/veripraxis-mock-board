// lib/types/admin/study-materials/study-materials.ts
// ─────────────────────────────────────────────────────────────────────────────
// Extended with external_url, meeting_url, link_type.
// All additions are optional on the domain type and form state.
// ─────────────────────────────────────────────────────────────────────────────

import type { LinkType } from '@/lib/types/database'

export type MaterialType = 'document' | 'video' | 'notes'

// ── Domain type (UI-level) ────────────────────────────────────────────────────

export interface StudyMaterial {
  id:            string
  title:         string
  description:   string | null
  type:          MaterialType
  file_url:      string | null
  notes_content: string | null
  category:      string | null
  is_published:  boolean
  created_at:    string
  updated_at:    string
  program_id:    string | null
  program:       { id: string; code: string; name: string } | null

  // ── Non-breaking additions ───────────────────────────────────────────────
  external_url?: string | null
  meeting_url?:  string | null
  link_type?:    LinkType | null
}

// ── Form state (used inside useStudyForm) ─────────────────────────────────────

export interface StudyMaterialForm {
  title:         string
  description:   string
  type:          MaterialType
  program_id:    string
  category:      string
  is_published:  boolean
  notes_content: string
  // ── Non-breaking additions ───────────────────────────────────────────────
  external_url:  string
  meeting_url:   string
  link_type:     LinkType | ''
}

// ── Validation errors ─────────────────────────────────────────────────────────

export type StudyMaterialFormErrors = Partial<Record<keyof StudyMaterialForm, string>>

// ── Program option (dropdown) ─────────────────────────────────────────────────

export interface ProgramOption {
  id:   string
  code: string
  name: string
}