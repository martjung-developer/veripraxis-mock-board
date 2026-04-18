// components/dashboard/student/practice-exams/ReviewCard.tsx
import { Clock, BookOpen, GraduationCap, Lock, PlayCircle } from 'lucide-react'
import { EXAM_TYPE_META } from '@/lib/types/database'
import type { ReviewItem, ExamStatus } from '@/lib/services/student/practice-exams/practiceExamList.service'
import styles from '@/app/(dashboard)/student/practice-exams/reviews.module.css'

function StatusBadge({ status }: { status: ExamStatus }) {
  return (
    <span className={`${styles.badge} ${status === 'available' ? styles.badgeAvailable : styles.badgeComingSoon}`}>
      {status === 'available' ? 'Available' : 'Coming Soon'}
    </span>
  )
}

interface ReviewCardProps {
  item:    ReviewItem
  onStart: (id: string) => void
}

export default function ReviewCard({ item, onStart }: ReviewCardProps) {
  const isAvailable = item.status === 'available'

  return (
    <div className={`${styles.examCard} ${isAvailable ? styles.examCardAvailable : ''}`}>
      <div className={`${styles.cardAccent} ${isAvailable ? styles.cardAccentAvailable : styles.cardAccentSoon}`} />

      <div className={styles.cardTop}>
        <div className={`${styles.cardIconWrap} ${isAvailable ? styles.cardIconAvailable : styles.cardIconSoon}`}>
          <GraduationCap size={20} strokeWidth={1.75} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          <span style={{
            display: 'inline-block', padding: '0.18rem 0.55rem',
            borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.03em', background: 'rgba(16,185,129,0.10)',
            color: '#047857', whiteSpace: 'nowrap',
          }}>
            {EXAM_TYPE_META['practice'].label}
          </span>
          <StatusBadge status={item.status} />
        </div>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.shortCode}>{item.shortCode}</p>
        <h3 className={styles.programName}>{item.title}</h3>
        <span className={styles.categoryTag}>{item.category}</span>
      </div>

      {isAvailable && (
        <div className={styles.cardMeta}>
          <span className={styles.metaItem}>
            <BookOpen size={13} strokeWidth={2} />
            {item.questions ?? '—'} items
          </span>
          <span className={styles.metaItem}>
            <Clock size={13} strokeWidth={2} />
            {item.duration ?? '—'}
          </span>
        </div>
      )}

      <div className={styles.cardFooter}>
        {isAvailable ? (
          <button className={styles.startBtn} onClick={() => onStart(item.id)}>
            <PlayCircle size={15} strokeWidth={2} /> Start Review
          </button>
        ) : (
          <button className={styles.disabledBtn} disabled>
            <Lock size={13} strokeWidth={2} /> Not Available
          </button>
        )}
      </div>
    </div>
  )
}