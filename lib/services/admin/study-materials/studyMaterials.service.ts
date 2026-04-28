// lib/services/admin/study-materials/studyMaterials.service.ts
//
// All Supabase data operations for the Study Materials feature.
// No React, no hooks — pure async functions that accept a typed Supabase client.
//
// FIX: buildPayload now includes external_url, meeting_url, link_type.
// FIX: fetchStudyMaterials selects and maps all new columns.
// FIX: StudyMaterialRow is imported from the types file (not re-declared).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/lib/types/database'
import type {
  StudyMaterial,
  StudyMaterialRow,
  ProgramOption,
  LinkType,
} from '@/lib/types/admin/study-materials/study-materials'
import type { RawFormState } from '@/lib/utils/admin/study-materials/validators'
import { uploadMaterialFile } from './storage.service'

type SupabaseDB = SupabaseClient<Database>

// ── SELECT ────────────────────────────────────────────────────────────────────

export async function fetchStudyMaterials(
  supabase: SupabaseDB,
): Promise<StudyMaterial[]> {
  const { data, error } = await supabase
    .from('study_materials')
    .select(`
      id,
      title,
      description,
      type,
      file_url,
      notes_content,
      program_id,
      category,
      is_published,
      created_at,
      updated_at,
      external_url,
      meeting_url,
      link_type,
      programs:program_id ( id, code, name )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  // Remap `programs` → `program` for ergonomic UI use
  return (data as StudyMaterialRow[]).map(({ programs, link_type, ...rest }) => ({
    ...rest,
    link_type: (link_type as LinkType | null) ?? null,
    program:   programs ?? null,
  }))
}

export async function fetchPrograms(
  supabase: SupabaseDB,
): Promise<ProgramOption[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('id, code, name')
    .order('name')

  if (error) {
    throw new Error(error.message)
  }
  return data as ProgramOption[]
}

// ── Build insert/update payload ───────────────────────────────────────────────

interface BuildPayloadArgs {
  supabase:        SupabaseDB
  form:            RawFormState
  file:            File | null
  existingFileUrl: string | null
}

async function buildPayload(args: BuildPayloadArgs) {
  const { supabase, form, file, existingFileUrl } = args

  let fileUrl: string | null = existingFileUrl

  // Upload physical file for document type
  if (form.type === 'document' && file) {
    const { publicUrl } = await uploadMaterialFile(supabase, file)
    fileUrl = publicUrl
  }

  // For video type, store YouTube URL in file_url
  if (form.type === 'video') {
    fileUrl = form.youtube_url.trim() || null
  }

  return {
    title:         form.title.trim(),
    description:   form.description.trim() || null,
    type:          form.type,
    file_url:      form.type !== 'notes' ? fileUrl : null,
    notes_content: form.type === 'notes' ? form.notes_content.trim() : null,
    program_id:    form.program_id || null,
    category:      form.category.trim() || null,
    is_published:  form.is_published,
    // New external resource fields
    external_url:  form.external_url.trim() || null,
    meeting_url:   form.meeting_url.trim() || null,
    link_type:     (form.link_type || null) as LinkType | null,
  }
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export interface CreateMaterialArgs {
  supabase: SupabaseDB
  form:     RawFormState
  file:     File | null
}

export async function createStudyMaterial(
  args: CreateMaterialArgs,
): Promise<void> {
  const payload = await buildPayload({
    supabase:        args.supabase,
    form:            args.form,
    file:            args.file,
    existingFileUrl: null,
  })

  const { error } = await args.supabase
    .from('study_materials')
    .insert(payload)

  if (error) {
    throw new Error(error.message)
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export interface UpdateMaterialArgs {
  supabase:        SupabaseDB
  id:              string
  form:            RawFormState
  file:            File | null
  existingFileUrl: string | null
}

export async function updateStudyMaterial(
  args: UpdateMaterialArgs,
): Promise<void> {
  const payload = await buildPayload({
    supabase:        args.supabase,
    form:            args.form,
    file:            args.file,
    existingFileUrl: args.existingFileUrl,
  })

  const { error } = await args.supabase
    .from('study_materials')
    .update(payload)
    .eq('id', args.id)

  if (error) {
    throw new Error(error.message)
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function deleteStudyMaterial(
  supabase: SupabaseDB,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('study_materials')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

// ── TOGGLE PUBLISH ────────────────────────────────────────────────────────────

export async function toggleMaterialPublish(
  supabase: SupabaseDB,
  id: string,
  isPublished: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('study_materials')
    .update({ is_published: isPublished })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}