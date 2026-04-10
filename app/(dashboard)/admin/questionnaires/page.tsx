// app/(dashboard)/admin/questionnaires/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Plus, Search, X, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Pencil, Trash2, AlertTriangle, Loader2, CheckCircle2,
  HelpCircle, ListChecks, Upload, FileSpreadsheet,
  AlertCircle, CheckCheck, Download, ArrowLeft, GraduationCap,
  Layers, ChevronRight as ChevRight, RefreshCw, Link2, FileType,
  File, Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/AuthContext'
import { QuestionType } from '@/lib/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants, modalVariants, childVariants } from '@/animations/admin/questionnaires/questionnaires'
import styles from './questionnaires.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────
type DifficultyLevel = 'easy' | 'medium' | 'hard'
type ViewMode        = 'programs' | 'program-detail'
type ImportTab       = 'file' | 'link'
type LinkSource      = 'google_forms' | 'google_drive' | 'custom_url'

interface ProgramOption { id: string; code: string; name: string }

interface DisplayQuestion {
  id: string; question_text: string; question_type: QuestionType; points: number
  options: QuestionOption[] | null; correct_answer: string | null; explanation: string | null
  order_number: number | null; exam_id: string | null; created_by: string | null
  created_at: string; categoryName: string; examTitle: string | null
  examProgramId: string | null; difficulty: DifficultyLevel
}

interface QuestionOption { label: string; text: string }

interface FormState {
  question_text: string; question_type: QuestionType; points: number
  correct_answer: string; explanation: string; exam_id: string
  difficulty: DifficultyLevel; choices: QuestionOption[]
  // ✅ NEW: program selector to filter exam dropdown
  program_id: string
}

interface ExamRow { id: string; title: string; category_id: string | null; program_id: string | null }

interface QuestionRow {
  id: string; question_text: string; question_type: QuestionType; points: number
  options: unknown; correct_answer: string | null; explanation: string | null
  order_number: number | null; exam_id: string | null; created_by: string | null; created_at: string
  exams: { title: string; program_id: string | null; exam_categories: { name: string } | null } | null
}

interface ImportRow {
  question_text: string; question_type: string; points: number; correct_answer: string
  explanation: string; difficulty: string; option_a: string; option_b: string
  option_c: string; option_d: string; _rowIndex: number; _errors: string[]; _valid: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────────
const BLANK_FORM: FormState = {
  question_text: '', question_type: 'multiple_choice', points: 1,
  correct_answer: '', explanation: '', exam_id: '', difficulty: 'medium',
  program_id: '',
  choices: [
    { label: 'A', text: '' }, { label: 'B', text: '' },
    { label: 'C', text: '' }, { label: 'D', text: '' },
  ],
}

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice', true_false: 'True / False',
  short_answer: 'Short Answer', essay: 'Essay', matching: 'Matching', fill_blank: 'Fill in the Blank',
}

const TYPE_ORDER: QuestionType[] = [
  'multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank',
]

const TYPE_COLORS: Record<QuestionType, { bg: string; color: string; border: string }> = {
  multiple_choice: { bg: '#eef0fe', color: '#4f5ff7', border: 'rgba(79,95,247,0.2)'   },
  true_false:      { bg: '#ecfeff', color: '#0891b2', border: 'rgba(8,145,178,0.2)'   },
  short_answer:    { bg: '#ecfdf5', color: '#059669', border: 'rgba(5,150,105,0.2)'   },
  essay:           { bg: '#f5f3ff', color: '#7c3aed', border: 'rgba(124,58,237,0.2)'  },
  matching:        { bg: '#fff7ed', color: '#c2410c', border: 'rgba(194,65,12,0.2)'   },
  fill_blank:      { bg: '#fffbeb', color: '#d97706', border: 'rgba(217,119,6,0.2)'   },
}

const PROGRAM_COLORS = [
  { bg: '#eff6ff', accent: '#2563eb', border: '#dbeafe' },
  { bg: '#f0fdf4', accent: '#059669', border: '#d1fae5' },
  { bg: '#fdf4ff', accent: '#9333ea', border: '#f3e8ff' },
  { bg: '#fff7ed', accent: '#ea580c', border: '#fed7aa' },
  { bg: '#ecfeff', accent: '#0891b2', border: '#cffafe' },
  { bg: '#fefce8', accent: '#ca8a04', border: '#fef9c3' },
  { bg: '#fdf2f8', accent: '#db2777', border: '#fce7f3' },
  { bg: '#f0fdf4', accent: '#16a34a', border: '#bbf7d0' },
  { bg: '#f8fafc', accent: '#475569', border: '#e2e8f0' },
]

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard',
}

const PAGE_SIZE       = 15
const TEMPLATE_HEADERS = [
  'question_text','question_type','points','difficulty',
  'option_a','option_b','option_c','option_d','correct_answer','explanation',
]
const VALID_TYPES = ['multiple_choice','true_false','short_answer','essay','matching','fill_blank']
const VALID_DIFF  = ['easy','medium','hard']
const ACCEPTED_FILE_TYPES = '.csv,.xlsx,.xls,.docx,.doc,.pdf'

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseDifficulty(raw: string | null): DifficultyLevel {
  if (!raw) return 'medium'
  const lower = raw.toLowerCase()
  if (lower.startsWith('[easy]')) return 'easy'
  if (lower.startsWith('[hard]')) return 'hard'
  return 'medium'
}
function stripDifficultyTag(raw: string | null): string {
  if (!raw) return ''
  return raw.replace(/^\[(easy|medium|hard)\]\s*/i, '')
}
function encodeDifficulty(diff: DifficultyLevel, explanation: string): string {
  const body = explanation.trim()
  return body ? `[${diff.toUpperCase()}] ${body}` : `[${diff.toUpperCase()}]`
}
function toOptions(raw: unknown): QuestionOption[] | null {
  if (!Array.isArray(raw)) return null
  return raw as QuestionOption[]
}

function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = '', inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes }
      else if (line[i] === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += line[i] }
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

async function parseXLSXFile(file: File): Promise<Record<string, string>[]> {
  const XLSX  = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb    = XLSX.read(buffer, { type: 'array' })
  const ws    = wb.Sheets[wb.SheetNames[0]]
  const raw   = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  return raw.map((row) => {
    const normalized: Record<string, string> = {}
    Object.keys(row).forEach((k) => {
      normalized[k.trim().toLowerCase().replace(/\s+/g, '_')] = String(row[k] ?? '')
    })
    return normalized
  })
}

async function parseDOCXFile(file: File): Promise<Record<string, string>[]> {
  const mammoth = await import('mammoth')
  const buffer  = await file.arrayBuffer()
  const result  = await mammoth.extractRawText({ arrayBuffer: buffer })
  return parseQuestionTextBlocks(result.value)
}

async function parsePDFFile(file: File): Promise<Record<string, string>[]> {
  // @ts-expect-error – pdf.js types
  const pdfjsLib = await import('pdfjs-dist/build/pdf')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  const typedarray = new Uint8Array(await file.arrayBuffer())
  const pdf        = await pdfjsLib.getDocument({ data: typedarray }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map((item: { str: string }) => item.str).join(' ') + '\n'
  }
  return parseQuestionTextBlocks(fullText)
}

