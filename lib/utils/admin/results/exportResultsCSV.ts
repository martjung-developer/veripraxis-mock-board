// lib/utils/results/exportResultsCSV.ts
// ─────────────────────────────────────────────────────────────────────────────
// Standalone, fully typed CSV export for exam results.
// Runs only in the browser (uses Blob + URL.createObjectURL).
// ─────────────────────────────────────────────────────────────────────────────

import type { Result } from '@/lib/types/admin/exams/results/results.types'
import { fmtTime, fmtDateTime } from '@/lib/utils/admin/results/results.utils'

// ── CSV cell types — only primitives that serialize cleanly ───────────────────
type CsvCell = string | number

// ── Header row ────────────────────────────────────────────────────────────────
const HEADERS: string[] = [
  'Rank',
  'Name',
  'Email',
  'Student ID',
  'Score',
  'Percentage',
  'Pass/Fail',
  'Status',
  'Time',
  'Submitted',
]

// ── Row builder ───────────────────────────────────────────────────────────────
function toRow(result: Result, rank: number): CsvCell[] {
  return [
    rank,
    result.student.full_name,
    result.student.email,
    result.student.student_id ?? '',
    result.score,
    `${result.percentage.toFixed(1)}%`,
    result.passed ? 'PASSED' : 'FAILED',
    result.status.charAt(0).toUpperCase() + result.status.slice(1),
    fmtTime(result.time_spent_seconds),
    fmtDateTime(result.submitted_at),
  ]
}

// ── Serialiser ────────────────────────────────────────────────────────────────
function escapeCell(cell: CsvCell): string {
  return `"${String(cell).replace(/"/g, '""')}"`
}

function toCsvString(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n')
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface ExportResultsCSVOptions {
  /** Override the default filename (without extension). */
  filename?: string
}

export function exportResultsCSV(
  results: Result[],
  options: ExportResultsCSVOptions = {},
): void {
  const filename = options.filename ?? 'exam-results'
  const dataRows = results.map((r, i) => toRow(r, i + 1))
  const csv      = toCsvString([HEADERS, ...dataRows])

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}