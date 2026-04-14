// lib/hooks/admin/study-materials/useStudyForm.ts
//
// Manages all form state for the create/edit study material modal.
// Uses useReducer instead of many useState calls to keep transitions atomic
// and easy to reason about.

import { useReducer, useRef, useCallback } from 'react'
import type { StudyMaterial } from '@/lib/types/admin/study-materials/study-materials'
import {
  EMPTY_FORM,
  validateMaterialForm,
  type RawFormState,
  type ValidationErrors,
} from '@/lib/utils/study-materials/validators'

// ── State shape ───────────────────────────────────────────────────────────────

interface FormReducerState {
  form:        RawFormState
  errors:      ValidationErrors
  file:        File | null
  submitting:  boolean
  dragOver:    boolean
}

// ── Actions ───────────────────────────────────────────────────────────────────

type FormAction =
  | { type: 'PATCH';        payload: Partial<RawFormState> }
  | { type: 'SET_FILE';     payload: File | null }
  | { type: 'SET_ERRORS';   payload: ValidationErrors }
  | { type: 'SET_DRAG';     payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'RESET';        payload: RawFormState }

function formReducer(state: FormReducerState, action: FormAction): FormReducerState {
  switch (action.type) {
    case 'PATCH':
      return { ...state, form: { ...state.form, ...action.payload } }
    case 'SET_FILE':
      return { ...state, file: action.payload }
    case 'SET_ERRORS':
      return { ...state, errors: action.payload }
    case 'SET_DRAG':
      return { ...state, dragOver: action.payload }
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload }
    case 'RESET':
      return { form: action.payload, errors: {}, file: null, submitting: false, dragOver: false }
    default:
      return state
  }
}

const INITIAL_STATE: FormReducerState = {
  form:       EMPTY_FORM,
  errors:     {},
  file:       null,
  submitting: false,
  dragOver:   false,
}

// ── Hook return shape ─────────────────────────────────────────────────────────

export interface UseStudyFormReturn {
  // state
  form:         RawFormState
  errors:       ValidationErrors
  file:         File | null
  submitting:   boolean
  dragOver:     boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  editTarget:   StudyMaterial | null
  showForm:     boolean
  // actions
  openCreate:   () => void
  openEdit:     (mat: StudyMaterial) => void
  closeForm:    () => void
  patchForm:    (patch: Partial<RawFormState>) => void
  setFile:      (file: File | null) => void
  setDragOver:  (v: boolean) => void
  handleDrop:   (e: React.DragEvent) => void
  /** Validates form + fires onCreate/onUpdate. Returns true on success. */
  handleSubmit: (
    onCreate: (form: RawFormState, file: File | null) => Promise<void>,
    onUpdate: (id: string, form: RawFormState, file: File | null, existingUrl: string | null) => Promise<void>,
  ) => Promise<boolean>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStudyForm(): UseStudyFormReturn {
  const [state, dispatch] = useReducer(formReducer, INITIAL_STATE)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editTargetRef = useRef<StudyMaterial | null>(null)
  const showFormRef   = useRef(false)

  // We store showForm + editTarget in refs so their mutation doesn't cause
  // the heavy table list to re-render. Components that need them read the
  // stable ref. We expose them as plain values in the return for JSX usage —
  // a single forceUpdate trick isn't needed because the modal itself only
  // mounts/unmounts based on these.
  //
  // Actually for AnimatePresence to work they DO need to be reactive, so we
  // keep them in the reducer state via a shadow boolean.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_editTarget, _setEditTarget] = [editTargetRef.current, (v: StudyMaterial | null) => { editTargetRef.current = v }]

  // Simpler: just use local state for the two modal-control booleans.
  // The reducer handles the heavy form state. This avoids over-engineering.
  const setModalOpen = (v: boolean) => { showFormRef.current = v }

  // Use plain useState for modal visibility since it only controls one modal
  // and doesn't interact with the form fields.
  // (Keeping this pragmatic — over-engineering a single bool into the reducer
  //  would make the hook harder to read with no benefit.)

  const openCreate = useCallback(() => {
    editTargetRef.current = null
    dispatch({ type: 'RESET', payload: EMPTY_FORM })
    setModalOpen(true)
    // Force re-render by dispatching a no-op patch (triggers useReducer update)
    dispatch({ type: 'PATCH', payload: {} })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = useCallback((mat: StudyMaterial) => {
    editTargetRef.current = mat
    const populated: RawFormState = {
      title:         mat.title,
      description:   mat.description ?? '',
      type:          mat.type,
      youtube_url:   mat.type === 'video' ? (mat.file_url ?? '') : '',
      notes_content: mat.notes_content ?? '',
      program_id:    mat.program_id ?? '',
      category:      mat.category ?? '',
      is_published:  mat.is_published,
    }
    dispatch({ type: 'RESET', payload: populated })
    setModalOpen(true)
    dispatch({ type: 'PATCH', payload: {} })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const closeForm = useCallback(() => {
    editTargetRef.current = null
    setModalOpen(false)
    dispatch({ type: 'RESET', payload: EMPTY_FORM })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const patchForm = useCallback((patch: Partial<RawFormState>) => {
    dispatch({ type: 'PATCH', payload: patch })
  }, [])

  const setFile = useCallback((file: File | null) => {
    dispatch({ type: 'SET_FILE', payload: file })
  }, [])

  const setDragOver = useCallback((v: boolean) => {
    dispatch({ type: 'SET_DRAG', payload: v })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dispatch({ type: 'SET_DRAG', payload: false })
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      dispatch({ type: 'SET_FILE', payload: dropped })
    }
  }, [])

  const handleSubmit = useCallback(async (
    onCreate: (form: RawFormState, file: File | null) => Promise<void>,
    onUpdate: (id: string, form: RawFormState, file: File | null, existingUrl: string | null) => Promise<void>,
  ): Promise<boolean> => {
    const errors = validateMaterialForm(
      state.form,
      state.file,
      editTargetRef.current !== null,
    )

    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', payload: errors })
      return false
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true })

    try {
      if (editTargetRef.current) {
        await onUpdate(
          editTargetRef.current.id,
          state.form,
          state.file,
          editTargetRef.current.file_url,
        )
      } else {
        await onCreate(state.form, state.file)
      }
      closeForm()
      return true
    } catch {
      // Errors are surfaced by the parent hook; just stop submitting
      return false
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false })
    }
  }, [state.form, state.file, closeForm])

  return {
    form:         state.form,
    errors:       state.errors,
    file:         state.file,
    submitting:   state.submitting,
    dragOver:     state.dragOver,
    fileInputRef,
    editTarget:   editTargetRef.current,
    showForm:     showFormRef.current,
    openCreate,
    openEdit,
    closeForm,
    patchForm,
    setFile,
    setDragOver,
    handleDrop,
    handleSubmit,
  }
}