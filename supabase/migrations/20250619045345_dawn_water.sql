/*
  # Add day type support to shift table

  1. Changes
    - Add `jenis_hari` column to shift table to support different day types
    - Add `aktif` column to enable/disable shifts
    - Update existing shifts to have default values

  2. Security
    - No changes to RLS policies needed as they inherit from existing shift table policies
*/

-- Add new columns to shift table
ALTER TABLE public.shift 
ADD COLUMN IF NOT EXISTS jenis_hari TEXT NOT NULL DEFAULT 'weekday',
ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true;

-- Add check constraint for valid day types
ALTER TABLE public.shift 
ADD CONSTRAINT shift_jenis_hari_check 
CHECK (jenis_hari IN ('weekday', 'weekend', 'holiday', 'all'));

-- Update existing shifts to have proper day types
UPDATE public.shift 
SET jenis_hari = 'weekday', aktif = true 
WHERE jenis_hari IS NULL OR jenis_hari = '';