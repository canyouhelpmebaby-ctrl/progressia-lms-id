-- Drop the security definer view and just use the student view properly
DROP VIEW IF EXISTS public.quiz_options_student;

-- Create a simple view (not security definer) that just hides is_correct
CREATE VIEW public.quiz_options_student AS
SELECT 
  id,
  question_id,
  option_text,
  order_index
FROM public.quiz_options;

-- Grant access to the view
GRANT SELECT ON public.quiz_options_student TO authenticated;
GRANT SELECT ON public.quiz_options_student TO anon;