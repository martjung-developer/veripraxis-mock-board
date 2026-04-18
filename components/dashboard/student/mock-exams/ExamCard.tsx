// components/dashboard/student/mock-exams/ExamCard.tsx
'use client'

import { BookOpen, Clock, GraduationCap, Lock, PlayCircle, RotateCcw, Eye } from 'lucide-react'
import { EXAM_TYPE_META } from '@/lib/types/database'
import type { MockExam } from '@/lib/types/student/mock-exams/mock-exams'
import styles from '@/app/(dashboard)/student/mock-exams/mock-exams.module.css'

function StatusBadge({ status }: { status: MockExam['status'] }) {
  const map = {
    available:   { label: 'Available',    cls: styles.badgeAvailable   },
    coming_soon: { label: 'Coming Soon',  cls: styles.badgeComingSoon  },
    in_progress: { label: 'In Progress',  cls: styles.badgeInProgress  },
    completed:   { label: 'Completed',    cls: styles.badgeCompleted   },
  }
  const { label, cls } = map[status]
  return <span className={`${styles.badge} ${cls}`}>{label}</span>
}

interface Props {
  exam:          MockExam
  onStart:       (id: string) => void
  onContinue:    (id: string) => void
  onViewAttempt: (id: string) => void
}

export function ExamCard({ exam, onStart, onContinue, onViewAttempt }: Props) {
  const isAvailable  = exam.status === 'available'
  const isInProgress = exam.status === 'in_progress'
  const isCompleted  = exam.status === 'completed'
  const isActive     = isAvailable || isInProgress || isCompleted

  return (
    <div className={`${styles.examCard} ${isActive ? styles.examCardAvailable : ''}`}>
      <div className={`${styles.cardAccent} ${isActive ? styles.cardAccentAvailable : styles.cardAccentSoon}`} />
      <div className={styles.cardTop}>
        <div className={`${styles.cardIconWrap} ${isActive ? styles.cardIconAvailable : styles.cardIconSoon}`}>
          <GraduationCap size={20} strokeWidth={1.75} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          <span style={{
            display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: '20px',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.03em',
            background: 'rgba(13,37,64,0.08)', color: '#0d2540', whiteSpace: 'nowrap',
          }}>
            {EXAM_TYPE_META['mock'].label}
          </span>
          <StatusBadge status={exam.status} />
        </div>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.shortCode}>{exam.shortCode}</p>
        <h3 className={styles.programName}>{exam.title}</h3>
        <span className={styles.categoryTag}>{exam.category}</span>
      </div>

      {isActive && (
        <div className={styles.cardMeta}>
          <span className={styles.metaItem}>
            <BookOpen size={13} strokeWidth={2} />
            {exam.questions ?? '—'} items
          </span>
          <span className={styles.metaItem}>
            <Clock size={13} strokeWidth={2} />
            {exam.duration ?? '—'}
          </span>
        </div>
      )}

      <div className={styles.cardFooter}>
        {isAvailable && (
          <button className={styles.startBtn} onClick={() => onStart(exam.id)}>
            <PlayCircle size={15} strokeWidth={2} /> Start Exam
          </button>
        )}
        {isInProgress && (
          <button className={styles.continueBtn} onClick={() => onContinue(exam.id)}>
            <RotateCcw size={15} strokeWidth={2} /> Continue Exam
          </button>
        )}
        {isCompleted && (
          <button className={styles.viewBtn} onClick={() => onViewAttempt(exam.id)}>
            <Eye size={15} strokeWidth={2} /> View Attempt
          </button>
        )}
        {exam.status === 'coming_soon' && (
          <button className={styles.disabledBtn} disabled>
            <Lock size={13} strokeWidth={2} /> Waiting for Admin Assignment
          </button>
        )}
      </div>
    </div>
  )
}