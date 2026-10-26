-- ============================================================
-- Resume Upload Feature Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add resume_url column to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS resume_url text;

-- 2. Create a storage bucket for resumes (public, PDF only)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'resumes',
  'resumes',
  true,
  ARRAY['application/pdf'],
  5242880  -- 5 MB
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: allow authenticated users to upload their own resume
CREATE POLICY "Freelancers can upload their resume"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND name = (auth.uid()::text || '.pdf')
  );

-- 4. Allow authenticated users to update (replace) their own resume
CREATE POLICY "Freelancers can update their resume"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND name = (auth.uid()::text || '.pdf')
  );

-- 5. Allow anyone to read resumes (public bucket)
CREATE POLICY "Anyone can read resumes"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'resumes');
