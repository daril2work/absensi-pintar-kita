
-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'user');
CREATE TYPE public.attendance_status AS ENUM ('HADIR', 'TERLAMBAT', 'MAKE_UP');
CREATE TYPE public.attendance_method AS ENUM ('absen', 'make-up');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table to extend auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lokasi_valid table
CREATE TABLE public.lokasi_valid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_lokasi TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  radius_meter INTEGER NOT NULL DEFAULT 100,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shift table
CREATE TABLE public.shift (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_shift TEXT NOT NULL,
  jam_masuk TIME NOT NULL,
  jam_keluar TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create absensi table
CREATE TABLE public.absensi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  waktu TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status attendance_status NOT NULL,
  metode attendance_method NOT NULL DEFAULT 'absen',
  lokasi TEXT, -- format: "lat,long"
  alasan TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create makeup_requests table
CREATE TABLE public.makeup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tanggal_absen DATE NOT NULL,
  alasan TEXT NOT NULL,
  bukti_url TEXT, -- for file uploads
  status request_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lokasi_valid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makeup_requests ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_uuid;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for lokasi_valid
CREATE POLICY "Everyone can view active locations" ON public.lokasi_valid
  FOR SELECT USING (aktif = true);

CREATE POLICY "Admins can manage locations" ON public.lokasi_valid
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for shift
CREATE POLICY "Everyone can view shifts" ON public.shift
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage shifts" ON public.shift
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for absensi
CREATE POLICY "Users can view own attendance" ON public.absensi
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attendance" ON public.absensi
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendance" ON public.absensi
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all attendance" ON public.absensi
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for makeup_requests
CREATE POLICY "Users can view own makeup requests" ON public.makeup_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own makeup requests" ON public.makeup_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending requests" ON public.makeup_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all makeup requests" ON public.makeup_requests
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update makeup requests" ON public.makeup_requests
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data
INSERT INTO public.lokasi_valid (nama_lokasi, latitude, longitude, radius_meter, aktif) VALUES
('Kantor Pusat', -6.200000, 106.816666, 50, true),
('Cabang Jakarta Selatan', -6.261493, 106.810600, 100, true);

INSERT INTO public.shift (nama_shift, jam_masuk, jam_keluar) VALUES
('Pagi', '08:00:00', '16:00:00'),
('Siang', '13:00:00', '21:00:00'),
('Malam', '21:00:00', '05:00:00');
