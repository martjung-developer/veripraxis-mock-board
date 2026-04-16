// components/dashboard/admin/exams/results/ResultsTable.tsx
import Link from 'next/link'
import { BarChart2, CheckCircle, XCircle, CheckSquare, Send } from 'lucide-react'
import type { Result } from '@/lib/types/admin/exams/results/results.types'
import { fmtTime, fmtDate, getInitials } from '@/lib/utils/admin/results/results.utils'
import s from '@/app/(dashboard)/admin/exams/[examId]/results/results.module.css'

const PAGE_SIZE = 10

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className={`${s.rankBadge} ${s.rankGold}`}>🥇</span>
  if (rank === 2) return <span className={`${s.rankBadge} ${s.rankSilver}`}>🥈</span>
  if (rank === 3) return <span className={`${s.rankBadge} ${s.rankBronze}`}>🥉</span>
  return <span className={`${s.rankBadge} ${s.rankDefault}`}>{rank}</span>
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className={s.skeletonRow}>
      <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 28 }} /></td>
      <td>
        <div className={s.skelCell}>
          <div className={`${s.skeleton} ${s.skelAvatar}`} />
          <div>
            <div className={`${s.skeleton} ${s.skelText}`} style={{ width: 130 }} />
            <div className={`${s.skeleton} ${s.skelText}`} style={{ width: 100, marginTop: 5 }} />
          </div>
        </div>
      </td>
      {[70, 55, 70, 70, 80, 60, 50].map((w, j) => (
        <td key={j}>
          <div className={`${s.skeleton} ${s.skelText}`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ examId }: { examId: string }) {
  return (
    <tr>
      <td colSpan={9}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <BarChart2 size={22} color="var(--text-muted)" />
          </div>
          <p className={s.emptyTitle}>No results yet</p>
          <p className={s.emptySub}>
            Grade submissions first, then release results from the{' '}
            <Link href={`/admin/exams/${examId}/submissions`} className={s.readOnlyLink}>
              Submissions
            </Link>{' '}
            page.
          </p>
        </div>
      </td>
    </tr>
  )
}

// ── ResultRow ─────────────────────────────────────────────────────────────────

interface ResultRowProps {
  result: Result
  rank:   number
}

function ResultRow({ result: r, rank }: ResultRowProps) {
  return (
    <tr className={`${s.tableRow} ${r.status === 'released' ? s.tableRowReleased : ''}`}>
      <td><RankBadge rank={rank} /></td>
      <td>
        <div className={s.studentCell}>
          <div className={s.avatar}>
            <span className={s.avatarInitials}>{getInitials(r.student.full_name)}</span>
          </div>
          <div>
            <div className={s.studentName}>{r.student.full_name}</div>
            <div className={s.studentEmail}>{r.student.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className={s.idChip}>{r.student.student_id ?? '—'}</span>
      </td>
      <td><span className={s.scoreRaw}>{r.score} pts</span></td>
      <td>
        <div className={s.percentCell}>
          <span className={s.percentValue}>{r.percentage.toFixed(1)}%</span>
          <div className={s.miniBar}>
            <div
              className={`${s.miniBarFill} ${r.passed ? s.miniBarPass : s.miniBarFail}`}
              style={{ width: `${Math.min(r.percentage, 100)}%` }}
            />
          </div>
        </div>
      </td>
      <td>
        {r.passed
          ? <span className={s.badgePass}><CheckCircle size={11} /> Passed</span>
          : <span className={s.badgeFail}><XCircle size={11} /> Failed</span>}
      </td>
      <td>
        {r.status === 'released'
          ? <span className={s.statusReleased}><Send size={11} /> Released</span>
          : <span className={s.statusReviewed}><CheckSquare size={11} /> Reviewed</span>}
      </td>
      <td><span className={s.timeCell}>{fmtTime(r.time_spent_seconds)}</span></td>
      <td><span className={s.dateCell}>{fmtDate(r.submitted_at)}</span></td>
    </tr>
  )
}

// ── ResultsTable ──────────────────────────────────────────────────────────────

interface ResultsTableProps {
  results:  Result[]
  loading:  boolean
  page:     number
  examId:   string
}

export function ResultsTable({ results, loading, page, examId }: ResultsTableProps) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student</th>
            <th>Student ID</th>
            <th>Score</th>
            <th>Percentage</th>
            <th>Pass/Fail</th>
            <th>Status</th>
            <th>Time</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <SkeletonRow key={i} />
            ))
          ) : results.length === 0 ? (
            <EmptyState examId={examId} />
          ) : (
            results.map((r, i) => (
              <ResultRow
                key={r.id}
                result={r}
                rank={(page - 1) * PAGE_SIZE + i + 1}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}