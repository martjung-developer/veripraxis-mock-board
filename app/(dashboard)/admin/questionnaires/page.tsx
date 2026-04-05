// app/(dashboard)/admin/questionnaires/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  FileText, Plus, Search, X, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Pencil, Trash2, AlertTriangle, Loader2, Filter, CheckCircle2,
  HelpCircle, BookOpen, ListChecks, Upload, FileSpreadsheet,
  AlertCircle, CheckCheck, Download,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { QuestionType } from '@/lib/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants, modalVariants, childVariants } from '@/animations/admin/questionnaires'
import styles from './questionnaires.module.css'

// ── Types ──────────────────────────────────────────────────────────────────────

type DifficultyLevel = 'easy' | 'medium' | 'hard'

interface DisplayQuestion {
  id:             string
  question_text:  string
  question_type:  QuestionType
  points:         number
  options:        QuestionOption[] | null
  correct_answer: string | null
  explanation:    string | null
  order_number:   number | null
  exam_id:        string | null
  created_by:     string | null
  created_at:     string
  categoryName:   string
  examTitle:      string | null
  difficulty:     DifficultyLevel
}

interface QuestionOption {
  label: string
  text:  string
}

interface FormState {
  question_text:  string
  question_type:  QuestionType
  points:         number
  correct_answer: string
  explanation:    string
  exam_id:        string
  difficulty:     DifficultyLevel
  choices:        QuestionOption[]
}

interface ExamRow {
  id:          string
  title:       string
  category_id: string | null
}

interface QuestionRow {
  id:             string
  question_text:  string
  question_type:  QuestionType
  points:         number
  options:        unknown
  correct_answer: string | null
  explanation:    string | null
  order_number:   number | null
  exam_id:        string | null
  created_by:     string | null
  created_at:     string
  exams: {
    title:           string
    exam_categories: { name: string } | null
  } | null
}

// ── Import types ───────────────────────────────────────────────────────────────

interface ImportRow {
  question_text:  string
  question_type:  string
  points:         number
  correct_answer: string
  explanation:    string
  difficulty:     string
  option_a:       string
  option_b:       string
  option_c:       string
  option_d:       string
  _rowIndex:      number
  _errors:        string[]
  _valid:         boolean
}

// ── Constants ──────────────────────────────────────────────────────────────────

const BLANK_FORM: FormState = {
  question_text:  '',
  question_type:  'multiple_choice',
  points:         1,
  correct_answer: '',
  explanation:    '',
  exam_id:        '',
  difficulty:     'medium',
  choices: [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ],
}

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false:      'True / False',
  short_answer:    'Short Answer',
  essay:           'Essay',
  matching:        'Matching',
  fill_blank:      'Fill in the Blank',
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy:   'Easy',
  medium: 'Medium',
  hard:   'Hard',
}

const PAGE_SIZE = 15

const TEMPLATE_HEADERS = [
  'question_text', 'question_type', 'points', 'difficulty',
  'option_a', 'option_b', 'option_c', 'option_d',
  'correct_answer', 'explanation',
]

const VALID_TYPES = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank']
const VALID_DIFF  = ['easy', 'medium', 'hard']

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

// ── CSV / XLSX parsing ─────────────────────────────────────────────────────────

function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
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
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  return raw.map((row) => {
    const normalized: Record<string, string> = {}
    Object.keys(row).forEach((k) => {
      normalized[k.trim().toLowerCase().replace(/\s+/g, '_')] = String(row[k] ?? '')
    })
    return normalized
  })
}

