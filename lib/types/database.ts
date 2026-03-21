// lib/types/database.ts
// Typed to match the actual VeriPraxis Supabase schema.
//
// Role clarification:
//   'student'  — regular reviewee taking mock exams
//   'reviewer' — acts like a student; takes exams and reviews content
//   'admin'    — manages the platform (users, schools, programs)
//   'faculty'  — NOT a DB role; faculty ARE stored as 'reviewer' in profiles
//                but have elevated permissions to manage the question bank
//
// Regenerate anytime:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID \
//     > src/lib/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ─────────────────────────────────────────────────────────────────────
// Matches: CHECK (role = ANY (ARRAY['student','admin','reviewer']))
export type UserRole         = 'student' | 'admin' | 'reviewer'
export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded'
export type StoragePurpose   = 'exam_questions' | 'reviewer' | 'profile_image' | 'other'
export type QuestionType     = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'

export interface Database {
  public: {
    Tables: {

      // ── profiles ─────────────────────────────────────────────────────────────
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
      // Both 'student' AND 'reviewer' roles get a row here —
      // reviewers act as students functionally.
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
      // Created by faculty (stored as 'reviewer' role in profiles)
      exams: {
        Row: {
          id:               string
          title:            string
          description:      string | null
          category_id:      string | null
          duration_minutes: number
          passing_score:    number
          total_points:     number
          is_published:     boolean
          created_by:       string | null  // FK → profiles.id (reviewer/admin)
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:               string
          title:             string
          description?:      string | null
          category_id?:      string | null
          duration_minutes:  number
          passing_score:     number
          total_points:      number
          is_published?:     boolean
          created_by?:       string | null
          created_at?:       string
          updated_at?:       string
        }
        Update: {
          title?:            string
          description?:      string | null
          category_id?:      string | null
          duration_minutes?: number
          passing_score?:    number
          total_points?:     number
          is_published?:     boolean
          updated_at?:       string
        }
      }

      // ── questions ─────────────────────────────────────────────────────────────
      // Managed by faculty (reviewer role)
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
          created_by:     string | null  // FK → profiles.id (reviewer/admin)
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
      submissions: {
        Row: {
          id:                 string
          exam_id:            string | null
          student_id:         string | null  // FK → students.id (student OR reviewer)
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

      // ── answers ───────────────────────────────────────────────────────────────
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

      // ── reviewers (study material) ────────────────────────────────────────────
      // Note: "reviewers" table = study material/content, not user reviewers
      reviewers: {
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

    }
    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role:         UserRole
      submission_status: SubmissionStatus
      storage_purpose:   StoragePurpose
    }
  }
}