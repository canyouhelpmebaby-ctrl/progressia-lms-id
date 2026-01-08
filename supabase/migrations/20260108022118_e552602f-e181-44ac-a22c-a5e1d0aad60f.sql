-- Create a secure function for grading quizzes (server-side, answers never exposed)
CREATE OR REPLACE FUNCTION public.grade_quiz(
  p_quiz_id UUID,
  p_answers JSONB
) RETURNS TABLE(score INTEGER, passed BOOLEAN, total_points INTEGER, earned_points INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_points INTEGER := 0;
  v_earned_points INTEGER := 0;
  v_passing_score INTEGER;
  v_question RECORD;
  v_user_answer_id UUID;
  v_correct_option_id UUID;
BEGIN
  -- Get the passing score for this quiz
  SELECT passing_score INTO v_passing_score
  FROM quizzes
  WHERE id = p_quiz_id AND is_active = true;
  
  IF v_passing_score IS NULL THEN
    RAISE EXCEPTION 'Quiz not found or inactive';
  END IF;

  -- Loop through each question and calculate score
  FOR v_question IN 
    SELECT qq.id AS question_id, qq.points
    FROM quiz_questions qq
    WHERE qq.quiz_id = p_quiz_id
    ORDER BY qq.order_index
  LOOP
    v_total_points := v_total_points + v_question.points;
    
    -- Get user's answer for this question
    v_user_answer_id := (p_answers->>v_question.question_id::text)::uuid;
    
    -- Get the correct option for this question
    SELECT qo.id INTO v_correct_option_id
    FROM quiz_options qo
    WHERE qo.question_id = v_question.question_id AND qo.is_correct = true
    LIMIT 1;
    
    -- Check if user's answer matches correct answer
    IF v_user_answer_id IS NOT NULL AND v_user_answer_id = v_correct_option_id THEN
      v_earned_points := v_earned_points + v_question.points;
    END IF;
  END LOOP;

  -- Calculate percentage score
  IF v_total_points > 0 THEN
    score := ROUND((v_earned_points::NUMERIC / v_total_points::NUMERIC) * 100)::INTEGER;
  ELSE
    score := 0;
  END IF;
  
  passed := score >= v_passing_score;
  total_points := v_total_points;
  earned_points := v_earned_points;
  
  RETURN NEXT;
END;
$$;

-- Create a view for quiz options that excludes is_correct for non-admins
-- First, drop and recreate with proper filtering
CREATE OR REPLACE VIEW public.quiz_options_student AS
SELECT 
  id,
  question_id,
  option_text,
  order_index
FROM public.quiz_options;

-- Grant access to the view
GRANT SELECT ON public.quiz_options_student TO authenticated;
GRANT SELECT ON public.quiz_options_student TO anon;