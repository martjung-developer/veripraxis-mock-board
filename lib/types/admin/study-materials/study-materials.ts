// lib/types/admin/study-materials.ts
//
// Domain types for the Study Materials feature.
// These are derived from the DB schema but shaped for UI consumption.

export type MaterialType = 'document' | 'video' | 'notes'

// ── Supabase select shape ────────────────────────────────────────────────────
// Matches the nested select query:
//   study_materials ( ..., programs:program_id ( id, code, name ) )
export interface ProgramRef {
  id:   string
  code: string
  name: string
}

export interface StudyMaterial {
  id:            string
  title:         string
  description:   string | null
  type:          MaterialType
  /** Document storage URL or raw YouTube URL */
  file_url:      string | null
  notes_content: string | null
  program_id:    string | null
  category:      string | null
  is_published:  boolean
  created_at:    string
  program:       ProgramRef | null
}

// Supabase returns the joined relation as `programs` (the FK alias), so we
// need an intermediate shape for mapping:
export interface StudyMaterialRow
  extends Omit<StudyMaterial, 'program'> {
  programs: ProgramRef | null
}

/** Lightweight program for selects */
export interface ProgramOption {
  id:   string
  code: string
  name: string
}