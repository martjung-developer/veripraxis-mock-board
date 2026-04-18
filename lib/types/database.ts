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

// Matches the status column on submissions.
// ⚠️  FIX 1 — 'reviewed' and 'released' added.
//
// These two values are used extensively across the refactored codebase:
//   • adminDashboard.service.ts  → .in("status", ["submitted","graded","released"])
//   • adminDashboard.service.ts  → allSubs.filter(s => s.status === "released")
//   • results.service.ts         → .in('status', ['reviewed','released'])
//   • results.types.ts           → type ResultStatus = 'reviewed' | 'released'
//   • useExamResults.ts          → filters on r.status === 'reviewed' / 'released'
//   • ResultsTable.tsx           → r.status === 'released'
//
// Without 'reviewed' and 'released' in the union:
//   • Every .filter(s => s.status === 'released') raises:
//       TS2367: This condition will always be false because the types
//       'SubmissionStatus' and '"released"' have no overlap.
//   • Every .in('status', ['reviewed','released']) raises:
//       TS2345: Argument of type 'string[]' is not assignable to
//       parameter of type '("in_progress" | "submitted" | "graded")[]'
//
// Run a migration to add the CHECK constraint values if not already present:
//   ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
//   ALTER TABLE submissions ADD CONSTRAINT submissions_status_check
//     CHECK (status = ANY (ARRAY[
//       'in_progress','submitted','graded','reviewed','released'
//     ]));
export type SubmissionStatus =
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'reviewed'   // ← ADDED: graded and manually reviewed by faculty
  | 'released'   // ← ADDED: results made visible to the student

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
export const AUTO_GRADE_QUESTION_TYPES:   QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank']
export const MANUAL_GRADE_QUESTION_TYPES: QuestionType[] = ['short_answer', 'essay', 'matching']

export function isAutoGradedType(type: QuestionType):   boolean { return AUTO_GRADE_QUESTION_TYPES.includes(type) }
export function isManualGradedType(type: QuestionType): boolean { return MANUAL_GRADE_QUESTION_TYPES.includes(type) }

// Exam type
export type ExamType = 'mock' | 'practice'

export const EXAM_TYPE_META: Record<ExamType, { label: string; description: string }> = {
  mock:     { label: 'Mock Exam',     description: 'Timed, board-style exam that simulates the actual licensure exam.'   },
  practice: { label: 'Practice Exam', description: 'Self-paced reviewer set for studying individual topics or subjects.' },
}

// ── Convenience / App-Level Types ─────────────────────────────────────────────

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

// ── Material type ─────────────────────────────────────────────────────────────
// ⚠️  FIX 2 — Extracted as a named type so study_materials.Row, the
// published_study_materials view row, and the StudyMaterial domain type
// all reference the same literal union rather than repeating it inline.
// Without this, the fallback normaliser in studyMaterials.service.ts cannot
// safely cast `row.type` — it was previously written as `row.type as any`.
export type StudyMaterialType = 'document' | 'video' | 'notes'

