// components/dashboard/admin/exams/questions/Toast.tsx
// Pure UI — self-dismissing toast notification.

import { X } from 'lucide-react'
import { JSX, useEffect } from 'react'
import type { ToastState } from '@/lib/types/admin/exams/questions/questions.types'
import s from '@/app/(dashboard)/admin/exams/[examId]/questions/questions.module.css'

interface ToastProps {
  toast:    ToastState
  onClose:  () => void
}

export function Toast({ toast, onClose }: ToastProps): JSX.Element {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`${s.toast} ${toast.type === 'success' ? s.toastSuccess : s.toastError}`}>
      {toast.type === 'success' ? '✓' : '✕'} {toast.message}
      <button onClick={onClose} className={s.toastClose}>
        <X size={11} />
      </button>
    </div>
  )
}