/*
  # Add Clock Out Support to Attendance System

  1. New Fields
    - Add clock_out_time to absensi table for recording clock out time
    - Add clock_out_location for clock out location tracking
    - Add clock_out_security_data for fraud detection on clock out
    - Add is_clocked_out boolean flag for quick status checking

  2. Security
    - Maintain existing RLS policies
    - Add indexes for performance
*/

-- Add clock out fields to absensi table
ALTER TABLE public.absensi 
ADD COLUMN IF NOT EXISTS clock_out_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clock_out_location TEXT,
ADD COLUMN IF NOT EXISTS clock_out_security_data JSONB,
ADD COLUMN IF NOT EXISTS is_clocked_out BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_absensi_clock_out_time ON public.absensi(clock_out_time);
CREATE INDEX IF NOT EXISTS idx_absensi_is_clocked_out ON public.absensi(is_clocked_out);
CREATE INDEX IF NOT EXISTS idx_absensi_clock_out_security ON public.absensi USING GIN(clock_out_security_data);

-- Add comments for documentation
COMMENT ON COLUMN public.absensi.clock_out_time IS 'Timestamp when user clocked out';
COMMENT ON COLUMN public.absensi.clock_out_location IS 'Location coordinates when user clocked out (lat,lng format)';
COMMENT ON COLUMN public.absensi.clock_out_security_data IS 'Security validation data for clock out action';
COMMENT ON COLUMN public.absensi.is_clocked_out IS 'Boolean flag indicating if user has clocked out for this attendance record';