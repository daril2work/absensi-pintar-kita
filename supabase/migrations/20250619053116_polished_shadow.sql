-- Add photo support to absensi table
ALTER TABLE public.absensi 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.absensi.photo_url IS 'URL to the attendance photo stored in Supabase Storage';

-- Create storage bucket for attendance photos (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-photos',
  'attendance-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for attendance photos bucket
CREATE POLICY "Authenticated users can upload attendance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attendance-photos');

CREATE POLICY "Users can view attendance photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attendance-photos');

CREATE POLICY "Admins can manage all attendance photos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'attendance-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);