import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocation, calculateDistance } from '@/utils/location';
import { Clock, MapPin, Calendar, AlertCircle, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceHistory } from '@/components/AttendanceHistory';
import { MakeupRequestDialog } from '@/components/MakeupRequestDialog';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [validLocations, setValidLocations] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
      fetchValidLocations();
    }
  }, [user]);

  const fetchTodayAttendance = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .eq('user_id', user?.id)
      .gte('waktu', `${today}T00:00:00.000Z`)
      .lt('waktu', `${today}T23:59:59.999Z`)
      .single();

    if (!error && data) {
      setTodayAttendance(data);
    }
  };

  const fetchValidLocations = async () => {
    const { data, error } = await supabase
      .from('lokasi_valid')
      .select('*')
      .eq('aktif', true);

    if (!error && data) {
      setValidLocations(data);
    }
  };

  const handleCheckIn = async () => {
    setIsChecking(true);
    
    try {
      // Get current location
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;

      // Check if user is within valid location
      const nearbyLocation = validLocations.find(location => {
        const distance = calculateDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude
        );
        return distance <= location.radius_meter;
      });

      if (!nearbyLocation) {
        toast({
          title: t('notification.locationError'),
          description: t('notification.notValidLocation'),
          variant: "destructive",
        });
        return;
      }

      // Determine status based on time (simplified - you can make this more sophisticated)
      const now = new Date();
      const currentHour = now.getHours();
      let status: 'HADIR' | 'TERLAMBAT' = 'HADIR';
      
      // If after 8:30 AM, mark as late (you can customize this logic)
      if (currentHour > 8 || (currentHour === 8 && now.getMinutes() > 30)) {
        status = 'TERLAMBAT';
      }

      // Save attendance
      const { error } = await supabase
        .from('absensi')
        .insert({
          user_id: user?.id,
          waktu: now.toISOString(),
          status,
          metode: 'absen',
          lokasi: `${latitude},${longitude}`,
        });

      if (error) {
        toast({
          title: t('general.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('general.success'),
          description: `${t('notification.attendanceSuccess')}: ${t(`status.${status}`)}`,
        });
        fetchTodayAttendance();
      }
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'HADIR': 'default',
      'TERLAMBAT': 'secondary', 
      'MAKE_UP': 'outline'
    };
    
    return <Badge variant={variants[status] || 'default'}>{t(`status.${status}`)}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
              <p className="text-gray-600">{t('dashboard.welcome')}, {profile?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                {t('auth.signOut')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current time and check-in */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('dashboard.checkInToday')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.currentTime')}: {format(currentTime, 'HH:mm:ss, dd MMMM yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayAttendance ? (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <div className="text-4xl mb-2">✅</div>
                      <h3 className="text-lg font-semibold">{t('dashboard.alreadyCheckedIn')}</h3>
                      <p className="text-gray-600">
                        {t('dashboard.time')}: {format(new Date(todayAttendance.waktu), 'HH:mm')}
                      </p>
                      <div className="mt-2">
                        {getStatusBadge(todayAttendance.status)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Button 
                      onClick={handleCheckIn}
                      disabled={isChecking}
                      size="lg"
                      className="text-lg px-8 py-6"
                    >
                      {isChecking ? t('dashboard.checkingLocation') : t('dashboard.checkInNow')}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      {t('dashboard.makeValidLocation')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance History */}
            <AttendanceHistory userId={user?.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Valid locations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('dashboard.validLocations')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {validLocations.map((location) => (
                    <div key={location.id} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium">{location.nama_lokasi}</h4>
                      <p className="text-sm text-gray-600">
                        {t('dashboard.radius')}: {location.radius_meter}m
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Make-up request */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {t('dashboard.missedAttendance')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.requestMakeup')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MakeupRequestDialog userId={user?.id} onSuccess={fetchTodayAttendance} />
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('dashboard.thisMonth')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('dashboard.totalDays')}</span>
                    <span className="font-medium">22</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('dashboard.present')}</span>
                    <span className="font-medium text-green-600">18</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('dashboard.late')}</span>
                    <span className="font-medium text-yellow-600">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('dashboard.absent')}</span>
                    <span className="font-medium text-red-600">2</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
