// lib/types/database.ts
// Regenerate anytime:
//   pnpm dlx supabase@latest gen types typescript --project-id YOUR_PROJECT_ID \
//     > lib/types/database.ts

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

// Matches: CHECK (status = ANY (ARRAY['in_progress','submitted','graded']))
export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded'

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

export interface Database {
  public: {
    Tables: {

      // ── profiles ──────────────────────────────────────────────────────────────
      // One row per authenticated user regardless of role.
      // FK → auth.users(id)
      profiles: {
        Row: {
          id:         string          // uuid; mirrors auth.users.id
          email:      string
          full_name:  string | null
          role:       UserRole
          avatar_url: string | null
          created_at: string          // timestamptz
          updated_at: string          // timestamptz
        }
        Insert: {
          id:          string          // required: must match auth.users.id
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
      // Only users with role === 'student' get a row here.
      // FK → profiles(id), programs(id), schools(id)
      students: {
        Row: {
          id:          string          // uuid; mirrors profiles.id
          student_id:  string | null   // e.g. school-assigned ID number
          school:      string | null   // legacy text field (prefer school_id)
          year_level:  number | null
          target_exam: string | null   // e.g. "Nursing Board", "Bar Exam"
          program_id:  string | null   // FK → programs.id
          school_id:   string | null   // FK → schools.id
          created_at:  string
        }
        Insert: {
          id:           string          // required: must match profiles.id
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
          code:        string          // unique short code e.g. "UPD"
          name:        string          // abbreviated e.g. "UP Diliman"
          full_name:   string          // e.g. "University of the Philippines Diliman"
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
          school_id:   string | null   // FK → schools.id
          code:        string          // e.g. "BSPsych", "BEEd", "BSEd-MATH"
          name:        string          // short display name e.g. "Psychology"
          full_name:   string          // e.g. "Bachelor of Science in Psychology"
          degree_type: string          // e.g. "Bachelor", "Master", "Doctorate"
          major:       string | null   // e.g. "Mathematics" for BSEd-MATH; null for non-major programs
          years:       number | null   // default 4
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
          name:        string          // unique
          description: string | null
          icon:        string | null   // icon name/slug or URL
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
      exams: {
        Row: {
          id:               string
          title:            string
          description:      string | null
          category_id:      string | null   // FK → exam_categories.id
          program_id:       string | null   // FK → programs.id; null = not program-specific
          exam_type:        ExamType        // 'mock' | 'practice'
          duration_minutes: number
          passing_score:    number          // percentage threshold e.g. 75
          total_points:     number
          is_published:     boolean         // default false
          created_by:       string | null   // FK → profiles.id (faculty/admin)
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
          updated_at?:       string
        }
      }

      // ── questions ─────────────────────────────────────────────────────────────
      // Managed by faculty or admin.
      // FK → exams(id), profiles(id)
      //
      // options shape for multiple_choice: QuestionOption[]
      //
      // correct_answer usage:
      //   multiple_choice → option label ("A", "B", etc.)
      //   true_false      → "true" | "false"
      //   fill_blank      → exact text answer
      //   matching        → JSON string of pairs (app-defined format)
      //   essay           → NULL (manual grading only)
      //   short_answer    → NULL (manual review required)
      //
      // explanation:
      //   Shown to student after submission. Optionally prefix with
      //   [EASY], [MEDIUM], or [HARD] to encode difficulty level.
      questions: {
        Row: {
          id:             string
          exam_id:        string | null   // FK → exams.id
          question_text:  string
          question_type:  QuestionType
          points:         number          // default 1
          options:        Json | null     // QuestionOption[] for MC; null for essay/tf/etc.
          correct_answer: string | null   // null for essay and short_answer
          explanation:    string | null
          order_number:   number | null
          created_by:     string | null   // FK → profiles.id (faculty/admin)
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
      // One row per exam attempt by a student.
      // FK → exams(id), students(id)
      //
      // status flow: in_progress → submitted → graded
      // score/percentage/passed are null until graded
      submissions: {
        Row: {
          id:                 string
          exam_id:            string | null   // FK → exams.id
          student_id:         string | null   // FK → students.id (= profiles.id for students)
          started_at:         string          // default now()
          submitted_at:       string | null   // null while in_progress
          time_spent_seconds: number | null
          status:             SubmissionStatus
          score:              number | null   // raw points earned; null until graded
          percentage:         number | null   // 0–100; null until graded
          passed:             boolean | null  // null until graded
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
      // One row per question per submission.
      // FK → submissions(id), questions(id), profiles(id)
      //
      // Grading logic:
      //   AUTO: is_correct is set immediately on submission for MCQ, T/F, fill_blank
      //   MANUAL: is_correct remains null until a faculty member grades it
      //           graded_by is set to the faculty member's profiles.id
      //
      // FUTURE: For essay/short_answer, a Python AI service will eventually
      //         provide a preliminary score before manual review.
      //         Placeholder in grading code:
      //           if (question.type === 'essay') {
      //             status = 'needs_review'
      //             // FUTURE: sendToPythonService(answer_text)
      //           }
      answers: {
        Row: {
          id:            string
          submission_id: string | null   // FK → submissions.id
          question_id:   string | null   // FK → questions.id
          answer_text:   string | null   // student's raw answer
          is_correct:    boolean | null  // null until graded (essays, short_answer)
          points_earned: number | null   // null until graded
          graded_by:     string | null   // FK → profiles.id; null if auto-graded
          feedback:      string | null   // per-answer faculty feedback
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
      // Aggregated performance stats per student × exam (or category/program).
      // Updated after every graded submission.
      // FK → students(id), exams(id), exam_categories(id), programs(id)
      //
      // Exam-level aggregate row: student_id IS NULL, exam_id IS NOT NULL
      // Student-level row:        student_id IS NOT NULL, exam_id IS NOT NULL
      analytics: {
        Row: {
          id:                       string
          student_id:               string | null   // FK → students.id; null = exam-level rollup
          exam_id:                  string | null   // FK → exams.id
          category_id:              string | null   // FK → exam_categories.id
          program_id:               string | null   // FK → programs.id
          total_attempts:           number          // default 0
          average_score:            number | null
          highest_score:            number | null
          lowest_score:             number | null
          total_time_spent_minutes: number          // default 0
          last_attempt_at:          string | null   // timestamptz
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
          user_id?:  string | null
          title?:    string | null
          message?:  string | null
          type?:     string | null
          is_read?:  boolean
        }
      }

    }

    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role:         UserRole
      submission_status: SubmissionStatus
      storage_purpose:   StoragePurpose
      question_type:     QuestionType
    }
  }
}