export type LinkType = 'video' | 'meeting' | 'drive' | 'other'

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
          id?:              string
          title:            string
          description?:     string | null
          category_id?:     string | null
          program_id?:      string | null
          exam_type?:       ExamType
          duration_minutes: number
          passing_score:    number
          total_points:     number
          is_published?:    boolean
          created_by?:      string | null
          created_at?:      string
          updated_at?:      string
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
          // ⚠️  Uses the expanded SubmissionStatus union (includes 'reviewed' | 'released').
          // See the SubmissionStatus comment above for the migration SQL.
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
          // ⚠️  FIX 3 — type references the Enums block below.
          // Previously the Enums block did not contain notif_type, so
          // Database['public']['Enums']['notif_type'] resolved to `never`,
          // meaning every notification insert/update would fail to type-check.
          type:       Database['public']['Enums']['notif_type'] | null
          is_read:    boolean
          created_at: string
          // ⚠️  FIX 4 — link and cta_label added.
          // The notification rows in the app carry these optional fields for
          // rich action buttons (e.g. "View results" links in the notification
          // centre). Without them, reads of `row.link` produced:
          //   TS2339: Property 'link' does not exist on type '...'
          link:       string | null
          cta_label:  string | null
        }
        Insert: {
          id?:        string
          user_id?:   string | null
          title?:     string | null
          message?:   string | null
          type?:      Database['public']['Enums']['notif_type'] | null
          is_read?:   boolean
          created_at?: string
          link?:      string | null
          cta_label?: string | null
        }
        Update: {
          user_id?:   string | null
          title?:     string | null
          message?:   string | null
          type?:      Database['public']['Enums']['notif_type'] | null
          is_read?:   boolean
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
          external_url:  string | null
          meeting_url:   string | null
          link_type:     LinkType | null
        }
        Insert: {
          id?:            string
          title:          string
          type:           'document' | 'video' | 'notes'
          description?:   string | null
          file_url?:      string | null
          notes_content?: string | null
          program_id?:    string | null
          category?:      string | null
          is_published?:  boolean
          created_at?:    string
          updated_at?:    string
          created_by?:    string | null
          external_url?:  string | null
          meeting_url?:   string | null
          link_type?:     LinkType | null
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
          external_url?:  string | null
          meeting_url?:   string | null
          link_type?:     LinkType | null
        }
      }

      // ⚠️  FIX 6 — favorites table added.
      // The study materials feature spec adds a bookmark/favorites system
      // (toggleFavorite / isFavorited). Without this table in database.ts,
      // supabase.from('favorites') has no generic constraint, so every
      // query returns unknown and requires unsafe casts.
      // Migration:
      //   CREATE TABLE IF NOT EXISTS favorites (
      //     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      //     user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      //     material_id uuid NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
      //     created_at  timestamptz NOT NULL DEFAULT now(),
      //     UNIQUE (user_id, material_id)
      //   );
      //   ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
      //   CREATE POLICY "Users manage own favorites"
      //     ON favorites FOR ALL USING (auth.uid() = user_id);
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

    }

    Views: {
      // ⚠️  FIX 7 — published_study_materials view typed.
      // The study materials page primary query targets this view:
      //   supabase.from('published_study_materials').select('*')
      // With Views: {} the query returned type unknown, which the original
      // page worked around with `(data ?? []) as StudyMaterial[]` — an
      // unsafe cast that silently breaks if the view schema changes.
      //
      // Migration — create the view if it doesn't exist:
      //   CREATE OR REPLACE VIEW published_study_materials AS
      //   SELECT
      //     sm.id, sm.title, sm.description, sm.type,
      //     sm.file_url, sm.notes_content, sm.category,
      //     sm.created_at, sm.program_id, sm.meeting_url,
      //     p.code  AS program_code,
      //     p.name  AS program_name
      //   FROM study_materials sm
      //   LEFT JOIN programs p ON p.id = sm.program_id
      //   WHERE sm.is_published = true;
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
      // ⚠️  FIX 8 — notif_type added to Enums block.
      // notifications.Row references Database['public']['Enums']['notif_type'].
      // Without this entry that type resolved to `never`, meaning:
      //   • every notification.type field was typed as never
      //   • inserting any notification type string caused TS2322
      //   • the NotificationBell and any notification-aware component
      //     could never safely read notification.type
      notif_type: 'info' | 'warning' | 'success' | 'error'
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    CompositeTypes: {}
  }
}

// ── Table Helpers ──────────────────────────────────────────────────────────────

export type Tables = {
  [K in keyof Database['public']['Tables']]: Database['public']['Tables'][K]['Row']
}[keyof Database['public']['Tables']]

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ── View Helpers ───────────────────────────────────────────────────────────────
// Mirrors the Tables helper pattern for views so components can do:
//   type PublishedMaterialRow = ViewRow<'published_study_materials'>
export type ViewRow<V extends keyof Database['public']['Views']> =
  Database['public']['Views'][V]['Row']