function parseQuestionTextBlocks(text: string): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  const questionBlocks = text.split(/\n(?=\d+[\.\)]\s)/).filter(Boolean)
  if (questionBlocks.length > 1) {
    for (const block of questionBlocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      if (!lines.length) continue
      const row: Record<string, string> = {
        question_text: '', question_type: 'multiple_choice', points: '1',
        difficulty: 'medium', correct_answer: '', explanation: '',
        option_a: '', option_b: '', option_c: '', option_d: '',
      }
      row.question_text = lines[0].replace(/^\d+[\.\)]\s*/, '').trim()
      for (let i = 1; i < lines.length; i++) {
        const line     = lines[i]
        const optMatch = line.match(/^([A-Da-d])[\.\)]\s+(.+)/)
        const ansMatch = line.match(/^(?:answer|correct)[:\s]+([A-Da-d]|true|false)/i)
        const expMatch = line.match(/^(?:explanation|exp)[:\s]+(.+)/i)
        const tfMatch  = line.match(/^(true|false)$/i)
        if (optMatch) {
          const label = optMatch[1].toUpperCase()
          if (label === 'A') row.option_a = optMatch[2]
          if (label === 'B') row.option_b = optMatch[2]
          if (label === 'C') row.option_c = optMatch[2]
          if (label === 'D') row.option_d = optMatch[2]
        } else if (ansMatch) {
          row.correct_answer = ansMatch[1].toUpperCase()
          if (['TRUE','FALSE'].includes(row.correct_answer)) row.question_type = 'true_false'
        } else if (expMatch) {
          row.explanation = expMatch[1]
        } else if (tfMatch) {
          row.question_type = 'true_false'
        }
      }
      if (!row.option_a && !row.option_b) {
        row.question_type = row.question_type === 'true_false' ? 'true_false' : 'short_answer'
      }
      rows.push(row)
    }
  } else {
    text.split('\n').forEach((line) => {
      const clean = line.replace(/^\d+[\.\)]\s*/, '').trim()
      if (clean.length > 10) {
        rows.push({
          question_text: clean, question_type: 'short_answer', points: '1',
          difficulty: 'medium', correct_answer: '', explanation: '',
          option_a: '', option_b: '', option_c: '', option_d: '',
        })
      }
    })
  }
  return rows
}

// ✅ FIXED: Link detection and fetch — uses a CORS proxy for external URLs
function detectLinkSource(url: string): { source: LinkSource; valid: boolean; hint: string } {
  if (url.includes('docs.google.com/forms')) {
    return {
      source: 'google_forms', valid: true,
      hint: 'Google Forms detected. The form must be publicly accessible.',
    }
  }
  if (
    url.includes('drive.google.com') ||
    url.includes('docs.google.com/spreadsheets') ||
    url.includes('docs.google.com/document')
  ) {
    return {
      source: 'google_drive', valid: true,
      hint: 'Google Drive / Docs detected. Set sharing to "Anyone with the link → Viewer".',
    }
  }
  try {
    new URL(url)
    return {
      source: 'custom_url', valid: true,
      hint: 'Custom URL detected. Must return CSV, JSON, or plain text.',
    }
  } catch {
    return { source: 'custom_url', valid: false, hint: 'Please enter a valid URL.' }
  }
}

function resolveGoogleDriveUrl(url: string): string {
  const sheetMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (sheetMatch) return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv`
  const docMatch = url.match(/document\/d\/([a-zA-Z0-9_-]+)/)
  if (docMatch) return `https://docs.google.com/document/d/${docMatch[1]}/export?format=txt`
  const fileMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (openMatch) return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`
  return url
}

// ✅ FIXED: fetch via a reliable CORS proxy
async function fetchAndParseLink(
  url: string,
  source: LinkSource,
): Promise<Record<string, string>[]> {
  let fetchUrl = url
  if (source === 'google_drive') fetchUrl = resolveGoogleDriveUrl(url)

  // Try direct fetch first; fall back to allorigins proxy for CORS
  let text = ''
  let ok   = false

  try {
    const resp = await fetch(fetchUrl, { mode: 'cors' })
    if (resp.ok) { text = await resp.text(); ok = true }
  } catch { /* CORS blocked — try proxy */ }

  if (!ok) {
    // allorigins is a reliable free CORS proxy
    const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(fetchUrl)}`
    const resp    = await fetch(proxied)
    if (!resp.ok) throw new Error(
      `Failed to fetch (${resp.status}). Ensure the link is publicly accessible.`,
    )
    const json = await resp.json() as { contents: string }
    text = json.contents ?? ''
  }

  if (!text.trim()) throw new Error('The URL returned empty content.')

  if (source === 'google_forms') return parseGoogleFormsHTML(text)
  if (fetchUrl.includes('format=csv') || text.startsWith('question_text') || text.startsWith('"question_text')) {
    return parseCSVText(text)
  }
  try {
    const json = JSON.parse(text)
    if (Array.isArray(json)) return json as Record<string, string>[]
  } catch { /* not JSON */ }
  return parseQuestionTextBlocks(text)
}

function parseGoogleFormsHTML(html: string): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]+?\]);\s*<\/script>/)
  if (match) {
    try {
      const data  = JSON.parse(match[1])
      const items: unknown[] = data?.[1]?.[1] ?? []
      items.forEach((item: unknown, idx: number) => {
        if (!Array.isArray(item)) return
        const title   = item[1] as string
        const type    = item[3] as number
        const choices: string[] = []
        if (Array.isArray(item[4]?.[0]?.[1])) {
          ;(item[4][0][1] as unknown[]).forEach((c: unknown) => {
            if (Array.isArray(c) && typeof c[0] === 'string') choices.push(c[0] as string)
          })
        }
        rows.push({
          question_text: title ?? `Question ${idx + 1}`,
          question_type: type === 2 ? 'multiple_choice' : type === 4 ? 'true_false' : 'short_answer',
          points: '1', difficulty: 'medium', correct_answer: '', explanation: '',
          option_a: choices[0] ?? '', option_b: choices[1] ?? '',
          option_c: choices[2] ?? '', option_d: choices[3] ?? '',
        })
      })
    } catch { /* ignore */ }
  }
  return rows
}

function validateImportRow(raw: Record<string, string>, idx: number): ImportRow {
  const errors: string[] = []
  const question_text  = (raw['question_text']  ?? '').trim()
  const question_type  = (raw['question_type']  ?? '').trim().toLowerCase()
  const points         = Number(raw['points'] ?? 1) || 1
  const difficulty     = (raw['difficulty']     ?? 'medium').trim().toLowerCase()
  const correct_answer = (raw['correct_answer'] ?? '').trim()
  const explanation    = (raw['explanation']    ?? '').trim()
  const option_a = (raw['option_a'] ?? '').trim()
  const option_b = (raw['option_b'] ?? '').trim()
  const option_c = (raw['option_c'] ?? '').trim()
  const option_d = (raw['option_d'] ?? '').trim()

  if (!question_text) errors.push('question_text is required')
  if (!VALID_TYPES.includes(question_type)) errors.push(`invalid question_type "${question_type}"`)
  if (!VALID_DIFF.includes(difficulty)) errors.push(`invalid difficulty "${difficulty}"`)
  if (question_type === 'multiple_choice') {
    if (!option_a || !option_b) errors.push('needs at least option_a and option_b')
    if (!correct_answer)        errors.push('correct_answer required (A/B/C/D)')
  }
  if (question_type === 'true_false') {
    const ca = correct_answer.toLowerCase()
    if (ca !== 'true' && ca !== 'false') errors.push('correct_answer must be "true" or "false"')
  }
  return {
    question_text, question_type, points, difficulty, correct_answer, explanation,
    option_a, option_b, option_c, option_d,
    _rowIndex: idx + 2, _errors: errors, _valid: errors.length === 0,
  }
}

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',')
  const row1   = ['"What is 2 + 2?"','multiple_choice','1','easy','3','4','5','6','B','"Adding two and two gives four"'].join(',')
  const row2   = ['"The Earth is flat."','true_false','1','easy','','','','','false','"The Earth is an oblate spheroid"'].join(',')
  const csv    = [header, row1, row2].join('\n')
  const blob   = new Blob([csv], { type: 'text/csv' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url; a.download = 'questions_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

function getFileTypeIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf')                return <FileType size={15} color="#dc2626" />
  if (['docx','doc'].includes(ext)) return <File size={15} color="#2563eb" />
  if (['xlsx','xls'].includes(ext)) return <FileSpreadsheet size={15} color="#059669" />
  return <FileText size={15} color="#4f5ff7" />
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function TypeTag({ type }: { type: QuestionType }) {
  const c = TYPE_COLORS[type]
  return (
    <span className={styles.typeTag} style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {TYPE_LABELS[type]}
    </span>
  )
}

function DiffBadge({ diff }: { diff: DifficultyLevel }) {
  const cls =
    diff === 'easy'   ? styles.diffEasy   :
    diff === 'medium' ? styles.diffMedium : styles.diffHard
  return <span className={`${styles.diffBadge} ${cls}`}>{DIFFICULTY_LABELS[diff]}</span>
}

function SkeletonRow() {
  return (
    <tr>
      <td><div className={styles.skelCell}><div className={styles.skeleton} style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0 }} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}><div className={styles.skeleton} style={{ width: '75%', height: 11 }} /><div className={styles.skeleton} style={{ width: '40%', height: 10 }} /></div></div></td>
      <td><div className={styles.skeleton} style={{ width: 90, height: 20, borderRadius: 20 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 72, height: 20, borderRadius: 20 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 60, height: 20, borderRadius: 20 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 32, height: 18 }} /></td>
      <td><div className={styles.skelActions}>{[0,1,2].map((i) => <div key={i} className={styles.skeleton} style={{ width: 30, height: 30, borderRadius: 8 }} />)}</div></td>
    </tr>
  )
}

