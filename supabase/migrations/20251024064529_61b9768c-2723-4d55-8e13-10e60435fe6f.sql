-- Create learning goals table
CREATE TABLE public.learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  target_value INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON public.learning_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.learning_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.learning_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.learning_goals FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all goals"
  ON public.learning_goals FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_learning_goals_updated_at
  BEFORE UPDATE ON public.learning_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create learning sessions table (for timer/alarm tracking)
CREATE TABLE public.learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('study', 'break')),
  notes TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.learning_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.learning_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.learning_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create rewards/badges table
CREATE TABLE public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_name TEXT NOT NULL,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('progress', 'streak', 'completion', 'achievement')),
  description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards"
  ON public.user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage rewards"
  ON public.user_rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create learning records table
CREATE TABLE public.learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  duration_minutes INTEGER,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
  ON public.learning_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON public.learning_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all records"
  ON public.learning_records FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create learning paths table
CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_order UUID[] NOT NULL,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active paths"
  ON public.learning_paths FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage paths"
  ON public.learning_paths FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_learning_paths_updated_at
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create learning materials/files table
CREATE TABLE public.learning_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active materials"
  ON public.learning_materials FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage materials"
  ON public.learning_materials FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_learning_materials_updated_at
  BEFORE UPDATE ON public.learning_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for learning materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('learning-materials', 'learning-materials', true);

-- Storage policies for learning materials
CREATE POLICY "Anyone can view materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'learning-materials');

CREATE POLICY "Admins can upload materials"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'learning-materials' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update materials"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'learning-materials' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete materials"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'learning-materials' AND has_role(auth.uid(), 'admin'));