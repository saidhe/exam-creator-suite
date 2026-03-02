
-- Drop FK to auth.users and recreate to profiles for PostgREST join support
ALTER TABLE public.submissions DROP CONSTRAINT submissions_student_id_fkey;
ALTER TABLE public.submissions 
ADD CONSTRAINT submissions_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also fix graded_by to allow teacher profile joins
ALTER TABLE public.submissions DROP CONSTRAINT submissions_graded_by_fkey;
ALTER TABLE public.submissions 
ADD CONSTRAINT submissions_graded_by_fkey 
FOREIGN KEY (graded_by) REFERENCES public.profiles(id);
