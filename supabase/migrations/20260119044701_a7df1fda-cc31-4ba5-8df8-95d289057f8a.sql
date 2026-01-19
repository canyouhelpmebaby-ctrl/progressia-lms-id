-- Add certificate template column to courses table
ALTER TABLE public.courses 
ADD COLUMN certificate_template_url TEXT;

-- Create user_certificates table for storing generated certificates
CREATE TABLE public.user_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one certificate per user per course
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own certificates" 
ON public.user_certificates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all certificates" 
ON public.user_certificates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert certificates" 
ON public.user_certificates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage certificates" 
ON public.user_certificates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_user_certificates_user_id ON public.user_certificates(user_id);
CREATE INDEX idx_user_certificates_course_id ON public.user_certificates(course_id);

-- Create storage bucket for certificate templates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certificate-templates', 'certificate-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for generated certificates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-certificates', 'user-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for certificate templates (admin upload, public read)
CREATE POLICY "Anyone can view certificate templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificate-templates');

CREATE POLICY "Admins can upload certificate templates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificate-templates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update certificate templates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'certificate-templates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete certificate templates"
ON storage.objects FOR DELETE
USING (bucket_id = 'certificate-templates' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for user certificates (user can only view own)
CREATE POLICY "Users can view own certificates files"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "System can insert user certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-certificates');

-- Function to generate unique certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cert_number TEXT;
  year_part TEXT;
  random_part TEXT;
  counter INT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get count of certificates this year + 1
  SELECT COUNT(*) + 1 INTO counter
  FROM user_certificates
  WHERE EXTRACT(YEAR FROM issued_at) = EXTRACT(YEAR FROM NOW());
  
  -- Format: CERT-YYYY-XXXXXX (e.g., CERT-2024-000001)
  cert_number := 'CERT-' || year_part || '-' || LPAD(counter::TEXT, 6, '0');
  
  RETURN cert_number;
END;
$$;

-- Function to check if user completed a course (all lessons completed)
CREATE OR REPLACE FUNCTION public.check_course_completion(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_lessons INT;
  completed_lessons INT;
BEGIN
  -- Get total active lessons in the course
  SELECT COUNT(*) INTO total_lessons
  FROM lessons l
  JOIN modules m ON l.module_id = m.id
  WHERE m.course_id = p_course_id 
    AND l.is_active = true 
    AND m.is_active = true;
  
  -- If no lessons, course cannot be completed
  IF total_lessons = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Get completed lessons by user
  SELECT COUNT(*) INTO completed_lessons
  FROM user_lesson_progress ulp
  JOIN lessons l ON ulp.lesson_id = l.id
  JOIN modules m ON l.module_id = m.id
  WHERE ulp.user_id = p_user_id 
    AND m.course_id = p_course_id
    AND ulp.completed = true
    AND l.is_active = true
    AND m.is_active = true;
  
  RETURN completed_lessons >= total_lessons;
END;
$$;

-- Function to issue certificate (called after course completion)
CREATE OR REPLACE FUNCTION public.issue_certificate(p_user_id UUID, p_course_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_cert_id UUID;
  new_cert_id UUID;
  cert_number TEXT;
BEGIN
  -- Check if certificate already exists
  SELECT id INTO existing_cert_id
  FROM user_certificates
  WHERE user_id = p_user_id AND course_id = p_course_id;
  
  IF existing_cert_id IS NOT NULL THEN
    RETURN existing_cert_id;
  END IF;
  
  -- Check if user actually completed the course
  IF NOT check_course_completion(p_user_id, p_course_id) THEN
    RAISE EXCEPTION 'Course not completed';
  END IF;
  
  -- Generate certificate number
  cert_number := generate_certificate_number();
  
  -- Insert new certificate
  INSERT INTO user_certificates (user_id, course_id, certificate_number)
  VALUES (p_user_id, p_course_id, cert_number)
  RETURNING id INTO new_cert_id;
  
  RETURN new_cert_id;
END;
$$;