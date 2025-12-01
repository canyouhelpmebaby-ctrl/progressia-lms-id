-- Add difficulty level and thumbnail to courses table
ALTER TABLE public.courses 
ADD COLUMN difficulty text CHECK (difficulty IN ('pemula', 'menengah', 'lanjutan')),
ADD COLUMN thumbnail_url text;

-- Update RLS policies remain the same (admins can manage, anyone can view)