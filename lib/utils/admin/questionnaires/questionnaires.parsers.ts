// lib/utils/admin/questionnaires/questionnaires.parsers.ts
import * as XLSX from 'xlsx'
import type { RawRow, LinkSource, LinkDetectResult } from '@/lib/types/admin/questionnaires/questionnaires'

// ── CSV ───────────────────────────────────────────────────────────────────────

export function parseCSVText(text: string): RawRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) { return [] }

  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))

  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes
      } else if (line[i] === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += line[i]
      }
    }
    values.push(current.trim())

    const row: RawRow = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

// ── XLSX ──────────────────────────────────────────────────────────────────────

export async function parseXLSXFile(file: File): Promise<RawRow[]> {
  const buffer   = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) { return [] }

  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval:     '',
    blankrows:  false,
  }) as Record<string, string | number | boolean | null>[]

  return rows.map((row) => {
    const normalized: RawRow = {}
    Object.entries(row).forEach(([key, value]) => {
      normalized[key.trim().toLowerCase().replace(/\s+/g, '_')] = String(value ?? '')
    })
    return normalized
  })
}

// ── DOCX ──────────────────────────────────────────────────────────────────────

export async function parseDOCXFile(file: File): Promise<RawRow[]> {
  const mammoth = await import('mammoth')
  const buffer  = await file.arrayBuffer()

  const [plainResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer: buffer }),
    mammoth.convertToHtml({ arrayBuffer: buffer }),
  ])

  // Build bold-text index from HTML
  const boldTextSet = new Set<string>()
  const strongRe    = /<strong>([\s\S]*?)<\/strong>/g
  let m: RegExpExecArray | null

  while ((m = strongRe.exec(htmlResult.value)) !== null) {
    const inner = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (inner) { boldTextSet.add(inner) }
  }

  function isBold(text: string): boolean {
    const t = text.trim()
    if (!t) { return false }
    if (boldTextSet.has(t)) { return true }
    for (const b of boldTextSet) {
      if (t.includes(b) || b.includes(t)) { return true }
    }
    return false
  }

  const lines = plainResult.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const QUESTION_START = /^(\d+)[.)]\s*(.*)/
  const OPTION_LINE    = /^([a-dA-D])[.)]\s*(.+)/

  const SKIP_RE = [
    /^bachelor\b/i, /^master\b/i, /^mock\s+board/i, /^board\s+exam/i,
    /^direction[s]?[:.\s]/i, /^instruction[s]?[:.\s]/i,
    /^encircle/i, /^choose\s+the/i, /^select\s+the/i,
    /^answer\s+the/i, /^time[:.\s]/i, /^total\s+items/i,
    /^name\s*:/i, /^section\s*:/i, /^date\s*:/i, /^score\s*:/i,
  ]

  function shouldSkip(line: string): boolean {
    return SKIP_RE.some((re) => re.test(line))
  }

  interface Block {
    stemLines:        string[]
    options:          { label: string; text: string; bold: boolean }[]
    explanationLines: string[]
  }

  const rows: RawRow[] = []
  let block: Block | null = null
  let inOptions = false

  function commitBlock(): void {
    if (!block || block.stemLines.length === 0) { return }

    const stem = block.stemLines.join(' ').trim()
    const opts = block.options

    const hasTrueFalse = opts.length >= 2 &&
      opts.every((o) => /^(true|false)$/i.test(o.text.trim()))
    const hasOptions = opts.length >= 2

    const question_type = hasTrueFalse ? 'true_false'
      : hasOptions                     ? 'multiple_choice'
      :                                  'short_answer'

    const correctOpt     = opts.find((o) => o.bold)
    const correct_answer = correctOpt ? correctOpt.label.toUpperCase() : ''

    rows.push({
      question_text:  stem,
      question_type,
      points:         '1',
      difficulty:     'medium',
      correct_answer,
      explanation:    block.explanationLines.join(' ').trim(),
      option_a:       opts.find((o) => o.label.toUpperCase() === 'A')?.text ?? '',
      option_b:       opts.find((o) => o.label.toUpperCase() === 'B')?.text ?? '',
      option_c:       opts.find((o) => o.label.toUpperCase() === 'C')?.text ?? '',
      option_d:       opts.find((o) => o.label.toUpperCase() === 'D')?.text ?? '',
    })
  }

  for (const line of lines) {
    const qMatch = line.match(QUESTION_START)
    const oMatch = line.match(OPTION_LINE)

    if (qMatch) {
      commitBlock()
      const stemStart = qMatch[2].trim()

      if (shouldSkip(stemStart) || shouldSkip(line)) {
        block     = null
        inOptions = false
        continue
      }

      if (/^[A-Z\s,.\-–:]+$/.test(stemStart) && stemStart.length > 5 && !stemStart.includes('?')) {
        block     = null
        inOptions = false
        continue
      }

      block     = { stemLines: stemStart ? [stemStart] : [], options: [], explanationLines: [] }
      inOptions = false
      continue
    }

    if (!block) { continue }

    if (oMatch) {
      inOptions    = true
      const label  = oMatch[1].toUpperCase()
      const text   = oMatch[2].trim()
      const bold   = isBold(text) || isBold(line) || isBold(`${oMatch[1]}. ${text}`)
      block.options.push({ label, text, bold })
      continue
    }

    if (!inOptions) {
      if (!shouldSkip(line) && line.length >= 2) { block.stemLines.push(line) }
    } else {
      if (line.length >= 3) { block.explanationLines.push(line) }
    }
  }

  commitBlock()
  return rows
}

