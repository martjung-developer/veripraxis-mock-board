// lib/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ──────────────────────────────────────────────────────────────────────
// Matches: CHECK (role = ANY (ARRAY['student','admin','faculty']))
export type UserRole = 'student' | 'admin' | 'faculty'

// Matches: CHECK (status = ANY (ARRAY['in_progress','submitted','graded','released']))
export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded' | 'released'

// ── ADDED: grading_status ─────────────────────────────────────────────────────
// Derived at the application level (not a DB column).
// 'complete'     — all answers have been graded (auto or manual)
// 'needs_review' — one or more manual-type answers are still pending
// 'ungraded'     — no answers recorded yet
export type GradingStatus = 'complete' | 'needs_review' | 'ungraded'

// Matches: CHECK (purpose = ANY (ARRAY['exam_questions','reviewer','profile_image','other']))
export type StoragePurpose = 'exam_questions' | 'reviewer' | 'profile_image' | 'other'

// Matches the USER-DEFINED question_type enum in `questions`
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching' | 'fill_blank'

// ── AUTO-GRADED vs MANUAL question types ─────────────────────────────────────
// Use these constants throughout the app instead of hard-coding strings.
export const AUTO_GRADE_QUESTION_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']
export const MANUAL_GRADE_QUESTION_TYPES: QuestionType[] = ['short_answer', 'essay', 'matching']

export function isAutoGradedType(type: QuestionType): boolean {
  return AUTO_GRADE_QUESTION_TYPES.includes(type)
}

export function isManualGradedType(type: QuestionType): boolean {
  return MANUAL_GRADE_QUESTION_TYPES.includes(type)
}

// Exam type — distinguishes timed board-style exams from self-paced reviewer sets.
// Stored in exams.exam_type. Run the migration SQL to add this column if missing.
export type ExamType = 'mock' | 'practice'

// UI display metadata for ExamType — used in badges, filter selects, and form labels.
// Import this in page/component files instead of inlining the strings.
export const EXAM_TYPE_META: Record<ExamType, { label: string; description: string }> = {
  mock:     { label: 'Mock Exam',     description: 'Timed, board-style exam that simulates the actual licensure exam.'   },
  practice: { label: 'Practice Exam', description: 'Self-paced reviewer set for studying individual topics or subjects.' },
}

// ── Convenience / App-Level Types ─────────────────────────────────────────────

/** Full profile row joined with student details (only valid when role === 'student') */
export type StudentProfile = Database['public']['Tables']['profiles']['Row'] & {
  student: Database['public']['Tables']['students']['Row'] | null
}

/** Profile row for faculty or admin (no student record) */
export type StaffProfile = Database['public']['Tables']['profiles']['Row'] & {
  role: 'faculty' | 'admin'
}

/** Union of all authenticated user shapes */
export type AppUser = StudentProfile | StaffProfile

// ── MCQ option shape stored in questions.options (jsonb) ──────────────────────
// Each option has a label (A, B, C, D...) and the display text.
export interface QuestionOption {
  label: string   // e.g. "A", "B", "C", "D"
  text:  string
}

// ── Answer shape stored in answers.answer_text ────────────────────────────────
// For MCQ: answer_text = option label ("A", "B", etc.)
// For T/F: answer_text = "true" | "false"
// For fill_blank, short_answer, essay: answer_text = raw student text
// For matching: answer_text = JSON string of pairs

// ── Grading result shape (app-level, not in DB) ───────────────────────────────
export interface GradingResult {
  answer_id:     string
  question_id:   string
  question_type: QuestionType
  is_correct:    boolean | null  // null for manual-grade types not yet reviewed
  points_earned: number
  // FUTURE: Python AI service result for essay/short_answer
  // ai_grade?: { score: number; feedback: string; confidence: number }
}

