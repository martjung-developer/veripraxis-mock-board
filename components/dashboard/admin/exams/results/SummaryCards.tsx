// components/dashboard/admin/exams/results/SummaryCards.tsx
import { Users, CheckCircle, XCircle, TrendingUp, Award, Activity } from 'lucide-react'
import type { ResultSummary, AggregateAnalytics } from '@/lib/types/admin/exams/results/results.types'
import type { LucideIcon } from 'lucide-react'
import s from '@/app/(dashboard)/admin/exams/[examId]/results/results.module.css'

interface SummaryCardsProps {
  summary:   ResultSummary
  analytics: AggregateAnalytics | null
  loading:   boolean
}

interface CardDef {
  icon:     LucideIcon
  color:    'blue' | 'green' | 'danger' | 'amber' | 'violet'
  value:    string | number
  label:    string
  progress?: number
}

export function SummaryCards({ summary, analytics, loading }: SummaryCardsProps) {
  const cards: CardDef[] = [
    {
      icon:  Users,
      color: 'blue',
      value: loading ? '—' : summary.total,
      label: 'Total Results',
    },
    {
      icon:  CheckCircle,
      color: 'green',
      value: loading ? '—' : summary.passing,
      label: 'Passed',
    },
    {
      icon:  XCircle,
      color: 'danger',
      value: loading ? '—' : summary.failing,
      label: 'Failed',
    },
    {
      icon:  TrendingUp,
      color: 'amber',
      value: loading
        ? '—'
        : analytics?.average_score != null
          ? `${analytics.average_score.toFixed(1)}%`
          : '—',
      label: 'Avg Score',
    },
    {
      icon:  Award,
      color: 'violet',
      value: loading
        ? '—'
        : analytics?.highest_score != null
          ? `${analytics.highest_score.toFixed(1)}%`
          : '—',
      label: 'Highest Score',
    },
    {
      icon:     Activity,
      color:    'green',
      value:    loading ? '—' : `${summary.passRate}%`,
      label:    'Pass Rate',
      progress: summary.passRate,
    },
  ]

  return (
    <div className={s.summaryGrid}>
      {cards.map((card) => (
        <div key={card.label} className={s.summaryCard}>
          <div className={`${s.summaryIcon} ${s[`summaryIcon_${card.color}`]}`}>
            <card.icon size={16} />
          </div>
          <div className={s.summaryValue}>{card.value}</div>
          <div className={s.summaryLabel}>{card.label}</div>
          {card.progress != null && (
            <div className={s.progressBar}>
              <div
                className={s.progressFill}
                style={{ width: `${card.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}