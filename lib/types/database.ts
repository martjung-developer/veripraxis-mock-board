// lib/types/database.ts
// Merged from two sources:
//   (A) hand-maintained file with exam-system fixes (grading_mode, released_at, feedback, etc.)
//   (B) generated file with additional tables/views (study_materials, favorites, users, etc.)
// All fixes from (A) are preserved. All additions from (B) are merged in.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ──────────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'admin' | 'faculty'

// FIX (A): Added 'reviewed' and 'released' — used throughout submissions/page.tsx.
export type SubmissionStatus =
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'reviewed'   // graded + faculty-reviewed
  | 'released'   // score visible to student

// Derived at the application level (not a DB column).
export type GradingStatus = 'complete' | 'needs_review' | 'ungraded'

export type StoragePurpose = 'exam_questions' | 'reviewer' | 'profile_image' | 'other'

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'matching'
  | 'fill_blank'

export type ExamType = 'mock' | 'practice'

// FIX (A): GradingMode was used in exams but missing from database.ts entirely.
export type GradingMode = 'auto' | 'manual'

// NEW (B): Link and study-material types used in study_materials table.
export type LinkType          = 'video' | 'meeting' | 'drive' | 'other'
export type StudyMaterialType = 'document' | 'video' | 'notes'

// ── Question type helpers ─────────────────────────────────────────────────────

export const AUTO_GRADE_QUESTION_TYPES:   QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']
export const MANUAL_GRADE_QUESTION_TYPES: QuestionType[] = ['short_answer', 'essay', 'matching']

export function isAutoGradedType(type: QuestionType):   boolean { return AUTO_GRADE_QUESTION_TYPES.includes(type) }
export function isManualGradedType(type: QuestionType): boolean { return MANUAL_GRADE_QUESTION_TYPES.includes(type) }

export const EXAM_TYPE_META: Record<ExamType, { label: string; description: string }> = {
  mock:     { label: 'Mock Exam',     description: 'Timed, board-style exam that simulates the actual licensure exam.'   },
  practice: { label: 'Practice Exam', description: 'Self-paced reviewer set for studying individual topics or subjects.' },
}

// ── App-level convenience types ───────────────────────────────────────────────

export type StudentProfile = Database['public']['Tables']['profiles']['Row'] & {
  student: Database['public']['Tables']['students']['Row'] | null
}
export type StaffProfile = Database['public']['Tables']['profiles']['Row'] & {
  role: 'faculty' | 'admin'
}
export type AppUser = StudentProfile | StaffProfile

export interface QuestionOption {
  label: string
  text:  string
}

export interface GradingResult {
  answer_id:     string
  question_id:   string
  question_type: QuestionType
  is_correct:    boolean | null
  points_earned: number
}

