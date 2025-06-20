
-- Add missing columns to shift table that are expected by the code
ALTER TABLE public.shift 
ADD COLUMN IF NOT EXISTS jenis_hari TEXT NOT NULL DEFAULT 'weekday',
ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true;

-- Add check constraint for valid day types
ALTER TABLE public.shift 
ADD CONSTRAINT shift_jenis_hari_check 
CHECK (jenis_hari IN ('weekday', 'weekend', 'holiday', 'all'));

-- Insert example shifts
INSERT INTO public.shift (nama_shift, jam_masuk, jam_keluar, jenis_hari, aktif) VALUES
('Shift Pagi', '08:00', '16:00', 'weekday', true),
('Shift Siang', '16:00', '00:00', 'weekday', true),
('Shift Malam', '00:00', '08:00', 'weekday', true),
('Shift Weekend', '09:00', '17:00', 'weekend', true),
('Shift Libur', '10:00', '18:00', 'holiday', true);
