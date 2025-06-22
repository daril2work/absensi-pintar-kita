-- Create user_shifts table for dynamic shift assignment
CREATE TABLE IF NOT EXISTS public.user_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shift(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one shift per user per day
  UNIQUE(user_id, tanggal)
);

-- Enable RLS
ALTER TABLE public.user_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_shifts
CREATE POLICY "Users can view own shift assignments" ON public.user_shifts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own shift assignments" ON public.user_shifts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shift assignments" ON public.user_shifts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all shift assignments" ON public.user_shifts
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_shifts_user_date ON public.user_shifts(user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_user_shifts_shift_id ON public.user_shifts(shift_id);
CREATE INDEX IF NOT EXISTS idx_user_shifts_tanggal ON public.user_shifts(tanggal);

-- Add shift_id reference to absensi table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'absensi' AND column_name = 'shift_id'
  ) THEN
    ALTER TABLE public.absensi ADD COLUMN shift_id UUID REFERENCES public.shift(id);
    CREATE INDEX IF NOT EXISTS idx_absensi_shift_id ON public.absensi(shift_id);
    COMMENT ON COLUMN public.absensi.shift_id IS 'Reference to the shift used for this attendance record';
  END IF;
END $$;