function ProgramCard({
  program, questions, colorScheme, onClick,
}: {
  program: ProgramOption; questions: DisplayQuestion[]
  colorScheme: typeof PROGRAM_COLORS[0]; onClick: () => void
}) {
  const total  = questions.length
  const byType = TYPE_ORDER.reduce((acc, t) => {
    acc[t] = questions.filter((q) => q.question_type === t).length
    return acc
  }, {} as Record<QuestionType, number>)
  const topTypes = TYPE_ORDER.filter((t) => byType[t] > 0).slice(0, 3)

  return (
    <motion.button
      className={styles.programCard}
      style={{ background: colorScheme.bg, borderColor: colorScheme.border }}
      onClick={onClick}
      whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(13,21,35,0.12)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <div className={styles.programCardTop}>
        <div className={styles.programIconWrap} style={{ background: colorScheme.accent }}>
          <GraduationCap size={16} color="#fff" />
        </div>
        <ChevRight size={14} color={colorScheme.accent} className={styles.programCardArrow} />
      </div>
      <div className={styles.programCardCode} style={{ color: colorScheme.accent }}>{program.code}</div>
      <div className={styles.programCardName}>{program.name}</div>
      <div className={styles.programCardCount}>
        <span className={styles.programCardCountNum} style={{ color: colorScheme.accent }}>{total}</span>
        <span className={styles.programCardCountLabel}>question{total !== 1 ? 's' : ''}</span>
      </div>
      {topTypes.length > 0 ? (
        <div className={styles.programCardTypes}>
          {topTypes.map((t) => (
            <span key={t} className={styles.programCardTypePill}
              style={{ background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].color }}>
              {byType[t]}{' '}
              {t === 'multiple_choice' ? 'MCQ' :
               t === 'true_false'     ? 'T/F' :
               t === 'fill_blank'     ? 'Fill' :
               t === 'short_answer'   ? 'Short' :
               t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
          {TYPE_ORDER.filter((t) => byType[t] > 0).length > 3 && (
            <span className={styles.programCardTypePill} style={{ background: '#f1f5f9', color: '#64748b' }}>
              +{TYPE_ORDER.filter((t) => byType[t] > 0).length - 3} more
            </span>
          )}
        </div>
      ) : (
        <div className={styles.programCardEmpty}>No questions yet</div>
      )}
    </motion.button>
  )
}

function QuestionTypeSection({
  type, questions, loading, onView, onEdit, onDelete,
}: {
  type: QuestionType; questions: DisplayQuestion[]; loading: boolean
  onView: (q: DisplayQuestion) => void; onEdit: (q: DisplayQuestion) => void
  onDelete: (id: string) => void
}) {
  const [expanded,  setExpanded]  = useState(true)
  const [page,      setPage]      = useState(1)
  const color      = TYPE_COLORS[type]
  const paginated  = questions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))

  return (
    <div className={styles.typeSection}>
      <button
        className={styles.typeSectionHeader}
        style={{ borderLeftColor: color.color }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className={styles.typeSectionHeaderLeft}>
          <span className={styles.typeTag}
            style={{ background: color.bg, color: color.color, border: `1px solid ${color.border}` }}>
            {TYPE_LABELS[type]}
          </span>
          <span className={styles.typeSectionCount}>
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronDown size={15} color="#8a9ab5"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {questions.length === 0 ? (
              <div className={styles.typeSectionEmpty}>
                <HelpCircle size={16} color="#cbd5e1" />
                <span>No {TYPE_LABELS[type]} questions yet</span>
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '45%' }}>Question</th>
                        <th>Difficulty</th>
                        <th>Exam</th>
                        <th>Pts</th>
                        <th style={{ width: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                        : paginated.map((q) => (
                          <tr key={q.id} className={styles.tableRow}>
                            <td>
                              <div className={styles.questionCell}>
                                <div className={styles.questionIconWrap}
                                  style={{ background: color.bg, borderColor: color.border }}>
                                  <HelpCircle size={13} color={color.color} strokeWidth={2} />
                                </div>
                                <div>
                                  <div className={styles.questionText}>{q.question_text}</div>
                                  <div className={styles.questionPoints}>{q.points} pt{q.points !== 1 ? 's' : ''}</div>
                                </div>
                              </div>
                            </td>
                            <td><DiffBadge diff={q.difficulty} /></td>
                            <td>
                              <span className={styles.examTag}>
                                {q.examTitle
                                  ? (q.examTitle.length > 28 ? q.examTitle.slice(0, 28) + '…' : q.examTitle)
                                  : '—'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: '#4a5568', fontSize: '0.8rem' }}>
                              {q.points}
                            </td>
                            <td>
                              <div className={styles.actions}>
                                <button className={`${styles.actionBtn} ${styles.actionView}`}
                                  title="View" onClick={() => onView(q)}><Eye size={13} /></button>
                                <button className={`${styles.actionBtn} ${styles.actionEdit}`}
                                  title="Edit" onClick={() => onEdit(q)}><Pencil size={13} /></button>
                                <button className={`${styles.actionBtn} ${styles.actionDelete}`}
                                  title="Delete" onClick={() => onDelete(q.id)}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className={styles.pagination}
                    style={{ borderTop: '1px solid #f1f5f9', padding: '0.6rem 1rem' }}>
                    <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                    <div className={styles.pageButtons}>
                      <button className={styles.pageBtn}
                        onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft size={13} />
                      </button>
                      <button className={styles.pageBtn}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function QuestionnairesPage() {
  const router   = useRouter()
  const { user, loading: authLoading } = useUser()
  const supabase = useMemo(() => createClient(), [])

  const [questions,   setQuestions]   = useState<DisplayQuestion[]>([])
  const [exams,       setExams]       = useState<ExamRow[]>([])
  const [programs,    setPrograms]    = useState<ProgramOption[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const [viewMode,        setViewMode]        = useState<ViewMode>('programs')
  const [selectedProgram, setSelectedProgram] = useState<ProgramOption | null>(null)
  const [search,          setSearch]          = useState('')

  const [showForm,  setShowForm]  = useState(false)
  const [formMode,  setFormMode]  = useState<'create' | 'edit'>('create')
  const [editId,    setEditId]    = useState<string | null>(null)
  const [form,      setForm]      = useState<FormState>(BLANK_FORM)
  const [formError, setFormError] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState(false)
  const [viewQ,     setViewQ]     = useState<DisplayQuestion | null>(null)

  // Import state
  const [showImport,       setShowImport]       = useState(false)
  const [importTab,        setImportTab]        = useState<ImportTab>('file')
  const [importExamId,     setImportExamId]     = useState('')
  const [importProgramId,  setImportProgramId]  = useState('')   // ✅ NEW
  const [importRows,       setImportRows]       = useState<ImportRow[]>([])
  const [importParsing,    setImportParsing]    = useState(false)
  const [importError,      setImportError]      = useState('')
  const [importSaving,     setImportSaving]     = useState(false)
  const [importDone,       setImportDone]       = useState(false)
  const [importCounts,     setImportCounts]     = useState({ inserted: 0, skipped: 0 })
  const [dragOver,         setDragOver]         = useState(false)
  const [importedFileName, setImportedFileName] = useState('')

  const [linkUrl,      setLinkUrl]      = useState('')
  const [linkSource,   setLinkSource]   = useState<{ source: LinkSource; valid: boolean; hint: string } | null>(null)
  const [linkFetching, setLinkFetching] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    const role = (user.user_metadata?.role as string | undefined) ??
                 (user.app_metadata?.role  as string | undefined)
    if (role !== 'admin' && role !== 'faculty') router.replace('/unauthorized')
  }, [user, authLoading, router])

  // ── Fetch programs ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('programs').select('id, code, name').order('code')
      .then(({ data }) => setPrograms((data ?? []) as ProgramOption[]))
  }, [supabase])

  // ── Fetch all questions + exams ───────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else        setLoading(true)
    setError(null)

    const { data: qRows, error: qErr } = await supabase
      .from('questions')
      .select(`
        id, question_text, question_type, points, options,
        correct_answer, explanation, order_number, exam_id,
        created_by, created_at,
        exams ( title, program_id, exam_categories ( name ) )
      `)
      .order('created_at', { ascending: false })

    if (qErr) {
      setError('Could not load questions.')
      setLoading(false); setRefreshing(false); return
    }

    const { data: allExamRows } = await supabase
      .from('exams')
      .select('id, title, category_id, program_id')
      .order('title')

    const rows   = (qRows ?? []) as unknown as QuestionRow[]
    const mapped: DisplayQuestion[] = rows.map((row) => ({
      id:            row.id,
      question_text: row.question_text,
      question_type: row.question_type,
      points:        row.points,
      options:       toOptions(row.options),
      correct_answer: row.correct_answer,
      explanation:   row.explanation,
      order_number:  row.order_number,
      exam_id:       row.exam_id,
      created_by:    row.created_by,
      created_at:    row.created_at,
      categoryName:  row.exams?.exam_categories?.name ?? 'Uncategorized',
      examTitle:     row.exams?.title ?? null,
      // ✅ FIXED: always use program_id from the joined exam row
      examProgramId: row.exams?.program_id ?? null,
      difficulty:    parseDifficulty(row.explanation),
    }))

    setQuestions(mapped)
    setExams((allExamRows ?? []) as ExamRow[])
    setLoading(false)
    setRefreshing(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleRefresh = useCallback(() => { fetchAll(true) }, [fetchAll])

  // ── Derived data ──────────────────────────────────────────────────────────

  // ✅ FIXED: questions that have no examProgramId are shown under "unassigned"
  // and not counted towards any program. The program cards only show questions
  // whose joined exam has a matching program_id.
  const questionsByProgram = useMemo(() => {
    const map: Record<string, DisplayQuestion[]> = {}
    programs.forEach((p) => { map[p.id] = [] })
    questions.forEach((q) => {
      if (q.examProgramId && map[q.examProgramId]) {
        map[q.examProgramId].push(q)
      }
    })
    return map
  }, [questions, programs])

  const programDetailQuestions = useMemo(() => {
    if (!selectedProgram) return []
    const qs = questionsByProgram[selectedProgram.id] ?? []
    if (!search.trim()) return qs
    const q = search.toLowerCase()
    return qs.filter((item) => item.question_text.toLowerCase().includes(q))
  }, [selectedProgram, questionsByProgram, search])

  const questionsByType = useMemo(() => {
    const map = {} as Record<QuestionType, DisplayQuestion[]>
    TYPE_ORDER.forEach((t) => {
      map[t] = programDetailQuestions.filter((q) => q.question_type === t)
    })
    return map
  }, [programDetailQuestions])

  const overallStats = useMemo(() => ({
    total: questions.length,
    mcq:   questions.filter((q) => q.question_type === 'multiple_choice').length,
    easy:  questions.filter((q) => q.difficulty === 'easy').length,
    hard:  questions.filter((q) => q.difficulty === 'hard').length,
  }), [questions])

  // ── Navigation ────────────────────────────────────────────────────────────
  function openProgram(program: ProgramOption) {
    setSelectedProgram(program); setViewMode('program-detail'); setSearch('')
  }
  function backToPrograms() {
    setViewMode('programs'); setSelectedProgram(null); setSearch('')
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    const pid = selectedProgram?.id ?? ''
    const prefilledExamId = pid
      ? (exams.find((e) => e.program_id === pid)?.id ?? '')
      : ''
    setForm({ ...BLANK_FORM, exam_id: prefilledExamId, program_id: pid })
    setFormMode('create'); setEditId(null); setFormError(''); setShowForm(true)
  }

  function openEdit(q: DisplayQuestion) {
    // Find which program this exam belongs to
    const exam = exams.find((e) => e.id === q.exam_id)
    setForm({
      question_text:  q.question_text,
      question_type:  q.question_type,
      points:         q.points,
      correct_answer: q.correct_answer ?? '',
      explanation:    stripDifficultyTag(q.explanation),
      exam_id:        q.exam_id ?? '',
      difficulty:     q.difficulty,
      program_id:     exam?.program_id ?? '',
      choices:        (q.options && q.options.length > 0) ? q.options : BLANK_FORM.choices,
    })
    setFormMode('edit'); setEditId(q.id); setFormError(''); setShowForm(true)
  }

  function closeForm() { setShowForm(false); setFormError(''); setEditId(null) }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // If program changes, reset exam selection
      if (key === 'program_id') next.exam_id = ''
      return next
    })
  }

  function setChoiceText(idx: number, text: string) {
    setForm((prev) => ({
      ...prev,
      choices: prev.choices.map((c, i) => i === idx ? { ...c, text } : c),
    }))
  }

  // Exams filtered by selected program in form
  const examsForForm = useMemo(() => {
    if (!form.program_id) return exams
    return exams.filter((e) => e.program_id === form.program_id)
  }, [exams, form.program_id])

  async function handleSave() {
    setFormError('')
    if (!form.question_text.trim()) { setFormError('Question text is required.'); return }
    if (!form.exam_id)              { setFormError('Please select an exam.');      return }

    const isMCQ = form.question_type === 'multiple_choice'
    const isTF  = form.question_type === 'true_false'
    if (isMCQ) {
      if (form.choices.filter((c) => c.text.trim()).length < 2) {
        setFormError('Provide at least 2 answer choices.'); return
      }
      if (!form.correct_answer) { setFormError('Mark the correct answer.'); return }
    }
    if (isTF && !form.correct_answer) { setFormError('Select True or False.'); return }

    setSaving(true)
    const payload = {
      question_text:  form.question_text.trim(),
      question_type:  form.question_type,
      points:         form.points,
      options:        isMCQ ? form.choices.filter((c) => c.text.trim()) : null,
      correct_answer: form.correct_answer || null,
      explanation:    encodeDifficulty(form.difficulty, form.explanation),
      exam_id:        form.exam_id || null,
    }

    const result = formMode === 'create'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? await supabase.from('questions').insert([payload] as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : await supabase.from('questions').update(payload as any).eq('id', editId ?? '')

    setSaving(false)
    if (result.error) { setFormError(result.error.message); return }
    closeForm()
    // ✅ Silent refresh so the list updates immediately
    await fetchAll(true)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('questions').delete().eq('id', deleteId)
    setDeleting(false); setDeleteId(null)
    await fetchAll(true)
  }

  // ── Import helpers ────────────────────────────────────────────────────────
  function openImport() {
    setShowImport(true); setImportRows([]); setImportError('')
    setImportExamId(''); setImportProgramId(''); setImportDone(false)
    setImportCounts({ inserted: 0, skipped: 0 })
    setImportTab('file'); setLinkUrl(''); setLinkSource(null); setImportedFileName('')
  }
  function closeImport() {
    setShowImport(false); setImportRows([]); setImportError('')
    setImportDone(false); setLinkUrl(''); setLinkSource(null)
  }

  async function handleFileDrop(file: File) {
    setImportError(''); setImportRows([]); setImportParsing(true)
    setImportedFileName(file.name)
    try {
      let rawRows: Record<string, string>[]
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if      (ext === 'csv')                    rawRows = parseCSVText(await file.text())
      else if (ext === 'xlsx' || ext === 'xls')  rawRows = await parseXLSXFile(file)
      else if (ext === 'docx' || ext === 'doc')  rawRows = await parseDOCXFile(file)
      else if (ext === 'pdf')                    rawRows = await parsePDFFile(file)
      else {
        setImportError('Unsupported file type. Accepted: .csv, .xlsx, .xls, .docx, .doc, .pdf')
        setImportParsing(false); return
      }
      if (rawRows.length === 0) {
        setImportError('The file appears empty or no question blocks were detected.')
        setImportParsing(false); return
      }
      setImportRows(rawRows.map((row, idx) => validateImportRow(row, idx)))
    } catch (err) {
      setImportError(`Failed to parse file: ${(err as Error).message}`)
    }
    setImportParsing(false)
  }

  function handleLinkChange(url: string) {
    setLinkUrl(url)
    if (url.trim().length > 5) setLinkSource(detectLinkSource(url.trim()))
    else                        setLinkSource(null)
  }

  // ✅ FIXED: proper async fetch with CORS proxy fallback
  async function handleFetchLink() {
    if (!linkUrl.trim() || !linkSource?.valid) return
    setLinkFetching(true); setImportError(''); setImportRows([])
    try {
      const rawRows = await fetchAndParseLink(linkUrl.trim(), linkSource.source)
      if (rawRows.length === 0) {
        setImportError('No question data found at this URL. Ensure it is publicly accessible and correctly formatted.')
        setLinkFetching(false); return
      }
      setImportRows(rawRows.map((row, idx) => validateImportRow(row, idx)))
      setImportedFileName(linkUrl.trim())
    } catch (err) {
      setImportError(`Could not fetch from URL: ${(err as Error).message}`)
    }
    setLinkFetching(false)
  }

  // Exams filtered by selected import program
  const examsForImport = useMemo(() => {
    if (!importProgramId) return exams
    return exams.filter((e) => e.program_id === importProgramId)
  }, [exams, importProgramId])

  async function handleImportSave() {
    if (!importExamId) {
      setImportError('Please select an exam to assign these questions to.'); return
    }
    const validRows = importRows.filter((r) => r._valid)
    if (validRows.length === 0) { setImportError('No valid rows to import.'); return }

    setImportSaving(true); setImportError('')
    const payloads = validRows.map((r) => {
      const isMCQ = r.question_type === 'multiple_choice'
      const opts: QuestionOption[] = []
      if (isMCQ) {
        if (r.option_a) opts.push({ label: 'A', text: r.option_a })
        if (r.option_b) opts.push({ label: 'B', text: r.option_b })
        if (r.option_c) opts.push({ label: 'C', text: r.option_c })
        if (r.option_d) opts.push({ label: 'D', text: r.option_d })
      }
      return {
        question_text:  r.question_text,
        question_type:  r.question_type as QuestionType,
        points:         r.points,
        options:        isMCQ && opts.length > 0 ? opts : null,
        correct_answer: r.correct_answer || null,
        explanation:    encodeDifficulty(
          VALID_DIFF.includes(r.difficulty) ? (r.difficulty as DifficultyLevel) : 'medium',
          r.explanation,
        ),
        exam_id: importExamId,
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await supabase.from('questions').insert(payloads as any)
    setImportSaving(false)
    if (insErr) { setImportError(insErr.message); return }

    setImportDone(true)
    setImportCounts({ inserted: validRows.length, skipped: importRows.length - validRows.length })
    // ✅ Refresh questions so they appear immediately in the program card
    await fetchAll(true)
  }

  const validCount   = importRows.filter((r) =>  r._valid).length
  const invalidCount = importRows.filter((r) => !r._valid).length

  if (authLoading) return null

  // ── Modals (shared between both views) ────────────────────────────────────
  function renderModals() {
    return (
      <>
        {/* ════ IMPORT MODAL ════ */}
        <AnimatePresence>
          {showImport && (
            <motion.div className={styles.modalOverlay}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => { if (e.target === e.currentTarget) closeImport() }}>
              <motion.div className={styles.formModal} style={{ maxWidth: 720 }}
                variants={modalVariants} initial="hidden" animate="visible" exit="exit">
                <div className={styles.formModalHeader}>
                  <span className={styles.formModalTitle}>
                    <span className={styles.formModalTitleIcon}><Upload size={13} color="#fff" /></span>
                    Import Questions
                  </span>
                  <button className={styles.btnIconClose} onClick={closeImport}><X size={14} /></button>
                </div>

                <div className={styles.form}>
                  {importDone ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <CheckCheck size={26} color="#059669" />
                      </div>
                      <p style={{ fontWeight: 800, fontSize: '1rem', color: '#0d1523', marginBottom: 6 }}>
                        Import Complete
                      </p>
                      <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        <strong style={{ color: '#059669' }}>{importCounts.inserted}</strong>{' '}
                        question{importCounts.inserted !== 1 ? 's' : ''} imported
                        {importCounts.skipped > 0 && (
                          <>, <strong style={{ color: '#dc2626' }}>{importCounts.skipped}</strong> skipped</>
                        )}
                      </p>
                      <button className={styles.btnPrimary} onClick={closeImport} style={{ marginTop: '1.25rem' }}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* ── Tab switcher ── */}
                      <div className={styles.importTabs}>
                        <button
                          className={`${styles.importTab} ${importTab === 'file' ? styles.importTabActive : ''}`}
                          onClick={() => { setImportTab('file'); setImportRows([]); setImportError('') }}>
                          <Upload size={13} /> Upload File
                        </button>
                        <button
                          className={`${styles.importTab} ${importTab === 'link' ? styles.importTabActive : ''}`}
                          onClick={() => { setImportTab('link'); setImportRows([]); setImportError('') }}>
                          <Link2 size={13} /> Import from Link
                        </button>
                      </div>

                      {/* ── FILE TAB ── */}
                      {importTab === 'file' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(79,95,247,0.06)', border: '1px solid rgba(79,95,247,0.15)', borderRadius: 10, padding: '0.6rem 0.9rem' }}>
                            <FileSpreadsheet size={15} color="#4f5ff7" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0d1523' }}>Need a template? </span>
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Download the CSV template to see required columns.</span>
                            </div>
                            <button className={styles.btnSecondary} onClick={downloadTemplate} style={{ fontSize: '0.74rem', padding: '0.28rem 0.65rem', flexShrink: 0 }}>
                              <Download size={12} /> Template
                            </button>
                          </div>

                          <div className={styles.supportedFormats}>
                            <span className={styles.supportedFormatsLabel}>Supported formats:</span>
                            <div className={styles.formatPills}>
                              {[
                                { ext: 'CSV',       color: '#059669', bg: '#ecfdf5' },
                                { ext: 'XLSX / XLS',color: '#059669', bg: '#ecfdf5' },
                                { ext: 'DOCX / DOC',color: '#2563eb', bg: '#eff6ff' },
                                { ext: 'PDF',       color: '#dc2626', bg: '#fef2f2' },
                              ].map((f) => (
                                <span key={f.ext} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: f.bg, color: f.color }}>{f.ext}</span>
                              ))}
                            </div>
                          </div>

                          {/* Drop zone */}
                          <div
                            style={{ marginTop: '0.5rem', border: `2px dashed ${dragOver ? '#4f5ff7' : '#cbd5e1'}`, borderRadius: 12, background: dragOver ? 'rgba(79,95,247,0.04)' : '#fafbff', padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFileDrop(file) }}
                          >
                            <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} style={{ display: 'none' }}
                              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileDrop(file); e.target.value = '' }} />
                            {importParsing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <Loader2 size={22} color="#4f5ff7" style={{ animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Parsing file…</span>
                              </div>
                            ) : importedFileName && importRows.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                {getFileTypeIcon(importedFileName)}
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0d1523' }}>
                                  {importedFileName.length > 40 ? importedFileName.slice(0, 40) + '…' : importedFileName}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Click to replace</span>
                              </div>
                            ) : (
                              <>
                                <Upload size={22} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                                <p style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0d1523', marginBottom: 4 }}>
                                  Drag &amp; drop or click to browse
                                </p>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CSV, XLSX, DOCX, PDF — max 20 MB</p>
                              </>
                            )}
                          </div>
                        </>
                      )}

                      {/* ── LINK TAB ── */}
                      {importTab === 'link' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div className={styles.linkSourceCards}>
                            {[
                              { icon: <Globe size={14} color="#ea4335" />,         label: 'Google Forms',  desc: 'Public form URL',      bg: '#fef2f2', border: '#fecaca' },
                              { icon: <FileSpreadsheet size={14} color="#34a853" />,label: 'Google Sheets', desc: 'Shared spreadsheet',   bg: '#f0fdf4', border: '#bbf7d0' },
                              { icon: <File size={14} color="#4285f4" />,           label: 'Google Docs',   desc: 'Shared document',      bg: '#eff6ff', border: '#bfdbfe' },
                              { icon: <Link2 size={14} color="#7c3aed" />,          label: 'Custom URL',    desc: 'CSV / JSON endpoint',  bg: '#f5f3ff', border: '#ddd6fe' },
                            ].map((s) => (
                              <div key={s.label} className={styles.linkSourceCard} style={{ background: s.bg, borderColor: s.border }}>
                                {s.icon}
                                <div>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0d1523' }}>{s.label}</div>
                                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{s.desc}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.75rem', color: '#92400e' }}>
                            <strong>Note:</strong> Google Forms / Drive links must be set to{' '}
                            <em>&quot;Anyone with the link → Viewer&quot;</em> for import to work.
                          </div>

                          <div>
                            <label className={styles.formLabel} style={{ marginBottom: 5, display: 'block' }}>
                              Paste your link
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <div style={{ position: 'relative', flex: 1 }}>
                                <Link2 size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                  className={styles.formInput}
                                  style={{ paddingLeft: '2rem' }}
                                  placeholder="https://docs.google.com/forms/… or spreadsheet / doc / CSV URL"
                                  value={linkUrl}
                                  onChange={(e) => handleLinkChange(e.target.value)}
                                />
                              </div>
                              <button
                                className={styles.btnPrimary}
                                onClick={handleFetchLink}
                                disabled={!linkSource?.valid || linkFetching}
                                style={{ flexShrink: 0 }}
                              >
                                {linkFetching
                                  ? <Loader2 size={14} className={styles.spinner} />
                                  : <Download size={14} />}
                                {linkFetching ? 'Fetching…' : 'Fetch'}
                              </button>
                            </div>
                            {linkSource && (
                              <p style={{ fontSize: '0.72rem', color: linkSource.valid ? '#059669' : '#dc2626', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {linkSource.valid
                                  ? <CheckCircle2 size={11} />
                                  : <AlertCircle size={11} />}
                                {linkSource.hint}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Preview table — shared between file and link tabs ── */}
                      {importRows.length > 0 && (
                        <>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.08)', borderRadius: 20, padding: '0.2rem 0.65rem' }}>
                              <CheckCircle2 size={12} /> {validCount} valid
                            </span>
                            {invalidCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 600, color: '#dc2626', background: 'rgba(220,38,38,0.08)', borderRadius: 20, padding: '0.2rem 0.65rem' }}>
                                <AlertCircle size={12} /> {invalidCount} with errors
                              </span>
                            )}
                            <span style={{ fontSize: '0.76rem', color: '#94a3b8', marginLeft: 'auto' }}>
                              {importRows.length} rows detected
                            </span>
                          </div>

                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', maxHeight: 210, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                                  {['#','Question','Type','Diff.','Pts','Status'].map((h) => (
                                    <th key={h} style={{ padding: '0.42rem 0.6rem', textAlign: 'left', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {importRows.map((row) => (
                                  <tr key={row._rowIndex} style={{ borderBottom: '1px solid #f1f5f9', background: row._valid ? 'transparent' : 'rgba(220,38,38,0.025)' }}>
                                    <td style={{ padding: '0.38rem 0.6rem', color: '#94a3b8' }}>{row._rowIndex}</td>
                                    <td style={{ padding: '0.38rem 0.6rem', color: '#0d1523', maxWidth: 220 }}>
                                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.question_text || <span style={{ color: '#dc2626', fontStyle: 'italic' }}>missing</span>}
                                      </div>
                                    </td>
                                    <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568', whiteSpace: 'nowrap' }}>{row.question_type || '—'}</td>
                                    <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568', textTransform: 'capitalize' }}>{row.difficulty}</td>
                                    <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568' }}>{row.points}</td>
                                    <td style={{ padding: '0.38rem 0.6rem' }}>
                                      {row._valid
                                        ? <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> OK</span>
                                        : <span title={row._errors.join(' · ')} style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
                                            <AlertCircle size={12} />
                                            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row._errors[0]}</span>
                                          </span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* ✅ Program + Exam selectors for import */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                            <div className={styles.formGroup}>
                              <label className={styles.formLabel}>
                                Degree Program <span style={{ color: '#dc2626' }}>*</span>
                              </label>
                              <div className={styles.selectWrap}>
                                <select
                                  className={styles.formSelect}
                                  value={importProgramId}
                                  onChange={(e) => { setImportProgramId(e.target.value); setImportExamId('') }}
                                >
                                  <option value="">— Select program —</option>
                                  {programs.map((p) => (
                                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                                  ))}
                                </select>
                                <ChevronDown size={13} className={styles.selectChevron} />
                              </div>
                            </div>
                            <div className={styles.formGroup}>
                              <label className={styles.formLabel}>
                                Assign to Exam <span style={{ color: '#dc2626' }}>*</span>
                              </label>
                              <div className={styles.selectWrap}>
                                <select
                                  className={styles.formSelect}
                                  value={importExamId}
                                  onChange={(e) => setImportExamId(e.target.value)}
                                  disabled={!importProgramId}
                                >
                                  <option value="">
                                    {importProgramId ? '— Select exam —' : '— Select program first —'}
                                  </option>
                                  {examsForImport.map((ex) => (
                                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                                  ))}
                                </select>
                                <ChevronDown size={13} className={styles.selectChevron} />
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {importError && (
                        <p className={styles.formError} style={{ marginTop: '0.4rem' }}>
                          <AlertTriangle size={13} /> {importError}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {!importDone && (
                  <div className={styles.formModalFooter}>
                    <button className={styles.btnSecondary} onClick={closeImport}>
                      <X size={13} /> Cancel
                    </button>
                    {importRows.length > 0 && validCount > 0 && (
                      <button
                        className={styles.btnPrimary}
                        onClick={handleImportSave}
                        disabled={importSaving || !importExamId}
                      >
                        {importSaving
                          ? <Loader2 size={14} className={styles.spinner} />
                          : <Upload size={14} />}
                        {importSaving
                          ? 'Importing…'
                          : `Import ${validCount} Question${validCount !== 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════ CREATE / EDIT MODAL ════ */}
        <AnimatePresence>
          {showForm && (
            <motion.div className={styles.modalOverlay}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}>
              <motion.div className={styles.formModal}
                variants={modalVariants} initial="hidden" animate="visible" exit="exit">
                <div className={styles.formModalHeader}>
                  <span className={styles.formModalTitle}>
                    <span className={styles.formModalTitleIcon}>
                      {formMode === 'create' ? <Plus size={14} color="#fff" /> : <Pencil size={13} color="#fff" />}
                    </span>
                    {formMode === 'create' ? 'Add Question' : 'Edit Question'}
                  </span>
                  <button className={styles.btnIconClose} onClick={closeForm}><X size={14} /></button>
                </div>

                <div className={styles.form}>
                  {/* Question text */}
                  <div className={styles.formGroupFull}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                      Question Text
                    </label>
                    <textarea
                      className={styles.formTextarea}
                      placeholder="Enter the full question here…"
                      rows={3}
                      value={form.question_text}
                      onChange={(e) => setField('question_text', e.target.value)}
                    />
                  </div>

                  {/* ✅ NEW: Program selector (row 1) */}
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                        Degree Program
                      </label>
                      <div className={styles.selectWrap}>
                        <select
                          className={styles.formSelect}
                          value={form.program_id}
                          onChange={(e) => setField('program_id', e.target.value)}
                        >
                          <option value="">— Select program —</option>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className={styles.selectChevron} />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                        Assign to Exam
                      </label>
                      <div className={styles.selectWrap}>
                        <select
                          className={styles.formSelect}
                          value={form.exam_id}
                          onChange={(e) => setField('exam_id', e.target.value)}
                          disabled={!form.program_id}
                        >
                          <option value="">
                            {form.program_id ? '— Select exam —' : '— Select program first —'}
                          </option>
                          {examsForForm.map((ex) => (
                            <option key={ex.id} value={ex.id}>{ex.title}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className={styles.selectChevron} />
                      </div>
                    </div>
                  </div>

                  {/* Type + Difficulty + Points */}
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                        Question Type
                      </label>
                      <div className={styles.selectWrap}>
                        <select
                          className={styles.formSelect}
                          value={form.question_type}
                          onChange={(e) => {
                            setField('question_type', e.target.value as QuestionType)
                            setField('correct_answer', '')
                          }}
                        >
                          {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className={styles.selectChevron} />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Difficulty</label>
                      <div className={styles.selectWrap}>
                        <select
                          className={styles.formSelect}
                          value={form.difficulty}
                          onChange={(e) => setField('difficulty', e.target.value as DifficultyLevel)}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                        <ChevronDown size={13} className={styles.selectChevron} />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Points</label>
                      <input
                        className={styles.formInput}
                        type="number"
                        min={1}
                        value={form.points}
                        onChange={(e) => setField('points', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* MCQ choices */}
                  {form.question_type === 'multiple_choice' && (
                    <div className={styles.formGroupFull}>
                      <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                        Answer Choices{' '}
                        <span className={styles.choicesHint}>&nbsp;— click ✓ to mark correct</span>
                      </label>
                      <div className={styles.choicesSection}>
                        {form.choices.map((choice, idx) => (
                          <div key={choice.label} className={styles.choiceRow}>
                            <span className={styles.choiceLabel}>{choice.label}</span>
                            <input
                              className={styles.choiceInput}
                              placeholder={`Choice ${choice.label}`}
                              value={choice.text}
                              onChange={(e) => setChoiceText(idx, e.target.value)}
                            />
                            <button
                              type="button"
                              className={`${styles.choiceCorrectBtn} ${form.correct_answer === choice.label ? styles.choiceCorrectActive : ''}`}
                              onClick={() => setField('correct_answer', choice.label)}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* True / False */}
                  {form.question_type === 'true_false' && (
                    <div className={styles.formGroupFull}>
                      <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                        Correct Answer
                      </label>
                      <div className={styles.selectWrap}>
                        <select
                          className={styles.formSelect}
                          value={form.correct_answer}
                          onChange={(e) => setField('correct_answer', e.target.value)}
                        >
                          <option value="">— Select —</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                        <ChevronDown size={13} className={styles.selectChevron} />
                      </div>
                    </div>
                  )}

                  {/* Short answer / Fill blank / Matching */}
                  {(['short_answer','fill_blank','matching'] as QuestionType[]).includes(form.question_type) && (
                    <div className={styles.formGroupFull}>
                      <label className={styles.formLabel}>Correct Answer</label>
                      <input
                        className={styles.formInput}
                        placeholder={
                          form.question_type === 'matching'
                            ? 'e.g. 1-C, 2-A, 3-B'
                            : 'Enter the expected answer'
                        }
                        value={form.correct_answer}
                        onChange={(e) => setField('correct_answer', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Explanation */}
                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>Explanation (optional)</label>
                    <textarea
                      className={styles.formTextarea}
                      placeholder="Provide an explanation shown to students after grading…"
                      rows={2}
                      value={form.explanation}
                      onChange={(e) => setField('explanation', e.target.value)}
                    />
                  </div>

                  {formError && (
                    <p className={styles.formError}><AlertTriangle size={13} /> {formError}</p>
                  )}
                </div>

                <div className={styles.formModalFooter}>
                  <button className={styles.btnSecondary} onClick={closeForm}>
                    <X size={13} /> Cancel
                  </button>
                  <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                    {saving
                      ? <Loader2 size={14} className={styles.spinner} />
                      : formMode === 'create' ? <Plus size={14} /> : <Pencil size={14} />}
                    {saving ? 'Saving…' : formMode === 'create' ? 'Add Question' : 'Save Changes'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════ DELETE MODAL ════ */}
        <AnimatePresence>
          {deleteId && (
            <motion.div className={styles.modalOverlay}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null) }}>
              <motion.div className={styles.deleteModal}
                variants={modalVariants} initial="hidden" animate="visible" exit="exit">
                <div className={styles.deleteIcon}><Trash2 size={22} color="#dc2626" /></div>
                <p className={styles.deleteTitle}>Delete Question?</p>
                <p className={styles.deleteBody}>
                  This will permanently remove the question. This action cannot be undone.
                </p>
                <div className={styles.deleteActions}>
                  <button className={styles.btnSecondary} onClick={() => setDeleteId(null)} disabled={deleting}>
                    Cancel
                  </button>
                  <button className={styles.btnDanger} onClick={handleDelete} disabled={deleting}>
                    {deleting ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />}
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════ VIEW MODAL ════ */}
        <AnimatePresence>
          {viewQ && (
            <motion.div className={styles.modalOverlay}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => { if (e.target === e.currentTarget) setViewQ(null) }}>
              <motion.div className={styles.viewModal}
                variants={modalVariants} initial="hidden" animate="visible" exit="exit">
                <div className={styles.viewModalHeader}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.92rem', color: '#0d1523', marginBottom: 6, lineHeight: 1.4 }}>
                      {viewQ.question_text}
                    </div>
                    <div className={styles.viewModalMeta}>
                      <TypeTag type={viewQ.question_type} />
                      <DiffBadge diff={viewQ.difficulty} />
                    </div>
                  </div>
                  <button className={styles.btnIconClose} onClick={() => setViewQ(null)}><X size={14} /></button>
                </div>
                <div className={styles.viewModalBody}>
                  {viewQ.question_type === 'multiple_choice' && viewQ.options && (
                    <div className={styles.viewSection}>
                      <div className={styles.viewSectionTitle}>Answer Choices</div>
                      {viewQ.options.map((opt) => (
                        <div key={opt.label} className={`${styles.viewChoice} ${viewQ.correct_answer === opt.label ? styles.viewChoiceCorrect : ''}`}>
                          <span className={styles.viewChoiceLabel}>{opt.label}</span>{opt.text}
                          {viewQ.correct_answer === opt.label && <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />}
                        </div>
                      ))}
                    </div>
                  )}
                  {viewQ.question_type !== 'multiple_choice' && viewQ.question_type !== 'essay' && viewQ.correct_answer && (
                    <div className={styles.viewSection}>
                      <div className={styles.viewSectionTitle}>Correct Answer</div>
                      <div className={styles.correctAnswerBox}>
                        <CheckCircle2 size={14} /> {viewQ.correct_answer}
                      </div>
                    </div>
                  )}
                  {viewQ.explanation && (
                    <div className={styles.viewSection}>
                      <div className={styles.viewSectionTitle}>Explanation</div>
                      <div className={styles.explanationBox}>{stripDifficultyTag(viewQ.explanation)}</div>
                    </div>
                  )}
                  <div className={styles.viewSection}>
                    <div className={styles.viewSectionTitle}>Details</div>
                    <div className={styles.viewSectionContent} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span><strong>Points:</strong> {viewQ.points}</span>
                      {viewQ.examTitle && <span><strong>Exam:</strong> {viewQ.examTitle}</span>}
                      <span><strong>Added:</strong> {new Date(viewQ.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button className={styles.btnSecondary} onClick={() => { setViewQ(null); openEdit(viewQ) }}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button className={styles.btnSecondary} onClick={() => setViewQ(null)}>Close</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  // ── PROGRAM DETAIL VIEW ───────────────────────────────────────────────────
  if (viewMode === 'program-detail' && selectedProgram) {
    const colorIdx       = programs.findIndex((p) => p.id === selectedProgram.id)
    const color          = PROGRAM_COLORS[colorIdx % PROGRAM_COLORS.length]
    const totalInProgram = programDetailQuestions.length

    return (
      <motion.div className={styles.page} variants={pageVariants} initial="hidden" animate="visible">
        <motion.div className={styles.breadcrumb} variants={childVariants}>
          <button className={styles.backBtn} onClick={backToPrograms}>
            <ArrowLeft size={14} /> Question Bank
          </button>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent} style={{ color: color.accent }}>
            {selectedProgram.code}
          </span>
        </motion.div>

        <motion.div className={styles.header} variants={childVariants}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon} style={{ background: color.accent }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <div>
              <h1 className={styles.heading}>{selectedProgram.code}</h1>
              <p className={styles.headingSub}>
                {selectedProgram.name} — {totalInProgram} question{totalInProgram !== 1 ? 's' : ''} across{' '}
                {TYPE_ORDER.filter((t) => questionsByType[t].length > 0).length} type{TYPE_ORDER.filter((t) => questionsByType[t].length > 0).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={`${styles.btnSecondary} ${styles.refreshBtn}`}
              onClick={handleRefresh} disabled={refreshing} title="Refresh">
              <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className={styles.btnSecondary} onClick={openImport}>
              <Upload size={14} /> Import
            </button>
            <button className={styles.btnPrimary} onClick={openCreate}>
              <Plus size={15} /> Add Question
            </button>
          </div>
        </motion.div>

        {/* Type summary strip */}
        <motion.div className={styles.typeSummaryStrip} variants={childVariants}>
          {TYPE_ORDER.map((t) => {
            const count = questionsByType[t].length
            const c     = TYPE_COLORS[t]
            return (
              <div key={t} className={styles.typeSummaryCard} style={{ borderLeftColor: c.color }}>
                <div className={styles.typeSummaryCount} style={{ color: c.color }}>{count}</div>
                <div className={styles.typeSummaryLabel}>{TYPE_LABELS[t]}</div>
              </div>
            )
          })}
        </motion.div>

        {/* Search */}
        <motion.div variants={childVariants} style={{ marginBottom: '1.25rem' }}>
          <div className={styles.searchWrap} style={{ maxWidth: 420 }}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder={`Search questions in ${selectedProgram.code}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')}>
                <X size={13} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Type sections */}
        <motion.div className={styles.typeSections} variants={childVariants}>
          {TYPE_ORDER.map((t) => (
            <QuestionTypeSection
              key={t} type={t} questions={questionsByType[t]} loading={loading}
              onView={setViewQ} onEdit={openEdit} onDelete={setDeleteId}
            />
          ))}
        </motion.div>

        {renderModals()}
      </motion.div>
    )
  }

  // ── PROGRAMS GRID VIEW ────────────────────────────────────────────────────
  return (
    <motion.div className={styles.page} variants={pageVariants} initial="hidden" animate="visible">

      <motion.div className={styles.header} variants={childVariants}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><FileText size={20} color="#fff" /></div>
          <div>
            <h1 className={styles.heading}>Question Bank</h1>
            <p className={styles.headingSub}>Select a degree program to manage its questions</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btnSecondary} ${styles.refreshBtn}`}
            onClick={handleRefresh} disabled={refreshing} title="Refresh">
            <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className={styles.btnSecondary} onClick={openImport}>
            <Upload size={14} /> Import
          </button>
          <button className={styles.btnPrimary} onClick={openCreate}>
            <Plus size={15} /> Add Question
          </button>
        </div>
      </motion.div>

      {/* Overall stats */}
      <motion.div className={styles.statStrip} variants={childVariants}>
        {([
          { label: 'Total Questions', value: overallStats.total, icon: <HelpCircle   size={16} color="#0d2540" />, bg: 'rgba(13,37,64,0.1)'   },
          { label: 'Multiple Choice', value: overallStats.mcq,   icon: <ListChecks   size={16} color="#4f5ff7" />, bg: 'rgba(79,95,247,0.1)'  },
          { label: 'Easy',            value: overallStats.easy,  icon: <CheckCircle2 size={16} color="#059669" />, bg: 'rgba(5,150,105,0.1)'  },
          { label: 'Hard',            value: overallStats.hard,  icon: <AlertTriangle size={16} color="#dc2626" />, bg: 'rgba(220,38,38,0.1)' },
        ] as const).map((s) => (
          <div className={styles.statCard} key={s.label}>
            <div className={styles.statIconWrap} style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div className={styles.errorBanner} variants={childVariants}
            initial="hidden" animate="visible"
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}>
            <AlertTriangle size={15} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={childVariants} className={styles.sectionLabel}>
        <Layers size={13} />
        <span>{programs.length} Degree Programs</span>
      </motion.div>

      {/* Programs grid */}
      <motion.div className={styles.programsGrid} variants={childVariants}>
        {loading ? (
          Array.from({ length: programs.length || 9 }).map((_, i) => (
            <div key={i} className={styles.programCardSkeleton}>
              <div className={styles.skeleton} style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 12 }} />
              <div className={styles.skeleton} style={{ width: '50%', height: 16, marginBottom: 8 }} />
              <div className={styles.skeleton} style={{ width: '80%', height: 11 }} />
            </div>
          ))
        ) : programs.length === 0 ? (
          <div className={styles.emptyState} style={{ gridColumn: '1/-1' }}>
            <div className={styles.emptyIcon}><GraduationCap size={22} color="#94a3b8" /></div>
            <p className={styles.emptyTitle}>No programs found</p>
            <p className={styles.emptySub}>Add programs first to organize your question bank.</p>
          </div>
        ) : (
          programs.map((program, idx) => (
            <ProgramCard
              key={program.id}
              program={program}
              questions={questionsByProgram[program.id] ?? []}
              colorScheme={PROGRAM_COLORS[idx % PROGRAM_COLORS.length]}
              onClick={() => openProgram(program)}
            />
          ))
        )}
      </motion.div>

      {renderModals()}
    </motion.div>
  )
}