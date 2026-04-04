// lib/types/database.ts
// Typed to match the VeriPraxis Supabase schema.
//
// Role clarification:
//   'student' — reviewee taking mock exams; always has a row in `students`
//   'faculty' — creates/manages exams, questions, and study materials; no `students` row
//   'admin'   — full platform access; no `students` row
//
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

// Matches: CHECK (purpose = ANY (ARRAY['exam_questions','reviewer','profile_image','other']))
export type StoragePurpose = 'exam_questions' | 'reviewer' | 'profile_image' | 'other'

// Matches the USER-DEFINED question_type enum in `questions`
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching' | 'fill_blank'

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
export interface QuestionOption {
  label: string   // e.g. "A", "B", "C", "D"
  text:  string   
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
      // FK → schools(id)
      programs: {
        Row: {
          id:          string
          school_id:   string | null   // FK → schools.id
          code:        string          // unique e.g. "BSN"
          name:        string          // e.g. "Nursing"
          full_name:   string          // e.g. "Bachelor of Science in Nursing"
          degree_type: string          // e.g. "Bachelor", "Master", "Doctorate"
          major:       string | null
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
      // Created by faculty or admin.
      // FK → exam_categories(id), profiles(id)
      exams: {
        Row: {
          id:               string
          title:            string
          description:      string | null
          category_id:      string | null   // FK → exam_categories.id
          duration_minutes: number
          passing_score:    number          // percentage or raw score threshold
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
      // Managed by faculty or admin.
      // FK → exams(id), profiles(id)
      // options shape for multiple_choice: QuestionOption[]
      // correct_answer usage:
      // - multiple_choice → option label ("A", "B", etc.)
      // - true_false      → "true" | "false"
      // - matching        → JSON string or custom format (define in app)
      // - fill_blank      → exact text answer
      // - essay           → null (manual grading)
      questions: {
        Row: {
          id:             string
          exam_id:        string | null   // FK → exams.id
          question_text:  string
          question_type:  QuestionType
          points:         number          // default 1
          options:        Json | null     // QuestionOption[] for MC/TF; null for essay
          correct_answer: string | null   // null for essay (manually graded)
          explanation:    string | null   // shown after submission
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
      submissions: {
        Row: {
          id:                 string
          exam_id:            string | null   // FK → exams.id
          student_id:         string | null   // FK → students.id
          started_at:         string          // default now()
          submitted_at:       string | null   // null while in_progress
          time_spent_seconds: number | null
          status:             SubmissionStatus // default 'in_progress'
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
      answers: {
        Row: {
          id:            string
          submission_id: string | null   // FK → submissions.id
          question_id:   string | null   // FK → questions.id
          answer_text:   string | null   // student's raw answer
          is_correct:    boolean | null  // null until graded (essays)
          points_earned: number | null   // null until graded
          graded_by:     string | null   // FK → profiles.id (faculty/admin); null if auto-graded
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
      analytics: {
        Row: {
          id:                       string
          student_id:               string | null   // FK → students.id
          exam_id:                  string | null   // FK → exams.id; null = category-level rollup
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
      // Study material / reviewer content uploaded by faculty or admin.
      // Note: the SQL table is `practice_exams` (not `reviewers`).
      // FK → exam_categories(id), profiles(id)
      practice_exams: {
        Row: {
          id:           string
          title:        string
          description:  string | null
          category_id:  string | null   // FK → exam_categories.id
          content:      string | null   // rich text / markdown body
          file_url:     string | null   // link to uploaded PDF/doc
          created_by:   string | null   // FK → profiles.id (faculty/admin)
          is_published: boolean         // default false
          view_count:   number          // default 0
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
      // Metadata for files stored in Supabase Storage.
      // FK → profiles(id)
      storage_files: {
        Row: {
          id:          string
          file_name:   string
          file_path:   string          // storage bucket path
          file_type:   string          // MIME type e.g. "application/pdf"
          file_size:   number | null   // bytes
          uploaded_by: string | null   // FK → profiles.id
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
    id: string
    exam_id: string | null
    student_id: string | null
    program_id: string | null
    assigned_by: string | null
    assigned_at: string
    deadline: string | null
    is_active: boolean
  }
  Insert: {
    id?: string
    exam_id?: string | null
    student_id?: string | null
    program_id?: string | null
    assigned_by?: string | null
    assigned_at?: string
    deadline?: string | null
    is_active?: boolean
  }
  Update: {
    exam_id?: string | null
    student_id?: string | null
    program_id?: string | null
    assigned_by?: string | null
    assigned_at?: string
    deadline?: string | null
    is_active?: boolean
  }
}

notifications: {
  Row: {
    id: string
    user_id: string | null
    title: string | null
    message: string | null
    type: string | null
    is_read: boolean
    created_at: string
  }
  Insert: {
    id?: string
    user_id?: string | null
    title?: string | null
    message?: string | null
    type?: string | null
    is_read?: boolean
    created_at?: string
  }
  Update: {
    user_id?: string | null
    title?: string | null
    message?: string | null
    type?: string | null
    is_read?: boolean
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