// ── PDF ───────────────────────────────────────────────────────────────────────

interface PDFTextItem      { str: string }
interface PDFPageProxy     { getTextContent: () => Promise<{ items: PDFTextItem[] }> }
interface PDFDocumentProxy {
  numPages: number
  getPage:  (n: number) => Promise<PDFPageProxy>
}
interface PDFjsLib {
  version:              string
  GlobalWorkerOptions:  { workerSrc: string }
  getDocument:          (opts: { data: Uint8Array }) => { promise: Promise<PDFDocumentProxy> }
}

export async function parsePDFFile(file: File): Promise<RawRow[]> {
  const pdfjsLib = await import('pdfjs-dist') as PDFjsLib

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

  const typedarray = new Uint8Array(await file.arrayBuffer())
  const pdf        = await pdfjsLib.getDocument({ data: typedarray }).promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map((item) => item.str).join(' ') + '\n'
  }

  return parseGenericQuestionText(fullText)
}

// ── Generic plain-text fallback ───────────────────────────────────────────────

export function parseGenericQuestionText(text: string): RawRow[] {
  const rows: RawRow[] = []
  const blocks = text.split(/\n(?=\d+[.)]\s)/).filter(Boolean)

  if (blocks.length > 1) {
    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      if (!lines.length) { continue }

      const row: RawRow = {
        question_text: '', question_type: 'multiple_choice', points: '1',
        difficulty: 'medium', correct_answer: '', explanation: '',
        option_a: '', option_b: '', option_c: '', option_d: '',
      }

      row['question_text'] = lines[0].replace(/^\d+[.)]\s*/, '').trim()

      for (let i = 1; i < lines.length; i++) {
        const line     = lines[i]
        const optMatch = line.match(/^([A-Da-d])[.)]\s*(.+)/)
        const ansMatch = line.match(/^(?:answer|correct)[:\s]+([A-Da-d]|true|false)/i)
        const expMatch = line.match(/^(?:explanation|exp)[:\s]+(.+)/i)

        if (optMatch) {
          const lbl = optMatch[1].toUpperCase()
          if (lbl === 'A') { row['option_a'] = optMatch[2] }
          if (lbl === 'B') { row['option_b'] = optMatch[2] }
          if (lbl === 'C') { row['option_c'] = optMatch[2] }
          if (lbl === 'D') { row['option_d'] = optMatch[2] }
        } else if (ansMatch) {
          row['correct_answer'] = ansMatch[1].toUpperCase()
          if (['TRUE', 'FALSE'].includes(row['correct_answer'])) {
            row['question_type'] = 'true_false'
          }
        } else if (expMatch) {
          row['explanation'] = expMatch[1]
        }
      }

      if (!row['option_a'] && !row['option_b']) { row['question_type'] = 'short_answer' }
      rows.push(row)
    }
  } else {
    text.split('\n').forEach((line) => {
      const clean = line.replace(/^\d+[.)]\s*/, '').trim()
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

// ── Link helpers ──────────────────────────────────────────────────────────────

export function detectLinkSource(url: string): LinkDetectResult {
  if (url.includes('docs.google.com/forms')) {
    return { source: 'google_forms', valid: true, hint: 'Google Forms detected. The form must be publicly accessible.' }
  }
  if (
    url.includes('drive.google.com') ||
    url.includes('docs.google.com/spreadsheets') ||
    url.includes('docs.google.com/document')
  ) {
    return { source: 'google_drive', valid: true, hint: 'Google Drive / Docs detected. Set sharing to "Anyone with the link → Viewer".' }
  }
  try {
    new URL(url)
    return { source: 'custom_url', valid: true, hint: 'Custom URL detected. Must return CSV, JSON, or plain text.' }
  } catch {
    return { source: 'custom_url', valid: false, hint: 'Please enter a valid URL.' }
  }
}

function resolveGoogleDriveUrl(url: string): string {
  const sheetMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (sheetMatch) { return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv` }
  const docMatch   = url.match(/document\/d\/([a-zA-Z0-9_-]+)/)
  if (docMatch)   { return `https://docs.google.com/document/d/${docMatch[1]}/export?format=txt` }
  const fileMatch  = url.match(/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch)  { return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}` }
  const openMatch  = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (openMatch)  { return `https://drive.google.com/uc?export=download&id=${openMatch[1]}` }
  return url
}

interface AllOriginsResponse { contents: string }

export async function fetchAndParseLink(url: string, source: LinkSource): Promise<RawRow[]> {
  let fetchUrl = url
  if (source === 'google_drive') { fetchUrl = resolveGoogleDriveUrl(url) }

  let text = ''
  let ok   = false

  try {
    const resp = await fetch(fetchUrl, { mode: 'cors' })
    if (resp.ok) { text = await resp.text(); ok = true }
  } catch { /* CORS blocked — try proxy */ }

  if (!ok) {
    const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(fetchUrl)}`
    const resp    = await fetch(proxied)
    if (!resp.ok) {
      throw new Error(`Failed to fetch (${resp.status}). Ensure the link is publicly accessible.`)
    }
    const json = await resp.json() as AllOriginsResponse
    text = json.contents ?? ''
  }

  if (!text.trim()) { throw new Error('The URL returned empty content.') }

  if (source === 'google_forms') { return parseGoogleFormsHTML(text) }
  if (fetchUrl.includes('format=csv') || text.startsWith('question_text') || text.startsWith('"question_text')) {
    return parseCSVText(text)
  }

  try {
    const json = JSON.parse(text) as RawRow[]
    if (Array.isArray(json)) { return json }
  } catch { /* not JSON */ }

  return parseGenericQuestionText(text)
}

// ── Google Forms HTML parser ───────────────────────────────────────────────────

interface GFChoice { 0: string }
interface GFItem   { 1: string; 3: number; 4?: [{ 1?: GFChoice[] }] }
type GFData        = [unknown, [unknown, GFItem[]]]

function parseGoogleFormsHTML(html: string): RawRow[] {
  const rows: RawRow[] = []
  const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]+?\]);\s*<\/script>/)
  if (!match) { return rows }

  try {
    const data  = JSON.parse(match[1]) as GFData
    const items = data?.[1]?.[1] ?? []

    items.forEach((item, idx) => {
      if (!Array.isArray(item)) { return }
      const gfItem    = item as unknown as GFItem
      const choices: string[] = []
      const choiceList = gfItem[4]?.[0]?.[1]

      if (Array.isArray(choiceList)) {
        choiceList.forEach((c) => {
          if (Array.isArray(c) && typeof c[0] === 'string') { choices.push(c[0]) }
        })
      }

      rows.push({
        question_text:  gfItem[1] ?? `Question ${idx + 1}`,
        question_type:  gfItem[3] === 2 ? 'multiple_choice' : gfItem[3] === 4 ? 'true_false' : 'short_answer',
        points:         '1',
        difficulty:     'medium',
        correct_answer: '',
        explanation:    '',
        option_a:       choices[0] ?? '',
        option_b:       choices[1] ?? '',
        option_c:       choices[2] ?? '',
        option_d:       choices[3] ?? '',
      })
    })
  } catch { /* ignore */ }

  return rows
}

// ── File dispatcher ───────────────────────────────────────────────────────────

export async function parseFile(file: File): Promise<RawRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'csv')                   { return parseCSVText(await file.text()) }
  if (ext === 'xlsx' || ext === 'xls') { return parseXLSXFile(file) }
  if (ext === 'docx' || ext === 'doc') { return parseDOCXFile(file) }
  if (ext === 'pdf')                   { return parsePDFFile(file) }

  throw new Error('Unsupported file type. Accepted: .csv, .xlsx, .xls, .docx, .doc, .pdf')
}