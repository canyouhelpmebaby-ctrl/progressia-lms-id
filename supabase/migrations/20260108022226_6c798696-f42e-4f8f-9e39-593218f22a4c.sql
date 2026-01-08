-- Recreate the view with explicit security invoker to clear the linter warning
DROP VIEW IF EXISTS public.quiz_options_student;

CREATE VIEW public.quiz_options_student 
WITH (security_invoker = on) AS
SELECT 
  id,
  question_id,
  option_text,
  order_index
FROM public.quiz_options;

-- Grant access to the view
GRANT SELECT ON public.quiz_options_student TO authenticated;
GRANT SELECT ON public.quiz_options_student TO anon;