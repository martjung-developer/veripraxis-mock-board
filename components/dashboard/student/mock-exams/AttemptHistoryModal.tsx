// components/dashboard/student/mock-exams/AttemptHistoryModal.tsx
import { X, CheckCircle2, Clock, RotateCcw } from 'lucide-react'
import type { ExamAttempt } from '@/lib/types/student/mock-exams/mock-exams'
import styles from '@/app/(dashboard)/student/mock-exams/[examId]/mock.module.css'

function formatAttemptTime(secs: number | null): string {
  if (secs === null) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  attempts: ExamAttempt[]
  onClose:  () => void
}

export function AttemptHistoryModal({ attempts, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`${styles.modal} ${styles.modalWide}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle} style={{ margin: 0 }}>Attempt History</h2>
          <button className={styles.btnIconClose} onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {attempts.length === 0 ? (
          <p className={styles.modalBody} style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            No previous attempts found.
          </p>
        ) : (
          <div className={styles.attemptList}>
            {attempts.map((a, i) => (
              <div key={a.id} className={styles.attemptRow}>
                <div className={styles.attemptMeta}>
                  <span className={styles.attemptNum}>Attempt #{attempts.length - i}</span>
                  <span className={styles.attemptDate}>{formatDate(a.started_at)}</span>
                </div>
                <div className={styles.attemptStats}>
                  <span className={`${styles.attemptStatus} ${a.status === 'submitted' ? styles.statusSubmitted : styles.statusInProgress}`}>
                    {a.status === 'submitted'
                      ? <><CheckCircle2 size={12} /> Submitted</>
                      : <><RotateCcw size={12} /> In Progress</>
                    }
                  </span>
                  <span className={styles.attemptStat}>
                    <Clock size={12} /> {formatAttemptTime(a.time_spent_seconds)}
                  </span>
                  {a.score !== undefined && a.score !== null && (
                    <span className={styles.attemptStat} style={{ fontWeight: 700, color: '#0d2540' }}>
                      Score: {a.score}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.modalActions} style={{ marginTop: '1rem' }}>
          <button className={styles.btnModalConfirm} onClick={onClose} style={{ flex: 'none', minWidth: 100 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}