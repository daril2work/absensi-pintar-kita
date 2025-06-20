
-- Add missing columns to absensi table that are expected by the frontend code
ALTER TABLE public.absensi 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS security_data JSONB,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shift(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_absensi_risk_level ON public.absensi(risk_level);
CREATE INDEX IF NOT EXISTS idx_absensi_device_fingerprint ON public.absensi(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_absensi_security_data ON public.absensi USING GIN(security_data);
CREATE INDEX IF NOT EXISTS idx_absensi_shift_id ON public.absensi(shift_id);

-- Add comments for documentation
COMMENT ON COLUMN public.absensi.photo_url IS 'URL to the attendance photo stored in Supabase Storage';
COMMENT ON COLUMN public.absensi.security_data IS 'JSON data containing fraud detection results, confidence scores, and warnings';
COMMENT ON COLUMN public.absensi.device_fingerprint IS 'Unique device identifier for tracking and fraud prevention';
COMMENT ON COLUMN public.absensi.risk_level IS 'Risk assessment level: low, medium, or high';
COMMENT ON COLUMN public.absensi.shift_id IS 'Reference to the shift used for this attendance record';

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
