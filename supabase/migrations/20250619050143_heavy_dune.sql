/*
  # Add Security Fields for Anti-Fraud System

  1. New Fields
    - Add security_data JSONB field to absensi table for storing fraud detection data
    - Add device_fingerprint field for device tracking
    - Add risk_level field for quick filtering

  2. Security
    - Maintain existing RLS policies
    - Add indexes for performance
*/

-- Add security fields to absensi table
ALTER TABLE public.absensi 
ADD COLUMN IF NOT EXISTS security_data JSONB,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_absensi_risk_level ON public.absensi(risk_level);
CREATE INDEX IF NOT EXISTS idx_absensi_device_fingerprint ON public.absensi(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_absensi_security_data ON public.absensi USING GIN(security_data);

-- Add comments for documentation
COMMENT ON COLUMN public.absensi.security_data IS 'JSON data containing fraud detection results, confidence scores, and warnings';
COMMENT ON COLUMN public.absensi.device_fingerprint IS 'Unique device identifier for tracking and fraud prevention';
COMMENT ON COLUMN public.absensi.risk_level IS 'Risk assessment level: low, medium, or high';