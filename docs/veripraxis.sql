-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid,
  exam_id uuid,
  category_id uuid,
  total_attempts integer DEFAULT 0,
  average_score numeric,
  highest_score numeric,
  lowest_score numeric,
  total_time_spent_minutes integer DEFAULT 0,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  program_id uuid,
  CONSTRAINT analytics_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT analytics_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT analytics_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.exam_categories(id),
  CONSTRAINT analytics_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id)
);
CREATE TABLE public.answers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  question_id uuid,
  answer_text text,
  is_correct boolean,
  points_earned numeric,
  graded_by uuid,
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT answers_pkey PRIMARY KEY (id),
  CONSTRAINT answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id),
  CONSTRAINT answers_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.exam_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  category_id uuid,
  duration_minutes integer NOT NULL,
  passing_score numeric NOT NULL,
  total_points integer NOT NULL,
  is_published boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exams_pkey PRIMARY KEY (id),
  CONSTRAINT exams_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.exam_categories(id),
  CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'admin'::text, 'faculty'::text])),
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  full_name text NOT NULL,
  degree_type text NOT NULL,
  major text,
  years integer DEFAULT 4,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT programs_pkey PRIMARY KEY (id),
  CONSTRAINT programs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid,
  question_text text NOT NULL,
  question_type USER-DEFINED NOT NULL,
  points integer NOT NULL DEFAULT 1,
  options jsonb,
  correct_answer text,
  explanation text,
  order_number integer,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.reviewers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  category_id uuid,
  content text,
  file_url text,
  created_by uuid,
  is_published boolean DEFAULT false,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviewers_pkey PRIMARY KEY (id),
  CONSTRAINT reviewers_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.exam_categories(id),
  CONSTRAINT reviewers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  full_name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schools_pkey PRIMARY KEY (id)
);
CREATE TABLE public.storage_files (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  uploaded_by uuid,
  purpose text CHECK (purpose = ANY (ARRAY['exam_questions'::text, 'reviewer'::text, 'profile_image'::text, 'other'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT storage_files_pkey PRIMARY KEY (id),
  CONSTRAINT storage_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL,
  student_id text UNIQUE,
  school text,
  year_level integer,
  target_exam text,
  created_at timestamp with time zone DEFAULT now(),
  program_id uuid,
  school_id uuid,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id),
  CONSTRAINT students_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid,
  student_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  time_spent_seconds integer,
  status text DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'submitted'::text, 'graded'::text])),
  score numeric,
  percentage numeric,
  passed boolean,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);