function validateImportRow(raw: Record<string, string>, idx: number): ImportRow {
  const errors: string[] = []
  const question_text  = (raw['question_text']  ?? '').trim()
  const question_type  = (raw['question_type']  ?? '').trim().toLowerCase()
  const points         = Number(raw['points'] ?? 1) || 1
  const difficulty     = (raw['difficulty']     ?? 'medium').trim().toLowerCase()
  const correct_answer = (raw['correct_answer'] ?? '').trim()
  const explanation    = (raw['explanation']    ?? '').trim()
  const option_a       = (raw['option_a']       ?? '').trim()
  const option_b       = (raw['option_b']       ?? '').trim()
  const option_c       = (raw['option_c']       ?? '').trim()
  const option_d       = (raw['option_d']       ?? '').trim()

  if (!question_text)                       errors.push('question_text is required')
  if (!VALID_TYPES.includes(question_type)) errors.push(`invalid question_type "${question_type}"`)
  if (!VALID_DIFF.includes(difficulty))     errors.push(`invalid difficulty "${difficulty}"`)
  if (question_type === 'multiple_choice') {
    if (!option_a || !option_b) errors.push('needs at least option_a and option_b')
    if (!correct_answer)        errors.push('correct_answer required (A/B/C/D)')
  }
  if (question_type === 'true_false') {
    const ca = correct_answer.toLowerCase()
    if (ca !== 'true' && ca !== 'false') errors.push('correct_answer must be "true" or "false"')
  }

  return {
    question_text, question_type, points, difficulty,
    correct_answer, explanation, option_a, option_b, option_c, option_d,
    _rowIndex: idx + 2,
    _errors:   errors,
    _valid:    errors.length === 0,
  }
}

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',')
  const row1 = ['"What is 2 + 2?"', 'multiple_choice', '1', 'easy', '3', '4', '5', '6', 'B', '"Adding two and two gives four"'].join(',')
  const row2 = ['"The Earth is flat."', 'true_false', '1', 'easy', '', '', '', '', 'false', '"The Earth is an oblate spheroid"'].join(',')
  const csv  = [header, row1, row2].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'questions_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TypeTag({ type }: { type: QuestionType }) {
  const cls =
    type === 'multiple_choice' ? styles.typeMCQ   :
    type === 'true_false'      ? styles.typeTF    :
    type === 'essay'           ? styles.typeEssay :
    type === 'fill_blank'      ? styles.typeFill  :
    type === 'short_answer'    ? styles.typeShort :
                                 styles.typeMatch
  return <span className={`${styles.typeTag} ${cls}`}>{TYPE_LABELS[type]}</span>
}

function DiffBadge({ diff }: { diff: DifficultyLevel }) {
  const cls =
    diff === 'easy'   ? styles.diffEasy   :
    diff === 'medium' ? styles.diffMedium :
                        styles.diffHard
  return <span className={`${styles.diffBadge} ${cls}`}>{DIFFICULTY_LABELS[diff]}</span>
}

