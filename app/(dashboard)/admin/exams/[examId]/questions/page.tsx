// app/(dashboard)/admin/exams/[examId]/questions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  HelpCircle, ArrowLeft, Plus, Search, X, Pencil, Trash2,
  AlertCircle, Loader2, ChevronLeft, ChevronRight, Filter,
  CheckSquare, AlignLeft, List, ToggleLeft, Hash
} from 'lucide-react'
import s from './questions.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching' | 'fill_blank'

interface Question {
  id: string
  question_text: string
  question_type: QuestionType
  points: number
  order_number: number | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false:      'True / False',
  short_answer:    'Short Answer',
  essay:           'Essay',
  matching:        'Matching',
  fill_blank:      'Fill in the Blank',
}

const TYPE_ICONS: Record<QuestionType, React.ElementType> = {
  multiple_choice: CheckSquare,
  true_false:      ToggleLeft,
  short_answer:    AlignLeft,
  essay:           AlignLeft,
  matching:        List,
  fill_blank:      Hash,
}

const TYPE_COLORS: Record<QuestionType, string> = {
  multiple_choice: 'blue',
  true_false:      'green',
  short_answer:    'amber',
  essay:           'violet',
  matching:        'teal',
  fill_blank:      'rose',
}

function generateDummyQuestions(examId: string): Question[] {
  const types: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank']
  const texts = [
    'Which of the following is the correct sequence for handwashing according to WHO guidelines?',
    'A patient presents with dyspnea, orthopnea, and bilateral crackles. What is the most likely diagnosis?',
    'True or False: Insulin should always be stored in the freezer to maintain potency.',
    'Describe the pathophysiology of Type 2 Diabetes Mellitus.',
    'What is the normal range for adult blood pressure according to JNC 8 guidelines?',
    'Match each drug to its corresponding drug class.',
    'The __________ is responsible for filtering blood and producing urine.',
    'A nurse is caring for a postoperative patient. What is the priority assessment?',
    'Which electrolyte imbalance is most associated with cardiac dysrhythmias?',
    'Explain the difference between systolic and diastolic heart failure.',
  ]
  return Array.from({ length: 32 }, (_, i) => ({
    id: `q-${examId}-${i + 1}`,
    question_text: texts[i % texts.length] + (i >= texts.length ? ` (Variation ${Math.floor(i / texts.length) + 1})` : ''),
    question_type: types[i % types.length],
    points: [1, 2, 3, 5][i % 4],
    order_number: i + 1,
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
  }))
}

const PAGE_SIZE = 10

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuestionsPage() {
  const { examId } = useParams<{ examId: string }>()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setQuestions(generateDummyQuestions(examId)); setLoading(false) }, 700)
    return () => clearTimeout(t)
  }, [examId])

  const filtered = questions.filter(q => {
    const matchSearch = !search || q.question_text.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || q.question_type === typeFilter
    return matchSearch && matchType
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await new Promise(r => setTimeout(r, 800))
    setQuestions(prev => prev.filter(q => q.id !== deleteTarget.id))
    setDeleting(false); setDeleteTarget(null)
  }

  const pageNums = (() => {
    const nums: (number | '…')[] = []
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) nums.push(i); return nums }
    nums.push(1)
    if (page > 3) nums.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
    if (page < totalPages - 2) nums.push('…')
    nums.push(totalPages)
    return nums
  })()

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <Link href={`/admin/exams/${examId}`} className={s.backBtn}><ArrowLeft size={14} /> Back to Exam</Link>
        <div className={s.headerMain}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon}><HelpCircle size={20} color="#fff" /></div>
            <div>
              <h1 className={s.heading}>Questions</h1>
              <p className={s.headingSub}>{questions.length} questions · Manage and add exam questions</p>
            </div>
          </div>
          <Link href={`/admin/exams/${examId}/questions/create`} className={s.btnPrimary}>
            <Plus size={14} /> Add Question
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input className={s.searchInput} placeholder="Search questions…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {search && <button className={s.searchClear} onClick={() => { setSearch(''); setPage(1) }}><X size={13} /></button>}
        </div>
        <div className={s.filterGroup}>
          <Filter size={13} className={s.filterIcon} />
          <select className={s.filterSelect} value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value as any); setPage(1) }}>
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Type</th>
                <th>Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className={s.skeletonRow}>
                  <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 24 }} /></td>
                  <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: '80%' }} /></td>
                  <td><div className={`${s.skeleton} ${s.skelBadge}`} /></td>
                  <td><div className={`${s.skeleton} ${s.skelText}`} style={{ width: 30 }} /></td>
                  <td><div className={s.skelActions}><div className={`${s.skeleton} ${s.skelBtn}`} /><div className={`${s.skeleton} ${s.skelBtn}`} /></div></td>
                </tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><HelpCircle size={22} color="var(--text-muted)" /></div>
                    <p className={s.emptyTitle}>No questions found</p>
                    <p className={s.emptySub}>Add your first question or adjust the filters.</p>
                  </div>
                </td></tr>
              ) : paginated.map(q => {
                const Icon = TYPE_ICONS[q.question_type]
                const color = TYPE_COLORS[q.question_type]
                return (
                  <tr key={q.id} className={s.tableRow}>
                    <td><span className={s.orderChip}>{q.order_number ?? '—'}</span></td>
                    <td>
                      <div className={s.questionText}>{q.question_text}</div>
                    </td>
                    <td>
                      <span className={`${s.typeBadge} ${s[`typeBadge_${color}`]}`}>
                        <Icon size={11} />{TYPE_LABELS[q.question_type]}
                      </span>
                    </td>
                    <td><span className={s.pointsChip}>{q.points} pt{q.points !== 1 ? 's' : ''}</span></td>
                    <td>
                      <div className={s.actions}>
                        <Link href={`/admin/exams/${examId}/questions/${q.id}/edit`} className={s.actionEdit} title="Edit">
                          <Pencil size={13} />
                        </Link>
                        <button className={s.actionDelete} title="Delete" onClick={() => setDeleteTarget(q)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className={s.pagination}>
            <span className={s.pageInfo}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className={s.pageButtons}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              {pageNums.map((n, i) => n === '…'
                ? <span key={`d${i}`} className={s.pageDots}>…</span>
                : <button key={n} className={`${s.pageBtn} ${page === n ? s.pageBtnActive : ''}`} onClick={() => setPage(n as number)}>{n}</button>
              )}
              <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className={s.modalOverlay}>
          <div className={s.modal}>
            <div className={s.modalIcon}><Trash2 size={22} color="var(--danger)" /></div>
            <h2 className={s.modalTitle}>Delete Question?</h2>
            <p className={s.modalBody}>This question and all associated answers will be permanently deleted.</p>
            <div className={s.modalActions}>
              <button className={s.btnSecondary} onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className={s.btnDanger} onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={13} className={s.spinner} /> Deleting…</> : <><Trash2 size={13} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}