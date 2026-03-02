-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Published exams viewable by students" ON public.exams;

-- Recreate as PERMISSIVE policy (default)
CREATE POLICY "Published exams viewable by students" 
ON public.exams 
FOR SELECT 
TO authenticated
USING (
  (status = 'publie'::exam_status) 
  OR (created_by = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);