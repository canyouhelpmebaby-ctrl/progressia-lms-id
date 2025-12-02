-- Create modules table
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('module', 'final')),
  passing_score INTEGER NOT NULL DEFAULT 70,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (
    (quiz_type = 'module' AND module_id IS NOT NULL AND course_id IS NULL) OR
    (quiz_type = 'final' AND course_id IS NOT NULL AND module_id IS NULL)
  )
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_options table
CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Create user_lesson_progress table
CREATE TABLE public.user_lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, lesson_id)
);

-- Create user_quiz_attempts table
CREATE TABLE public.user_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modules
CREATE POLICY "Anyone can view active modules" ON public.modules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage modules" ON public.modules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for lessons
CREATE POLICY "Anyone can view active lessons" ON public.lessons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quizzes
CREATE POLICY "Anyone can view active quizzes" ON public.quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage quizzes" ON public.quizzes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quiz_questions
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_active = true
    )
  );

CREATE POLICY "Admins can manage quiz questions" ON public.quiz_questions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quiz_options
CREATE POLICY "Anyone can view quiz options" ON public.quiz_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions
      JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id
      WHERE quiz_questions.id = quiz_options.question_id AND quizzes.is_active = true
    )
  );

CREATE POLICY "Admins can manage quiz options" ON public.quiz_options
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_lesson_progress
CREATE POLICY "Users can view own lesson progress" ON public.user_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress" ON public.user_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress" ON public.user_lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all lesson progress" ON public.user_lesson_progress
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_quiz_attempts
CREATE POLICY "Users can view own quiz attempts" ON public.user_quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts" ON public.user_quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all quiz attempts" ON public.user_quiz_attempts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_modules_course_id ON public.modules(course_id);
CREATE INDEX idx_modules_order ON public.modules(order_index);
CREATE INDEX idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX idx_lessons_order ON public.lessons(order_index);
CREATE INDEX idx_quizzes_module_id ON public.quizzes(module_id);
CREATE INDEX idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_options_question_id ON public.quiz_options(question_id);
CREATE INDEX idx_user_lesson_progress_user_id ON public.user_lesson_progress(user_id);
CREATE INDEX idx_user_lesson_progress_lesson_id ON public.user_lesson_progress(lesson_id);
CREATE INDEX idx_user_quiz_attempts_user_id ON public.user_quiz_attempts(user_id);
CREATE INDEX idx_user_quiz_attempts_quiz_id ON public.user_quiz_attempts(quiz_id);