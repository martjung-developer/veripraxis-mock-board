// lib/utils/results/results.utils.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure utility functions for the results feature.
// No React, no Supabase — fully unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  RawProfileJoin,
  RawStudentJoin,
  Result,
  ResultSummary,
} from '@/lib/types/admin/exams/results/results.types'

// ── Join unwrappers ───────────────────────────────────────────────────────────
// Supabase may return a FK join as a single object or an array.
// These narrow safely without any cast.

export function unwrapProfile(
  raw: RawProfileJoin,
): Pick<NonNullable<RawProfileJoin extends (infer U)[] ? U : RawProfileJoin>, 'id' | 'full_name' | 'email'> | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

export function unwrapStudent(
  raw: RawStudentJoin,
): Pick<NonNullable<RawStudentJoin extends (infer U)[] ? U : RawStudentJoin>, 'student_id'> | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  return `${m}m ${secs % 60}s`
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH')
}

// ── Avatar initials ───────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// ── Summary computation ───────────────────────────────────────────────────────
// Derives all summary-card values from the raw results array once.
// Memoize the output with useMemo in the component/hook layer.

export function computeSummary(results: Result[]): ResultSummary {
  const passing  = results.filter((r) => r.passed).length
  const released = results.filter((r) => r.status === 'released').length
  const reviewed = results.filter((r) => r.status === 'reviewed').length

  return {
    total:    results.length,
    passing,
    failing:  results.length - passing,
    passRate: results.length ? Math.round((passing / results.length) * 100) : 0,
    released,
    reviewed,
  }
}

// ── Analytics fallback ────────────────────────────────────────────────────────
// Called when the analytics table has no aggregate row for this exam.

import type { AggregateAnalytics } from '@/lib/types/admin/exams/results/results.types'

export function computeAnalyticsFromResults(results: Result[]): AggregateAnalytics | null {
  if (results.length === 0) return null
  const pcts = results.map((r) => r.percentage)
  return {
    total_attempts:  pcts.length,
    average_score:   pcts.reduce((a, b) => a + b, 0) / pcts.length,
    highest_score:   Math.max(...pcts),
    lowest_score:    Math.min(...pcts),
    last_attempt_at: results[0]?.submitted_at ?? null,
  }
}