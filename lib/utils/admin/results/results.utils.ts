// lib/utils/admin/results/results.utils.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure utility functions for the results feature.
// No React, no Supabase — fully unit-testable.
//
// unwrapProfile / unwrapStudent have been removed: the service layer now does
// a two-step flat fetch and assembles student data in-memory without joins,
// so there is nothing left to unwrap here.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Result,
  ResultSummary,
  AggregateAnalytics,
} from '@/lib/types/admin/exams/results/results.types'

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