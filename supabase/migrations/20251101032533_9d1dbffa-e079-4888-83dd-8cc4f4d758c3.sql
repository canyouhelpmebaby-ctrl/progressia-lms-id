-- Add server-side validation to learning-materials storage bucket
-- This enforces file size and MIME type restrictions at the database level

-- Update bucket to enforce file size limit (10MB)
UPDATE storage.buckets
SET file_size_limit = 10485760 -- 10MB in bytes
WHERE id = 'learning-materials';

-- Update bucket to restrict allowed MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]
WHERE id = 'learning-materials';