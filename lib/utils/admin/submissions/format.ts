// lib/utils/admin/submissions/format.ts

export function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  return `${m}m ${secs % 60}s`
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}