
-- Allow students to delete their own answers (for resubmission cleanup)
CREATE POLICY "Students can delete own answers"
ON public.answers FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.id = answers.submission_id
    AND s.student_id = auth.uid()
    AND s.status = 'en_cours'
  )
);

-- Allow students to update their own submission status (to submit)
CREATE POLICY "Students can update own submissions"
ON public.submissions FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());
