// components/dashboard/admin/exams/answer-key/QuestionRow.tsx
// ─────────────────────────────────────────────────────────────────────────────
// React.memo-wrapped row. Only re-renders when its own entry changes or when
// previewMode toggles — avoiding full-list re-renders on single edits.
// ─────────────────────────────────────────────────────────────────────────────
import { memo }             from 'react'
import { CheckCircle, Pencil } from 'lucide-react'
import type { AnswerKeyEntry } from '@/lib/types/admin/exams/answer-key/answerKey.types'
import { effectiveAnswer }    from '@/lib/types/admin/exams/answer-key/answerKey.types'
import { AnswerInput }        from './AnswerInput'
import s from './answer-key.module.css'

interface QuestionRowProps {
  entry:          AnswerKeyEntry
  index:          number          // fallback display index within its group
  previewMode:    boolean
  onSetOverride:  (questionId: string, value: string | null) => void
  onOpenRubric:   (entry: AnswerKeyEntry) => void
}

export const QuestionRow = memo(function QuestionRow({
  entry,
  index,
  previewMode,
  onSetOverride,
  onOpenRubric,
}: QuestionRowProps) {
  const hasOverride = entry.override !== null
  const isAnswered  = !!effectiveAnswer(entry)

  return (
    <div
      className={`${s.questionRow} ${isAnswered ? s.questionRowAnswered : ''} ${hasOverride ? s.questionRowOverridden : ''}`}
    >
      {/* Left: question info */}
      <div className={s.questionInfo}>
        <div className={s.questionMeta}>
          <span className={s.questionNum}>Q{entry.order_number ?? index + 1}</span>
          <span className={s.questionPoints}>
            {entry.points} pt{entry.points !== 1 ? 's' : ''}
          </span>
          {hasOverride && (
            <span className={s.overrideBadge}>
              <Pencil size={9} /> Overridden
            </span>
          )}
          {isAnswered && !hasOverride && (
            <span className={s.storedBadge}>
              <CheckCircle size={9} /> Stored
            </span>
          )}
        </div>
        <p className={s.questionText}>{entry.question_text}</p>
      </div>

      {/* Right: answer input */}
      <div className={s.answerInputArea}>
        <AnswerInput
          entry={entry}
          previewMode={previewMode}
          onSetOverride={onSetOverride}
          onOpenRubric={onOpenRubric}
        />
      </div>
    </div>
  )
})