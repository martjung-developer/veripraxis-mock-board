// lib/utils/admin/study-materials/validators.ts
import { z } from 'zod'

export type MaterialType = 'document' | 'video' | 'notes'

export const MATERIAL_TYPES: MaterialType[] = ['document', 'video', 'notes']

// ── YouTube URL helper (co-located so schema can reference it) ────────────────
export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  )
  return match ? match[1] : null
}

// ── Base schema shared by all material types ──────────────────────────────────
const baseSchema = z.object({
  title:        z.string().min(1, 'Title is required.'),
  description:  z.string().optional(),
  program_id:   z.string().min(1, 'Program is required.'),
  category:     z.string().optional(),
  is_published: z.boolean(),
})

// ── Per-type discriminated schemas ────────────────────────────────────────────
export const documentSchema = baseSchema.extend({
  type:          z.literal('document'),
  youtube_url:   z.string().optional(),
  notes_content: z.string().optional(),
  // file is validated separately (File object can't live in Zod easily)
})

export const videoSchema = baseSchema.extend({
  type:          z.literal('video'),
  youtube_url:   z
    .string()
    .min(1, 'YouTube URL is required.')
    .refine(
      (url) => extractYouTubeId(url) !== null,
      'Invalid YouTube URL. Please use a standard youtube.com or youtu.be link.',
    ),
  notes_content: z.string().optional(),
})

export const notesSchema = baseSchema.extend({
  type:          z.literal('notes'),
  youtube_url:   z.string().optional(),
  notes_content: z.string().min(1, 'Notes content is required.'),
})

export const studyMaterialSchema = z.discriminatedUnion('type', [
  documentSchema,
  videoSchema,
  notesSchema,
])

export type StudyMaterialFormValues = z.infer<typeof studyMaterialSchema>

// ── Flat form state (what the form actually stores before parsing) ─────────────
export interface RawFormState {
  title:         string
  description:   string
  type:          MaterialType
  youtube_url:   string
  notes_content: string
  program_id:    string
  category:      string
  is_published:  boolean
}

export const EMPTY_FORM: RawFormState = {
  title:         '',
  description:   '',
  type:          'document',
  youtube_url:   '',
  notes_content: '',
  program_id:    '',
  category:      '',
  is_published:  false,
}

// ── Validate raw form + optional file, return typed errors ───────────────────
export interface ValidationErrors {
  title?:         string
  youtube_url?:   string
  notes_content?: string
  program_id?:    string
  file?:          string
}

export function validateMaterialForm(
  raw: RawFormState,
  file: File | null,
  isEditing: boolean,
): ValidationErrors {
  const result = studyMaterialSchema.safeParse(raw)
  const errors: ValidationErrors = {}

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof ValidationErrors
      if (!errors[field]) {
        errors[field] = issue.message
      }
    }
  }

  // Document file: required on create, optional on edit
  if (raw.type === 'document' && !isEditing && !file) {
    errors.file = 'Please select a file to upload.'
  }

  return errors
}