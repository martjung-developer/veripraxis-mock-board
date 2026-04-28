// lib/types/student/practice-exams/practice-exam.types.ts

import type { QuestionType, QuestionOption, SubmissionStatus } from '@/lib/types/database'

// ── Domain types ──────────────────────────────────────────────────────────────

export interface PracticeQuestion {
  id:             string
  question_text:  string
  scenario?:      string | null
  question_type:  QuestionType
  points:         number
  options:        QuestionOption[] | null
  correct_answer: string | null
  explanation:    string | null
  order_number:   number | null
}

export interface PracticeExamMeta {
  id:               string
  title:            string
  total_points:     number
  duration_minutes: number
}

export interface PracticeAttemptSummary {
  id:           string
  attempt_num:  number
  score:        number | null
  percentage:   number | null
  passed:       boolean | null
  started_at:   string
  submitted_at: string | null
  status:       SubmissionStatus
}

export interface FeedbackEntry {
  submitted:     boolean
  isCorrect:     boolean | null
  correctAnswer: string | null
  explanation:   string | null
}

export interface WeakTopic {
  category:  string
  correct:   number
  total:     number
  accuracy:  number
}

// Completion payload written to DB
export interface PracticeCompletionPayload {
  submissionId:  string
  score:         number
  percentage:    number
  passed:        boolean
  correctCount:  number
  totalItems:    number
  timeSeconds:   number
}

export type ExamMeta = {
  id: string;
  title: string;
  total_points: number;
  duration_minutes: number;
  exam_type: string;
  is_published: boolean;
};

export type Question = {
  id: string;
  question_text: string;
  scenario?: string | null;
  question_type: string;
  points: number;
  options: string;
  correct_answer: string;
  explanation: string;
  order_number: number;
};

export type Submission = {
  id: string;
  score: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  submitted_at: string;
  status: string;
};

export type Answer = {
  question_id: string;
  answer_text: string;
};