// ── Database ──────────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {

      // ── profiles ──────────────────────────────────────────────────────────────
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

      // ── students ──────────────────────────────────────────────────────────────
      // NOTE (B): generated file added user_id here — kept for compatibility.
      students: {
        Row: {
          id:          string
          user_id:     string | null
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
          user_id?:     string | null
          student_id?:  string | null
          school?:      string | null
          year_level?:  number | null
          target_exam?: string | null
          program_id?:  string | null
          school_id?:   string | null
          created_at?:  string
        }
        Update: {
          user_id?:     string | null
          student_id?:  string | null
          school?:      string | null
          year_level?:  number | null
          target_exam?: string | null
          program_id?:  string | null
          school_id?:   string | null
        }
      }

      // ── schools ───────────────────────────────────────────────────────────────
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

      // ── programs ──────────────────────────────────────────────────────────────
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

      // ── exam_categories ───────────────────────────────────────────────────────
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

      // ── exams ─────────────────────────────────────────────────────────────────
      // FIX (A): grading_mode typed as GradingMode (not string | null) so
      // `.update({ grading_mode })` works without `as Record<string, unknown>`.
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
          grading_mode:     GradingMode
          created_by:       string | null
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:               string
          title:             string
          description?:      string | null
          category_id?:      string | null
          program_id?:       string | null
          exam_type?:        ExamType
          duration_minutes:  number
          passing_score:     number
          total_points:      number
          is_published?:     boolean
          grading_mode?:     GradingMode
          created_by?:       string | null
          created_at?:       string
          updated_at?:       string
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
          grading_mode?:     GradingMode
          updated_at?:       string
        }
      }

      // ── questions ─────────────────────────────────────────────────────────────
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
          explanation?:    string | null
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
        }
      }

      // ── submissions ───────────────────────────────────────────────────────────
      // FIX (A): released_at added — .update({ released_at }) no longer collapses to never.
      // FIX (A): SubmissionStatus includes 'reviewed' | 'released'.
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
          released_at:        string | null
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
          released_at?:        string | null
          created_at?:         string
        }
        Update: {
          submitted_at?:       string | null
          time_spent_seconds?: number | null
          status?:             SubmissionStatus
          score?:              number | null
          percentage?:         number | null
          passed?:             boolean | null
          released_at?:        string | null
        }
      }

      // ── answers ───────────────────────────────────────────────────────────────
      // FIX (A): feedback added to Update — .update({ feedback }) no longer errors.
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

      // ── analytics ─────────────────────────────────────────────────────────────
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

      // ── practice_exams ────────────────────────────────────────────────────────
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

      // ── practice_completions (NEW from B) ─────────────────────────────────────
      // Tracks which students have completed a practice exam.
      practice_completions: {
        Row: {
          student_id:   string
          exam_id:      string
          completed_at: string
        }
        Insert: {
          student_id:    string
          exam_id:       string
          completed_at?: string
        }
        Update: {
          completed_at?: string
        }
      }

      // ── storage_files ─────────────────────────────────────────────────────────
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

      // ── exam_assignments ──────────────────────────────────────────────────────
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

      // ── notifications ─────────────────────────────────────────────────────────
      // NOTE: type is `string | null` (not the notif_type enum) so that the
      // existing notification pages don't need casting. The DB enum values
      // 'exam' | 'result' | 'general' | 'progress' are a superset of notif_type.
      notifications: {
        Row: {
          id:         string
          user_id:    string | null
          title:      string | null
          message:    string | null
          type:       string | null
          is_read:    boolean
          created_at: string
        }
        Insert: {
          id?:         string
          user_id?:    string | null
          title?:      string | null
          message?:    string | null
          type?:       string | null
          is_read?:    boolean
          created_at?: string
        }
        Update: {
          user_id?:    string | null
          title?:      string | null
          message?:    string | null
          type?:       string | null
          is_read?:    boolean
        }
      }

      // ── study_materials (NEW from B — full shape) ─────────────────────────────
      study_materials: {
        Row: {
          id:            string
          title:         string
          description:   string | null
          type:          StudyMaterialType
          file_url:      string | null
          file_size:     number | null
          content:       string | null
          notes_content: string | null
          program_id:    string | null
          category:      string | null
          category_id:   string | null
          is_published:  boolean
          created_at:    string
          updated_at:    string
          view_count:    number
          created_by:    string | null
          external_url:  string | null
          meeting_url:   string | null
          link_type:     LinkType | null
        }
        Insert: {
          id?:            string
          title:          string
          type:           StudyMaterialType
          description?:   string | null
          file_url?:      string | null
          file_size?:     number | null
          content?:       string | null
          notes_content?: string | null
          program_id?:    string | null
          category?:      string | null
          category_id?:   string | null
          is_published?:  boolean
          created_at?:    string
          updated_at?:    string
          view_count?:    number
          created_by?:    string | null
          external_url?:  string | null
          meeting_url?:   string | null
          link_type?:     LinkType | null
        }
        Update: {
          title?:         string
          type?:          StudyMaterialType
          description?:   string | null
          file_url?:      string | null
          file_size?:     number | null
          content?:       string | null
          notes_content?: string | null
          program_id?:    string | null
          category?:      string | null
          category_id?:   string | null
          is_published?:  boolean
          updated_at?:    string
          view_count?:    number
          created_by?:    string | null
          external_url?:  string | null
          meeting_url?:   string | null
          link_type?:     LinkType | null
        }
      }

      // ── favorites (NEW from B) ────────────────────────────────────────────────
      favorites: {
        Row: {
          id:          string
          user_id:     string
          material_id: string
          created_at:  string
        }
        Insert: {
          id?:         string
          user_id:     string
          material_id: string
          created_at?: string
        }
        Update: {
          user_id?:     string
          material_id?: string
        }
      }

      // ── users (NEW from B) ────────────────────────────────────────────────────
      users: {
        Row: {
          id:         string
          role:       UserRole
          created_at: string
        }
        Insert: {
          id:          string
          role:        UserRole
          created_at?: string
        }
        Update: {
          role?: UserRole
        }
      }

      // ── exam_review_completions ───────────────────────────────────────────────
      exam_review_completions: {
        Row: {
          id:            string
          student_id:    string
          exam_id:       string
          submission_id: string | null
          completed_at:  string
          created_at:    string
        }
        Insert: {
          id?:            string
          student_id:     string
          exam_id:        string
          submission_id?: string | null
          completed_at?:  string
          created_at?:    string
        }
        Update: {
          completed_at?: string
        }
      }

      // ── questionnaires ────────────────────────────────────────────────────────
      questionnaires: {
        Row: {
          id:           string
          title:        string
          description:  string | null
          category_id:  string | null
          created_by:   string | null
          is_published: boolean
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:           string
          title:         string
          description?:  string | null
          category_id?:  string | null
          created_by?:   string | null
          is_published?: boolean
          created_at?:   string
          updated_at?:   string
        }
        Update: {
          title?:        string
          description?:  string | null
          category_id?:  string | null
          is_published?: boolean
          updated_at?:   string
        }
      }

      // ── faculty ───────────────────────────────────────────────────────────────
      faculty: {
        Row: {
          id:         string
          user_id:    string | null
          faculty_id: string
          full_name:  string
          email:      string
          is_active:  boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:         string
          user_id?:    string | null
          faculty_id:  string
          full_name:   string
          email:       string
          is_active?:  boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?:    string | null
          faculty_id?: string
          full_name?:  string
          email?:      string
          is_active?:  boolean
          updated_at?: string
        }
      }

      // ── admins ────────────────────────────────────────────────────────────────
      admins: {
        Row: {
          id:         string
          user_id:    string | null
          admin_id:   string
          full_name:  string
          email:      string
          created_at: string
        }
        Insert: {
          id?:         string
          user_id?:    string | null
          admin_id:    string
          full_name:   string
          email:       string
          created_at?: string
        }
        Update: {
          user_id?:   string | null
          admin_id?:  string
          full_name?: string
          email?:     string
        }
      }

    }

    // ── Views (NEW from B) ────────────────────────────────────────────────────
    Views: {
      published_study_materials: {
        Row: {
          id:            string
          title:         string
          description:   string | null
          type:          StudyMaterialType
          file_url:      string | null
          notes_content: string | null
          category:      string | null
          created_at:    string
          program_id:    string | null
          meeting_url:   string | null
          program_code:  string | null
          program_name:  string | null
        }
      }
    }

    Functions: Record<string, never>

    Enums: {
      user_role:         UserRole
      submission_status: SubmissionStatus
      storage_purpose:   StoragePurpose
      question_type:     QuestionType
      exam_type:         ExamType
      // NEW (B): notif_type DB enum — separate from the app-level NotifType
      // which uses 'exam' | 'result' | 'general' | 'progress'.
      notif_type:        'info' | 'warning' | 'success' | 'error'
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    CompositeTypes: {}
  }
}

// ── Table / View Helpers (NEW from B) ─────────────────────────────────────────

export type Tables = {
  [K in keyof Database['public']['Tables']]: Database['public']['Tables'][K]['Row']
}[keyof Database['public']['Tables']]

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type ViewRow<V extends keyof Database['public']['Views']> =
  Database['public']['Views'][V]['Row']