export type Database = {
  public: {
    Tables: {

      profiles: {
        Row: {
          id:         string
          email:      string
          full_name:  string | null
          role:       UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id:          string
          email:       string
          full_name?:  string | null
          role:        UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?:      string
          full_name?:  string | null
          role?:       UserRole
          avatar_url?: string | null
          updated_at?: string
        }
      }

      students: {
        Row: {
          id:          string
          student_id:  string | null
          school:      string | null
          year_level:  number | null
          target_exam: string | null
          program_id:  string | null
          school_id:   string | null
          created_at:  string
        }
        Insert: {
          id:           string
          student_id?:  string | null
          school?:      string | null
          year_level?:  number | null
          target_exam?: string | null
          program_id?:  string | null
          school_id?:   string | null
          created_at?:  string
        }
        Update: {
          student_id?:  string | null
          school?:      string | null
          year_level?:  number | null
          target_exam?: string | null
          program_id?:  string | null
          school_id?:   string | null
        }
      }

      schools: {
        Row: {
          id:          string
          code:        string
          name:        string
          full_name:   string
          description: string | null
          created_at:  string
        }
        Insert: {
          id?:          string
          code:         string
          name:         string
          full_name:    string
          description?: string | null
          created_at?:  string
        }
        Update: {
          code?:        string
          name?:        string
          full_name?:   string
          description?: string | null
        }
      }

      programs: {
        Row: {
          id:          string
          school_id:   string | null
          code:        string
          name:        string
          full_name:   string
          degree_type: string
          major:       string | null
          years:       number | null
          description: string | null
          created_at:  string
        }
        Insert: {
          id?:          string
          school_id?:   string | null
          code:         string
          name:         string
          full_name:    string
          degree_type:  string
          major?:       string | null
          years?:       number | null
          description?: string | null
          created_at?:  string
        }
        Update: {
          school_id?:   string | null
          code?:        string
          name?:        string
          full_name?:   string
          degree_type?: string
          major?:       string | null
          years?:       number | null
          description?: string | null
        }
      }

      exam_categories: {
        Row: {
          id:          string
          name:        string
          description: string | null
          icon:        string | null
          created_at:  string
        }
        Insert: {
          id?:          string
          name:         string
          description?: string | null
          icon?:        string | null
          created_at?:  string
        }
        Update: {
          name?:        string
          description?: string | null
          icon?:        string | null
        }
      }

      exams: {
        Row: {
          id:               string
          title:            string
          description:      string | null
          category_id:      string | null
          program_id:       string | null
          exam_type:        ExamType
          duration_minutes: number
          passing_score:    number
          total_points:     number
          is_published:     boolean
          created_by:       string | null
          created_at:       string
          updated_at:       string
        }
        Insert: {
  id?: string
  title: string
  description?: string | null
  category_id?: string | null
  program_id?: string | null
  exam_type?: ExamType
  duration_minutes: number
  passing_score: number
  total_points: number
  is_published?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}
        Update: {
          title?:            string
          description?:      string | null
          category_id?:      string | null
          program_id?:       string | null
          exam_type?:        ExamType
          duration_minutes?: number
          passing_score?:    number
          total_points?:     number
          is_published?:     boolean
          updated_at?:       string
        }
      }

      questions: {
        Row: {
          id:             string
          exam_id:        string | null
          question_text:  string
          question_type:  QuestionType
          points:         number
          options:        Json | null
          correct_answer: string | null
          explanation:    string | null
          order_number:   number | null
          created_by:     string | null
          created_at:     string
        }
        Insert: {
          id?:             string
          exam_id?:        string | null
          question_text:   string
          question_type:   QuestionType
          points?:         number
          options?:        Json | null
          correct_answer?: string | null
          explanation?:   string | null
          order_number?:   number | null
          created_by?:     string | null
          created_at?:     string
        }
        Update: {
          exam_id?:        string | null
          question_text?:  string
          question_type?:  QuestionType
          points?:         number
          options?:        Json | null
          correct_answer?: string | null
          explanation?:    string | null
          order_number?:   number | null
          created_by?:     string | null
          created_at?:     string
        }
      }

      submissions: {
        Row: {
          id:                 string
          exam_id:            string | null
          student_id:         string | null
          started_at:         string
          submitted_at:       string | null
          time_spent_seconds: number | null
          status:             SubmissionStatus
          score:              number | null
          percentage:         number | null
          passed:             boolean | null
          created_at:         string
        }
        Insert: {
          id?:                 string
          exam_id?:            string | null
          student_id?:         string | null
          started_at?:         string
          submitted_at?:       string | null
          time_spent_seconds?: number | null
          status?:             SubmissionStatus
          score?:              number | null
          percentage?:         number | null
          passed?:             boolean | null
          created_at?:         string
        }
        Update: {
          submitted_at?:       string | null
          time_spent_seconds?: number | null
          status?:             SubmissionStatus
          score?:              number | null
          percentage?:         number | null
          passed?:             boolean | null
        }
      }

      answers: {
        Row: {
          id:            string
          submission_id: string | null
          question_id:   string | null
          answer_text:   string | null
          is_correct:    boolean | null
          points_earned: number | null
          graded_by:     string | null
          feedback:      string | null
          created_at:    string
        }
        Insert: {
          id?:             string
          submission_id?:  string | null
          question_id?:    string | null
          answer_text?:    string | null
          is_correct?:     boolean | null
          points_earned?:  number | null
          graded_by?:      string | null
          feedback?:       string | null
          created_at?:     string
        }
        Update: {
          answer_text?:    string | null
          is_correct?:     boolean | null
          points_earned?:  number | null
          graded_by?:      string | null
          feedback?:       string | null
        }
      }

      analytics: {
        Row: {
          id:                       string
          student_id:               string | null
          exam_id:                  string | null
          category_id:              string | null
          program_id:               string | null
          total_attempts:           number
          average_score:            number | null
          highest_score:            number | null
          lowest_score:             number | null
          total_time_spent_minutes: number
          last_attempt_at:          string | null
          created_at:               string
          updated_at:               string
        }
        Insert: {
          id?:                       string
          student_id?:               string | null
          exam_id?:                  string | null
          category_id?:              string | null
          program_id?:               string | null
          total_attempts?:           number
          average_score?:            number | null
          highest_score?:            number | null
          lowest_score?:             number | null
          total_time_spent_minutes?: number
          last_attempt_at?:          string | null
          created_at?:               string
          updated_at?:               string
        }
        Update: {
          total_attempts?:           number
          average_score?:            number | null
          highest_score?:            number | null
          lowest_score?:             number | null
          total_time_spent_minutes?: number
          last_attempt_at?:          string | null
          updated_at?:               string
        }
      }

      practice_exams: {
        Row: {
          id:           string
          title:        string
          description:  string | null
          category_id:  string | null
          content:      string | null
          file_url:     string | null
          created_by:   string | null
          is_published: boolean
          view_count:   number
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:           string
          title:         string
          description?:  string | null
          category_id?:  string | null
          content?:      string | null
          file_url?:     string | null
          created_by?:   string | null
          is_published?: boolean
          view_count?:   number
          created_at?:   string
          updated_at?:   string
        }
        Update: {
          title?:        string
          description?:  string | null
          category_id?:  string | null
          content?:      string | null
          file_url?:     string | null
          is_published?: boolean
          view_count?:   number
          updated_at?:   string
        }
      }

      storage_files: {
        Row: {
          id:          string
          file_name:   string
          file_path:   string
          file_type:   string
          file_size:   number | null
          uploaded_by: string | null
          purpose:     StoragePurpose | null
          created_at:  string
        }
        Insert: {
          id?:           string
          file_name:     string
          file_path:     string
          file_type:     string
          file_size?:    number | null
          uploaded_by?:  string | null
          purpose?:      StoragePurpose | null
          created_at?:   string
        }
        Update: {
          file_name?:  string
          file_path?:  string
          file_type?:  string
          file_size?:  number | null
          purpose?:    StoragePurpose | null
        }
      }

      exam_assignments: {
        Row: {
          id:          string
          exam_id:     string | null
          student_id:  string | null
          program_id:  string | null
          assigned_by: string | null
          assigned_at: string
          deadline:    string | null
          is_active:   boolean
        }
        Insert: {
          id?:          string
          exam_id?:     string | null
          student_id?:  string | null
          program_id?:  string | null
          assigned_by?: string | null
          assigned_at?: string
          deadline?:    string | null
          is_active?:   boolean
        }
        Update: {
          exam_id?:     string | null
          student_id?:  string | null
          program_id?:  string | null
          assigned_by?: string | null
          assigned_at?: string
          deadline?:    string | null
          is_active?:   boolean
        }
      }

      notifications: {
        Row: {
          id:         string
          user_id:    string | null
          title:      string | null
          message:    string | null
          type:       Database['public']['Enums']['notif_type'] | null
          is_read:    boolean
          created_at: string
          link?:      string | null
          cta_label?: string | null
        }
        Insert: {
          id?:         string
          user_id?:    string | null
          title?:      string | null
          message?:    string | null
          type?:       Database['public']['Enums']['notif_type'] | null
          is_read?:    boolean
          created_at?: string
          link?:      string | null
          cta_label?: string | null
        }
        Update: {
          user_id?:  string | null
          title?:    string | null
          message?:  string | null
          type?:       Database['public']['Enums']['notif_type'] | null
          is_read?:  boolean
          link?:      string | null
          cta_label?: string | null
        }
      }
      study_materials: {
        Row: {
          id:            string
          title:         string
          description:   string | null
          type:          'document' | 'video' | 'notes'
          file_url:      string | null
          notes_content: string | null
          program_id:    string | null
          category:      string | null
          is_published:  boolean
          created_at:    string
          updated_at:    string
          created_by:    string | null
        }
        Insert: { 
          id?:           string
          title:         string
          type:          'document' | 'video' | 'notes'
          description?:   string | null
          file_url?:      string | null
          notes_content?: string | null
          program_id?:    string | null
          category?:      string | null
          is_published?:  boolean
          created_at?:    string
          updated_at?:    string
          created_by?:    string | null
        }  
        Update: { 
          id?:            string
          title?:         string
          type?:          'document' | 'video' | 'notes'
          description?:   string | null
          file_url?:      string | null
          notes_content?: string | null
          program_id?:    string | null
          category?:      string | null
          is_published?:  boolean
          created_at?:    string
          updated_at?:    string
          created_by?:    string | null
        }
}

    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Views:          {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Functions:      {}
    Enums: {
      user_role:         UserRole
      submission_status: SubmissionStatus
      storage_purpose:   StoragePurpose
      question_type:     QuestionType
      exam_type:         ExamType
      notif_type:        'info' | 'warning' | 'success' | 'error'
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    CompositeTypes: {}
  }
}

// -- Table Helpers ──────────────────────────────────────────────────────────────────────────── //

export type Tables = {
  [K in keyof Database['public']['Tables']]: Database['public']['Tables'][K]['Row']
}[keyof Database['public']['Tables']]

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']