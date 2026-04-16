// components/dashboard/admin/exams/questions/QuestionRow.tsx
// Pure UI — renders a single question row inside a group.

import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { Question, QuestionOption } from '@/lib/types/admin/exams/questions/questions.types'
import { TYPE_META } from '@/lib/utils/admin/questions/helpers'
import s from '@/app/(dashboard)/admin/exams/[examId]/questions/questions.module.css'
import { JSX } from 'react/jsx-dev-runtime'

interface QuestionRowProps {
  question:    Question
  displayIndex: number
  onEdit:      (q: Question) => void
  onDelete:    (q: Question) => void
}

export function QuestionRow({
  question: q,
  displayIndex,
  onEdit,
  onDelete,
}: QuestionRowProps): JSX.Element {
  const meta = TYPE_META[q.question_type]

  return (
    <div className={s.questionRow}>
      {/* Drag handle (visual only) */}
      <div className={s.questionDragHandle}>
        <GripVertical size={14} />
      </div>

      {/* Order number */}
      <div className={s.questionNum}>
        {q.order_number ?? displayIndex + 1}
      </div>

      {/* Main content */}
      <div className={s.questionContent}>
        <p className={s.questionText}>{q.question_text}</p>

        {/* MCQ options preview */}
        {q.question_type === 'multiple_choice' && q.options && (
          <div className={s.optionsPreview}>
            {q.options.map((opt: QuestionOption) => (
              <span
                key={opt.label}
                className={`${s.optPreview} ${q.correct_answer === opt.label ? s.optPreviewCorrect : ''}`}
              >
                {opt.label}: {opt.text.length > 25 ? `${opt.text.slice(0, 25)}…` : opt.text}
              </span>
            ))}
          </div>
        )}

        {/* True/False answer preview */}
        {q.question_type === 'true_false' && q.correct_answer && (
          <span className={s.tfPreview}>
            Answer: <strong>{q.correct_answer === 'true' ? 'True' : 'False'}</strong>
          </span>
        )}

        {/* Fill blank expected answer */}
        {q.question_type === 'fill_blank' && q.correct_answer && (
          <span className={s.fillPreview}>
            Expected: <strong>{q.correct_answer}</strong>
          </span>
        )}

        {/* Manual grading note */}
        {!meta.autoGrade && (
          <span className={s.manualNote}>
            ✍ {meta.label === 'Essay' ? 'Rubric + AI-assisted grading' : 'Manual grading required'}
          </span>
        )}

        {q.explanation && (
          <span className={s.hasExplanation}>💡 Has explanation</span>
        )}
      </div>

      {/* Points pill */}
      <div className={s.questionMeta}>
        <span className={s.pointsPill}>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
      </div>

      {/* Edit / Delete actions */}
      <div className={s.questionActions}>
        <button className={s.actionEdit} title="Edit" onClick={() => onEdit(q)}>
          <Pencil size={13} />
        </button>
        <button className={s.actionDelete} title="Delete" onClick={() => onDelete(q)}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}