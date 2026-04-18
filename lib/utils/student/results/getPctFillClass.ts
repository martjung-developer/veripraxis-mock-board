// lib/utils/student/results/getPctFillClass.ts
import type styles from '@/app/(dashboard)/student/results/results.module.css'

// Accept the CSS module object so this util stays decoupled from a hard import
export function getPctFillClass(
  pct:    number | null,
  s:      Record<string, string>,
): string {
  if (pct === null) { return '' }
  if (pct >= 75)    { return s['pctHigh'] ?? '' }
  if (pct >= 50)    { return s['pctMid']  ?? '' }
  return s['pctLow'] ?? ''
}