// lib/constants/questionnaires.constants.ts
import type { QuestionType } from '@/lib/types/database'
import type { DifficultyLevel, FormState } from '@/lib/types/admin/questionnaires/questionnaires'

export const BLANK_FORM: FormState = {
  question_text:  '',
  question_type:  'multiple_choice',
  points:         1,
  correct_answer: '',
  explanation:    '',
  exam_id:        '',
  difficulty:     'medium',
  program_id:     '',
  choices: [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ],
}

export const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false:      'True / False',
  short_answer:    'Short Answer',
  essay:           'Essay',
  matching:        'Matching',
  fill_blank:      'Fill in the Blank',
}

export const TYPE_ORDER: QuestionType[] = [
  'multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank',
]

export const TYPE_COLORS: Record<QuestionType, { bg: string; color: string; border: string }> = {
  multiple_choice: { bg: '#eef0fe', color: '#4f5ff7', border: 'rgba(79,95,247,0.2)'  },
  true_false:      { bg: '#ecfeff', color: '#0891b2', border: 'rgba(8,145,178,0.2)'  },
  short_answer:    { bg: '#ecfdf5', color: '#059669', border: 'rgba(5,150,105,0.2)'  },
  essay:           { bg: '#f5f3ff', color: '#7c3aed', border: 'rgba(124,58,237,0.2)' },
  matching:        { bg: '#fff7ed', color: '#c2410c', border: 'rgba(194,65,12,0.2)'  },
  fill_blank:      { bg: '#fffbeb', color: '#d97706', border: 'rgba(217,119,6,0.2)'  },
}

export const PROGRAM_COLORS = [
  { bg: '#eff6ff', accent: '#2563eb', border: '#dbeafe' },
  { bg: '#f0fdf4', accent: '#059669', border: '#d1fae5' },
  { bg: '#fdf4ff', accent: '#9333ea', border: '#f3e8ff' },
  { bg: '#fff7ed', accent: '#ea580c', border: '#fed7aa' },
  { bg: '#ecfeff', accent: '#0891b2', border: '#cffafe' },
  { bg: '#fefce8', accent: '#ca8a04', border: '#fef9c3' },
  { bg: '#fdf2f8', accent: '#db2777', border: '#fce7f3' },
  { bg: '#f0fdf4', accent: '#16a34a', border: '#bbf7d0' },
  { bg: '#f8fafc', accent: '#475569', border: '#e2e8f0' },
] as const

export type ProgramColorScheme = typeof PROGRAM_COLORS[number]

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy:   'Easy',
  medium: 'Medium',
  hard:   'Hard',
}

export const PAGE_SIZE = 15

export const TEMPLATE_HEADERS = [
  'question_text', 'question_type', 'points', 'difficulty',
  'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation',
]

export const VALID_TYPES = [
  'multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank',
] as const

export const VALID_DIFF = ['easy', 'medium', 'hard'] as const

export const ACCEPTED_FILE_TYPES = '.csv,.xlsx,.xls,.docx,.doc,.pdf'