function SkeletonRow() {
  return (
    <tr>
      <td>
        <div className={styles.skelCell}>
          <div className={styles.skeleton} style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className={styles.skeleton} style={{ width: '75%', height: 11 }} />
            <div className={styles.skeleton} style={{ width: '40%', height: 10 }} />
          </div>
        </div>
      </td>
      <td><div className={styles.skeleton} style={{ width: 90, height: 20, borderRadius: 20 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 72, height: 20, borderRadius: 20 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 60, height: 20, borderRadius: 20 }} /></td>
      <td><div className={styles.skeleton} style={{ width: 32, height: 18 }} /></td>
      <td>
        <div className={styles.skelActions}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeleton} style={{ width: 30, height: 30, borderRadius: 8 }} />
          ))}
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function QuestionnairesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [questions,  setQuestions]  = useState<DisplayQuestion[]>([])
  const [exams,      setExams]      = useState<ExamRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  // Filters
  const [search,     setSearch]     = useState('')
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all')
  const [filterDiff, setFilterDiff] = useState<DifficultyLevel | 'all'>('all')
  const [filterExam, setFilterExam] = useState('all')
  const [page,       setPage]       = useState(1)

  // Modals
  const [showForm,   setShowForm]   = useState(false)
  const [formMode,   setFormMode]   = useState<'create' | 'edit'>('create')
  const [editId,     setEditId]     = useState<string | null>(null)
  const [form,       setForm]       = useState<FormState>(BLANK_FORM)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)
  const [viewQ,      setViewQ]      = useState<DisplayQuestion | null>(null)

  // Import modal
  const [showImport,    setShowImport]    = useState(false)
  const [importExamId,  setImportExamId]  = useState('')
  const [importRows,    setImportRows]    = useState<ImportRow[]>([])
  const [importParsing, setImportParsing] = useState(false)
  const [importError,   setImportError]   = useState('')
  const [importSaving,  setImportSaving]  = useState(false)
  const [importDone,    setImportDone]    = useState(false)
  const [importCounts,  setImportCounts]  = useState({ inserted: 0, skipped: 0 })
  const [dragOver,      setDragOver]      = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)

    const { data: qRows, error: qErr } = await supabase
      .from('questions')
      .select(`
        id, question_text, question_type, points, options,
        correct_answer, explanation, order_number, exam_id,
        created_by, created_at,
        exams ( title, exam_categories ( name ) )
      `)
      .order('created_at', { ascending: false })

    if (qErr) { setError('Could not load questions. Please try again.'); setLoading(false); return }

    const { data: allExamRows } = await supabase
      .from('exams').select('id, title, category_id').order('title')

    const rows = (qRows ?? []) as unknown as QuestionRow[]
    const mapped: DisplayQuestion[] = rows.map((row) => ({
      id:             row.id,
      question_text:  row.question_text,
      question_type:  row.question_type,
      points:         row.points,
      options:        toOptions(row.options),
      correct_answer: row.correct_answer,
      explanation:    row.explanation,
      order_number:   row.order_number,
      exam_id:        row.exam_id,
      created_by:     row.created_by,
      created_at:     row.created_at,
      categoryName:   row.exams?.exam_categories?.name ?? 'Uncategorized',
      examTitle:      row.exams?.title ?? null,
      difficulty:     parseDifficulty(row.explanation),
    }))

    setQuestions(mapped); setExams(allExamRows ?? []); setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return questions.filter((item) => {
      if (filterType !== 'all' && item.question_type !== filterType) return false
      if (filterDiff !== 'all' && item.difficulty    !== filterDiff) return false
      if (filterExam !== 'all' && item.exam_id       !== filterExam) return false
      if (q && !item.question_text.toLowerCase().includes(q))        return false
      return true
    })
  }, [questions, search, filterType, filterDiff, filterExam])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const stats = useMemo(() => ({
    total: questions.length,
    mcq:   questions.filter((q) => q.question_type === 'multiple_choice').length,
    easy:  questions.filter((q) => q.difficulty === 'easy').length,
    hard:  questions.filter((q) => q.difficulty === 'hard').length,
  }), [questions])

  // ── Form helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setForm(BLANK_FORM); setFormMode('create'); setEditId(null); setFormError(''); setShowForm(true)
  }

  function openEdit(q: DisplayQuestion) {
    setForm({
      question_text:  q.question_text,
      question_type:  q.question_type,
      points:         q.points,
      correct_answer: q.correct_answer ?? '',
      explanation:    stripDifficultyTag(q.explanation),
      exam_id:        q.exam_id ?? '',
      difficulty:     q.difficulty,
      choices:        (q.options && q.options.length > 0) ? q.options : BLANK_FORM.choices,
    })
    setFormMode('edit'); setEditId(q.id); setFormError(''); setShowForm(true)
  }

  function closeForm() { setShowForm(false); setFormError(''); setEditId(null) }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setChoiceText(idx: number, text: string) {
    setForm((prev) => ({
      ...prev,
      choices: prev.choices.map((c, i) => i === idx ? { ...c, text } : c),
    }))
  }

  // ── Save single ────────────────────────────────────────────────────────────

  async function handleSave() {
    setFormError('')
    if (!form.question_text.trim()) { setFormError('Question text is required.'); return }
    if (!form.exam_id)              { setFormError('Please select an exam.'); return }

    const isMCQ = form.question_type === 'multiple_choice'
    const isTF  = form.question_type === 'true_false'

    if (isMCQ) {
      if (form.choices.filter((c) => c.text.trim()).length < 2) { setFormError('Provide at least 2 answer choices.'); return }
      if (!form.correct_answer) { setFormError('Mark the correct answer.'); return }
    }
    if (isTF && !form.correct_answer) { setFormError('Select True or False as the correct answer.'); return }

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
      ? await supabase.from('questions').insert(payload)
      : await supabase.from('questions').update(payload).eq('id', editId ?? '')

    setSaving(false)
    if (result.error) { setFormError(result.error.message); return }
    closeForm(); fetchAll()
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('questions').delete().eq('id', deleteId)
    setDeleting(false); setDeleteId(null); fetchAll()
  }

  // ── Import helpers ─────────────────────────────────────────────────────────

  function openImport() {
    setShowImport(true); setImportRows([]); setImportError('')
    setImportExamId(''); setImportDone(false); setImportCounts({ inserted: 0, skipped: 0 })
  }

  function closeImport() {
    setShowImport(false); setImportRows([]); setImportError(''); setImportDone(false)
  }

  async function handleFileDrop(file: File) {
    setImportError(''); setImportRows([]); setImportParsing(true)
    try {
      let rawRows: Record<string, string>[]
      if (file.name.endsWith('.csv')) {
        rawRows = parseCSVText(await file.text())
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        rawRows = await parseXLSXFile(file)
      } else {
        setImportError('Unsupported file type. Please upload a .csv or .xlsx file.')
        setImportParsing(false); return
      }
      if (rawRows.length === 0) {
        setImportError('The file appears to be empty or has no data rows.')
        setImportParsing(false); return
      }
      setImportRows(rawRows.map((row, idx) => validateImportRow(row, idx)))
    } catch (err) {
      setImportError('Failed to parse the file. Please check the format and try again.')
      console.error(err)
    }
    setImportParsing(false)
  }

  async function handleImportSave() {
    if (!importExamId) { setImportError('Please select an exam to assign these questions to.'); return }
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

    const { error: insErr } = await supabase.from('questions').insert(payloads)
    setImportSaving(false)
    if (insErr) { setImportError(insErr.message); return }

    setImportDone(true)
    setImportCounts({ inserted: validRows.length, skipped: importRows.length - validRows.length })
    fetchAll()
  }

  // ── Pagination ─────────────────────────────────────────────────────────────

  const pageNums = useMemo<(number | '…')[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const nums: (number | '…')[] = [1]
    if (safePage > 3) nums.push('…')
    const start = Math.max(2, safePage - 1)
    const end   = Math.min(totalPages - 1, safePage + 1)
    for (let i = start; i <= end; i++) nums.push(i)
    if (safePage < totalPages - 2) nums.push('…')
    nums.push(totalPages)
    return nums
  }, [totalPages, safePage])

  const validCount   = importRows.filter((r) => r._valid).length
  const invalidCount = importRows.filter((r) => !r._valid).length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className={styles.page}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >

      {/* ── Header ── */}
      <motion.div className={styles.header} variants={childVariants}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <FileText size={20} color="#fff" />
          </div>
          <div>
            <h1 className={styles.heading}>Question Bank</h1>
            <p className={styles.headingSub}>Create and manage questions for mock exams</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={openImport}>
            <Upload size={14} /> Import CSV / Excel
          </button>
          <button className={styles.btnPrimary} onClick={openCreate}>
            <Plus size={15} /> Add Question
          </button>
        </div>
      </motion.div>

      {/* ── Stat Strip ── */}
      <motion.div className={styles.statStrip} variants={childVariants}>
        {([
          { label: 'Total Questions', value: stats.total, icon: <HelpCircle    size={16} color="#0d2540" />, bg: 'rgba(13,37,64,0.1)'   },
          { label: 'Multiple Choice', value: stats.mcq,   icon: <ListChecks    size={16} color="#4f5ff7" />, bg: 'rgba(79,95,247,0.1)'  },
          { label: 'Easy',            value: stats.easy,  icon: <CheckCircle2  size={16} color="#059669" />, bg: 'rgba(5,150,105,0.1)'  },
          { label: 'Hard',            value: stats.hard,  icon: <AlertTriangle size={16} color="#dc2626" />, bg: 'rgba(220,38,38,0.1)'  },
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

      {/* ── Error Banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.errorBanner}
            variants={childVariants}
            initial="hidden" animate="visible"
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
          >
            <AlertTriangle size={15} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter Bar ── */}
      <motion.div className={styles.filterBar} variants={childVariants}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search questions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <Filter size={13} className={styles.filterIcon} />
          <select className={styles.filterSelect} value={filterType}
            onChange={(e) => { setFilterType(e.target.value as QuestionType | 'all'); setPage(1) }}>
            <option value="all">All Types</option>
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <BookOpen size={13} className={styles.filterIcon} />
          <select className={styles.filterSelect} value={filterDiff}
            onChange={(e) => { setFilterDiff(e.target.value as DifficultyLevel | 'all'); setPage(1) }}>
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <FileText size={13} className={styles.filterIcon} />
          <select className={styles.filterSelect} value={filterExam}
            onChange={(e) => { setFilterExam(e.target.value); setPage(1) }}>
            <option value="all">All Exams</option>
            {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
          </select>
        </div>

        {(search || filterType !== 'all' || filterDiff !== 'all' || filterExam !== 'all') && (
          <button className={styles.clearBtn} onClick={() => {
            setSearch(''); setFilterType('all'); setFilterDiff('all'); setFilterExam('all'); setPage(1)
          }}>
            <X size={13} /> Clear
          </button>
        )}

        <p className={styles.resultCount}>
          <strong>{filtered.length}</strong> question{filtered.length !== 1 ? 's' : ''} found
        </p>
      </motion.div>

      {/* ── Table ── */}
      <motion.div className={styles.tableCard} variants={childVariants}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '38%' }}>Question</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Category</th>
                <th>Pts</th>
                <th style={{ width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}><HelpCircle size={22} color="#8a9ab5" /></div>
                      <p className={styles.emptyTitle}>No questions found</p>
                      <p className={styles.emptySub}>
                        {search || filterType !== 'all' || filterDiff !== 'all'
                          ? 'Try adjusting your search or filters.'
                          : 'Add your first question or import from a file.'}
                      </p>
                      {!search && filterType === 'all' && filterDiff === 'all' && (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                          <button className={styles.btnSecondary} onClick={openImport}>
                            <Upload size={13} /> Import File
                          </button>
                          <button className={styles.btnPrimary} onClick={openCreate}>
                            <Plus size={14} /> Add Question
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : paginated.map((q) => (
                <tr key={q.id} className={styles.tableRow}>
                  <td>
                    <div className={styles.questionCell}>
                      <div className={styles.questionIconWrap}>
                        <HelpCircle size={15} color="#0d2540" strokeWidth={2} />
                      </div>
                      <div>
                        <div className={styles.questionText}>{q.question_text}</div>
                        <div className={styles.questionPoints}>
                          {q.points} pt{q.points !== 1 ? 's' : ''}
                          {q.examTitle ? ` · ${q.examTitle}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><TypeTag type={q.question_type} /></td>
                  <td><DiffBadge diff={q.difficulty} /></td>
                  <td><span className={styles.categoryTag}>{q.categoryName}</span></td>
                  <td style={{ fontWeight: 700, color: '#4a5568', fontSize: '0.8rem' }}>{q.points}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={`${styles.actionBtn} ${styles.actionView}`} title="View" onClick={() => setViewQ(q)}><Eye size={14} /></button>
                      <button className={`${styles.actionBtn} ${styles.actionEdit}`} title="Edit" onClick={() => openEdit(q)}><Pencil size={14} /></button>
                      <button className={`${styles.actionBtn} ${styles.actionDelete}`} title="Delete" onClick={() => setDeleteId(q.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Page {safePage} of {totalPages} · {filtered.length} total
            </span>
            <div className={styles.pageButtons}>
              <button className={styles.pageBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page">
                <ChevronLeft size={15} />
              </button>
              {pageNums.map((n, i) =>
                n === '…'
                  ? <span key={`ellipsis-${i}`} className={styles.pageDots}>…</span>
                  : <button key={`page-${n}`} className={`${styles.pageBtn} ${safePage === n ? styles.pageBtnActive : ''}`} onClick={() => setPage(n)}>{n}</button>
              )}
              <button className={styles.pageBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ════════════════════════════════════════
          IMPORT MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeImport() }}
          >
            <motion.div
              className={styles.formModal}
              style={{ maxWidth: 680 }}
              variants={modalVariants}
              initial="hidden" animate="visible" exit="exit"
            >
              {/* Header */}
              <div className={styles.formModalHeader}>
                <span className={styles.formModalTitle}>
                  <span className={styles.formModalTitleIcon}>
                    <Upload size={13} color="#fff" />
                  </span>
                  Import Questions
                </span>
                <button className={styles.btnIconClose} onClick={closeImport} aria-label="Close">
                  <X size={14} />
                </button>
              </div>

              <div className={styles.form}>

                {/* ── Success state ── */}
                {importDone ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'rgba(5,150,105,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 1rem',
                    }}>
                      <CheckCheck size={26} color="#059669" />
                    </div>
                    <p style={{ fontWeight: 800, fontSize: '1rem', color: '#0d1523', marginBottom: 6 }}>
                      Import Complete
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      <strong style={{ color: '#059669' }}>{importCounts.inserted}</strong>{' '}
                      question{importCounts.inserted !== 1 ? 's' : ''} imported successfully
                      {importCounts.skipped > 0 && (
                        <>, <strong style={{ color: '#dc2626' }}>{importCounts.skipped}</strong>{' '}
                        row{importCounts.skipped !== 1 ? 's' : ''} skipped due to errors</>
                      )}
                    </p>
                    <button className={styles.btnPrimary} onClick={closeImport} style={{ marginTop: '1.25rem' }}>
                      Done
                    </button>
                  </div>

                ) : (
                  <>
                    {/* ── Template download hint ── */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(79,95,247,0.06)',
                      border: '1px solid rgba(79,95,247,0.15)',
                      borderRadius: 10, padding: '0.6rem 0.9rem',
                    }}>
                      <FileSpreadsheet size={15} color="#4f5ff7" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0d1523' }}>
                          Need a template?{' '}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Download the CSV template to see the required columns and example rows.
                        </span>
                      </div>
                      <button
                        className={styles.btnSecondary}
                        onClick={downloadTemplate}
                        style={{ fontSize: '0.74rem', padding: '0.28rem 0.65rem', flexShrink: 0 }}
                      >
                        <Download size={12} /> Template
                      </button>
                    </div>

                    {/* ── Drop zone ── */}
                    <div
                      style={{
                        marginTop: '0.75rem',
                        border: `2px dashed ${dragOver ? '#4f5ff7' : '#cbd5e1'}`,
                        borderRadius: 12,
                        background: dragOver ? 'rgba(79,95,247,0.04)' : '#fafbff',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault(); setDragOver(false)
                        const file = e.dataTransfer.files[0]
                        if (file) handleFileDrop(file)
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileDrop(file)
                          e.target.value = ''
                        }}
                      />
                      {importParsing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <Loader2 size={22} color="#4f5ff7" style={{ animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Parsing file…</span>
                        </div>
                      ) : (
                        <>
                          <Upload size={22} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                          <p style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0d1523', marginBottom: 4 }}>
                            Drag & drop your file here, or click to browse
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Supports .csv and .xlsx — max 5 MB
                          </p>
                        </>
                      )}
                    </div>

                    {/* ── Preview table ── */}
                    {importRows.length > 0 && (
                      <>
                        {/* Validation badges */}
                        <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: '0.76rem', fontWeight: 600, color: '#059669',
                            background: 'rgba(5,150,105,0.08)', borderRadius: 20, padding: '0.2rem 0.65rem',
                          }}>
                            <CheckCircle2 size={12} /> {validCount} valid
                          </span>
                          {invalidCount > 0 && (
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              fontSize: '0.76rem', fontWeight: 600, color: '#dc2626',
                              background: 'rgba(220,38,38,0.08)', borderRadius: 20, padding: '0.2rem 0.65rem',
                            }}>
                              <AlertCircle size={12} /> {invalidCount} with errors — will be skipped
                            </span>
                          )}
                          <span style={{ fontSize: '0.76rem', color: '#94a3b8', marginLeft: 'auto' }}>
                            {importRows.length} row{importRows.length !== 1 ? 's' : ''} detected
                          </span>
                        </div>

                        {/* Scrollable preview */}
                        <div style={{
                          marginTop: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          overflow: 'hidden',
                          maxHeight: 210,
                          overflowY: 'auto',
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                                {['#', 'Question', 'Type', 'Diff.', 'Pts', 'Status'].map((h) => (
                                  <th key={h} style={{ padding: '0.42rem 0.6rem', textAlign: 'left', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {importRows.map((row) => (
                                <tr key={row._rowIndex} style={{
                                  borderBottom: '1px solid #f1f5f9',
                                  background: row._valid ? 'transparent' : 'rgba(220,38,38,0.025)',
                                }}>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#94a3b8' }}>{row._rowIndex}</td>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#0d1523', maxWidth: 220 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {row.question_text || <span style={{ color: '#dc2626', fontStyle: 'italic' }}>missing</span>}
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568', whiteSpace: 'nowrap' }}>
                                    {row.question_type || '—'}
                                  </td>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568', textTransform: 'capitalize' }}>
                                    {row.difficulty}
                                  </td>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568' }}>{row.points}</td>
                                  <td style={{ padding: '0.38rem 0.6rem' }}>
                                    {row._valid ? (
                                      <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <CheckCircle2 size={12} /> OK
                                      </span>
                                    ) : (
                                      <span
                                        title={row._errors.join(' · ')}
                                        style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}
                                      >
                                        <AlertCircle size={12} />
                                        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {row._errors[0]}
                                        </span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Exam selector */}
                        <div className={styles.formGroup} style={{ marginTop: '0.8rem', maxWidth: 340 }}>
                          <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                            Assign all questions to Exam
                          </label>
                          <div className={styles.selectWrap}>
                            <select
                              className={styles.formSelect}
                              value={importExamId}
                              onChange={(e) => setImportExamId(e.target.value)}
                            >
                              <option value="">— Select exam —</option>
                              {exams.map((ex) => (
                                <option key={ex.id} value={ex.id}>{ex.title}</option>
                              ))}
                            </select>
                            <ChevronDown size={13} className={styles.selectChevron} />
                          </div>
                        </div>
                      </>
                    )}

                    {importError && (
                      <p className={styles.formError} style={{ marginTop: '0.6rem' }}>
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

      {/* ════════════════════════════════════════
          CREATE / EDIT MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}
          >
            <motion.div
              className={styles.formModal}
              variants={modalVariants}
              initial="hidden" animate="visible" exit="exit"
            >
              <div className={styles.formModalHeader}>
                <span className={styles.formModalTitle}>
                  <span className={styles.formModalTitleIcon}>
                    {formMode === 'create' ? <Plus size={14} color="#fff" /> : <Pencil size={13} color="#fff" />}
                  </span>
                  {formMode === 'create' ? 'Add Question' : 'Edit Question'}
                </span>
                <button className={styles.btnIconClose} onClick={closeForm} aria-label="Close"><X size={14} /></button>
              </div>

              <div className={styles.form}>
                <div className={styles.formGroupFull}>
                  <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Question Text</label>
                  <textarea className={styles.formTextarea} placeholder="Enter the full question here…" rows={3}
                    value={form.question_text} onChange={(e) => setField('question_text', e.target.value)} />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Question Type</label>
                    <div className={styles.selectWrap}>
                      <select className={styles.formSelect} value={form.question_type}
                        onChange={(e) => { setField('question_type', e.target.value as QuestionType); setField('correct_answer', '') }}>
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
                      <select className={styles.formSelect} value={form.difficulty}
                        onChange={(e) => setField('difficulty', e.target.value as DifficultyLevel)}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <ChevronDown size={13} className={styles.selectChevron} />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Assign to Exam</label>
                    <div className={styles.selectWrap}>
                      <select className={styles.formSelect} value={form.exam_id}
                        onChange={(e) => setField('exam_id', e.target.value)}>
                        <option value="">— Select exam —</option>
                        {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                      </select>
                      <ChevronDown size={13} className={styles.selectChevron} />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Points</label>
                    <input className={styles.formInput} type="number" min={1} value={form.points}
                      onChange={(e) => setField('points', Number(e.target.value))} />
                  </div>
                </div>

                {form.question_type === 'multiple_choice' && (
                  <div className={styles.formGroupFull}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                      Answer Choices
                      <span className={styles.choicesHint}>&nbsp;— click ✓ to mark correct</span>
                    </label>
                    <div className={styles.choicesSection}>
                      {form.choices.map((choice, idx) => (
                        <div key={choice.label} className={styles.choiceRow}>
                          <span className={styles.choiceLabel}>{choice.label}</span>
                          <input className={styles.choiceInput} placeholder={`Choice ${choice.label}`}
                            value={choice.text} onChange={(e) => setChoiceText(idx, e.target.value)} />
                          <button type="button"
                            className={`${styles.choiceCorrectBtn} ${form.correct_answer === choice.label ? styles.choiceCorrectActive : ''}`}
                            onClick={() => setField('correct_answer', choice.label)} title="Mark as correct">
                            <CheckCircle2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {form.question_type === 'true_false' && (
                  <div className={styles.formGroupFull}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Correct Answer</label>
                    <div className={styles.selectWrap}>
                      <select className={styles.formSelect} value={form.correct_answer}
                        onChange={(e) => setField('correct_answer', e.target.value)}>
                        <option value="">— Select —</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                      <ChevronDown size={13} className={styles.selectChevron} />
                    </div>
                  </div>
                )}

                {(form.question_type === 'short_answer' || form.question_type === 'fill_blank' || form.question_type === 'matching') && (
                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>Correct Answer</label>
                    <input className={styles.formInput}
                      placeholder={form.question_type === 'matching' ? 'e.g. 1-C, 2-A, 3-B' : 'Enter the expected answer'}
                      value={form.correct_answer} onChange={(e) => setField('correct_answer', e.target.value)} />
                  </div>
                )}

                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel}>Explanation (optional)</label>
                  <textarea className={styles.formTextarea}
                    placeholder="Provide an explanation shown to students after grading…"
                    rows={2} value={form.explanation}
                    onChange={(e) => setField('explanation', e.target.value)} />
                </div>

                {formError && <p className={styles.formError}><AlertTriangle size={13} /> {formError}</p>}
              </div>

              <div className={styles.formModalFooter}>
                <button className={styles.btnSecondary} onClick={closeForm}><X size={13} /> Cancel</button>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={14} className={styles.spinner} />
                    : formMode === 'create' ? <Plus size={14} /> : <Pencil size={14} />}
                  {saving ? 'Saving…' : formMode === 'create' ? 'Add Question' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          DELETE CONFIRM MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null) }}
          >
            <motion.div className={styles.deleteModal} variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <div className={styles.deleteIcon}><Trash2 size={22} color="#dc2626" /></div>
              <p className={styles.deleteTitle}>Delete Question?</p>
              <p className={styles.deleteBody}>
                This will permanently remove the question from the question bank.
                This action cannot be undone.
              </p>
              <div className={styles.deleteActions}>
                <button className={styles.btnSecondary} onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</button>
                <button className={styles.btnDanger} onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />}
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          VIEW MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {viewQ && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { if (e.target === e.currentTarget) setViewQ(null) }}
          >
            <motion.div className={styles.viewModal} variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <div className={styles.viewModalHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800,
                    fontSize: '0.92rem', color: '#0d1523', marginBottom: 6, lineHeight: 1.4,
                  }}>
                    {viewQ.question_text}
                  </div>
                  <div className={styles.viewModalMeta}>
                    <TypeTag type={viewQ.question_type} />
                    <DiffBadge diff={viewQ.difficulty} />
                    <span className={styles.categoryTag}>{viewQ.categoryName}</span>
                  </div>
                </div>
                <button className={styles.btnIconClose} onClick={() => setViewQ(null)} aria-label="Close"><X size={14} /></button>
              </div>

              <div className={styles.viewModalBody}>
                {viewQ.question_type === 'multiple_choice' && viewQ.options && (
                  <div className={styles.viewSection}>
                    <div className={styles.viewSectionTitle}>Answer Choices</div>
                    {viewQ.options.map((opt) => (
                      <div key={opt.label}
                        className={`${styles.viewChoice} ${viewQ.correct_answer === opt.label ? styles.viewChoiceCorrect : ''}`}>
                        <span className={styles.viewChoiceLabel}>{opt.label}</span>
                        {opt.text}
                        {viewQ.correct_answer === opt.label && <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />}
                      </div>
                    ))}
                  </div>
                )}

                {viewQ.question_type !== 'multiple_choice' && viewQ.question_type !== 'essay' && viewQ.correct_answer && (
                  <div className={styles.viewSection}>
                    <div className={styles.viewSectionTitle}>Correct Answer</div>
                    <div className={styles.correctAnswerBox}><CheckCircle2 size={14} /> {viewQ.correct_answer}</div>
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
                    <span>
                      <strong>Added:</strong>{' '}
                      {new Date(viewQ.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
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

    </motion.div>
  )
}