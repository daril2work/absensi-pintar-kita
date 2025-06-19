import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getLocationWithSecurity, isLocationValid } from '@/utils/location';
import { Clock, MapPin, Calendar, AlertCircle, LogOut, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceHistory } from '@/components/AttendanceHistory';
import { MakeupRequestDialog } from '@/components/MakeupRequestDialog';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ShiftSelector } from '@/components/ShiftSelector';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [validLocations, setValidLocations] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [selectedShift, setSelectedShift] = useState<any>(null);

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
    if (!selectedShift) {
      toast({
        title: "Shift Required",
        description: "Please select your shift before checking in.",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setSecurityWarnings([]);
    
    try {
      // Get location with comprehensive security checks
      const locationResult = await getLocationWithSecurity();
      const { location, security } = locationResult;

      // Update security warnings and risk level
      setSecurityWarnings(security.warnings);
      setRiskLevel(security.riskLevel);

      // Check if location is secure enough for attendance
      if (!security.isSecure || security.riskLevel === 'high') {
        toast({
          title: "Security Warning",
          description: `Location validation failed. Risk level: ${security.riskLevel}. Confidence: ${security.confidence}%`,
          variant: "destructive",
        });
        return;
      }

      // Show warning for medium risk
      if (security.riskLevel === 'medium') {
        const proceed = confirm(
          `Security Warning: Medium risk detected (${security.confidence}% confidence). Warnings: ${security.warnings.join(', ')}. Do you want to proceed?`
        );
        if (!proceed) return;
      }

      // Check if user is within valid location
      const locationCheck = await isLocationValid(
        location.lat,
        location.lng,
        validLocations
      );

      if (!locationCheck.isValid) {
        toast({
          title: t('notification.locationError'),
          description: t('notification.notValidLocation'),
          variant: "destructive",
        });
        return;
      }

      // Determine status based on shift time
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      let status: 'HADIR' | 'TERLAMBAT' = 'HADIR';
      
      // Check if late based on shift start time
      if (selectedShift && currentTime > selectedShift.jam_masuk) {
        // Add grace period of 15 minutes
        const shiftStart = new Date(`2000-01-01 ${selectedShift.jam_masuk}`);
        const graceTime = new Date(shiftStart.getTime() + 15 * 60000); // 15 minutes
        const currentDateTime = new Date(`2000-01-01 ${currentTime}`);
        
        if (currentDateTime > graceTime) {
          status = 'TERLAMBAT';
        }
      }

      // Save attendance with security information and shift data
      const { error } = await supabase
        .from('absensi')
        .insert({
          user_id: user?.id,
          waktu: now.toISOString(),
          status,
          metode: 'absen',
          lokasi: `${location.lat},${location.lng}`,
          shift_id: selectedShift.id,
          security_data: JSON.stringify({
            confidence: security.confidence,
            riskLevel: security.riskLevel,
            deviceFingerprint: security.deviceFingerprint,
            warnings: security.warnings,
            timestamp: now.toISOString(),
            shiftInfo: {
              shift_id: selectedShift.id,
              shift_name: selectedShift.nama_shift,
              shift_start: selectedShift.jam_masuk,
              shift_end: selectedShift.jam_keluar
            }
          }),
          device_fingerprint: security.deviceFingerprint,
          risk_level: security.riskLevel
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
          description: `${t('notification.attendanceSuccess')}: ${t(`status.${status}`)} (${selectedShift.nama_shift})`,
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

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    const variants = {
      'low': 'default',
      'medium': 'secondary',
      'high': 'destructive'
    };
    
    return <Badge variant={variants[risk]}>{risk.toUpperCase()}</Badge>;
  };

  const getShiftTimeStatus = () => {
    if (!selectedShift) return null;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const shiftStart = selectedShift.jam_masuk;
    const shiftEnd = selectedShift.jam_keluar;

    if (currentTime < shiftStart) {
      return { status: 'before', message: `Shift starts at ${shiftStart}`, color: 'text-blue-600' };
    } else if (currentTime >= shiftStart && currentTime <= shiftEnd) {
      return { status: 'during', message: `Shift is active until ${shiftEnd}`, color: 'text-green-600' };
    } else {
      return { status: 'after', message: `Shift ended at ${shiftEnd}`, color: 'text-gray-600' };
    }
  };

  const shiftTimeStatus = getShiftTimeStatus();

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
            {/* Security Warnings */}
            {securityWarnings.length > 0 && (
              <Alert variant={riskLevel === 'high' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Security Alert - Risk Level: {getRiskBadge(riskLevel)}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {securityWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Shift Selection */}
            <ShiftSelector 
              userId={user?.id || ''} 
              onShiftChange={setSelectedShift}
              disabled={!!todayAttendance}
            />

            {/* Current time and check-in */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('dashboard.checkInToday')}
                  <Shield className="h-4 w-4 text-green-600" title="Anti-fraud protection enabled" />
                </CardTitle>
                <CardDescription>
                  <div className="space-y-1">
                    <div>{t('dashboard.currentTime')}: {format(currentTime, 'HH:mm:ss, dd MMMM yyyy')}</div>
                    {selectedShift && shiftTimeStatus && (
                      <div className={`text-sm ${shiftTimeStatus.color}`}>
                        {shiftTimeStatus.message}
                      </div>
                    )}
                  </div>
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
                      <div className="mt-2 space-y-1">
                        {getStatusBadge(todayAttendance.status)}
                        {todayAttendance.shift_id && selectedShift && (
                          <div className="text-sm text-gray-500">
                            Shift: {selectedShift.nama_shift}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {!selectedShift ? (
                      <div className="space-y-4">
                        <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
                        <div>
                          <h3 className="text-lg font-semibold text-amber-700">Select Your Shift First</h3>
                          <p className="text-sm text-amber-600">
                            Please choose your working shift above before checking in.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Button 
                          onClick={handleCheckIn}
                          disabled={isChecking}
                          size="lg"
                          className="text-lg px-8 py-6"
                        >
                          {isChecking ? t('dashboard.checkingLocation') : t('dashboard.checkInNow')}
                        </Button>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">
                            {t('dashboard.makeValidLocation')}
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                            <Shield className="h-3 w-3" />
                            <span>Protected by anti-fraud system</span>
                          </div>
                          {selectedShift && (
                            <div className="text-sm text-blue-600">
                              Selected Shift: {selectedShift.nama_shift} ({selectedShift.jam_masuk} - {selectedShift.jam_keluar})
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance History */}
            <AttendanceHistory userId={user?.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Security Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Risk Level</span>
                    {getRiskBadge(riskLevel)}
                  </div>
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Mock Location Detection: Active</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Device Fingerprinting: Active</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Velocity Check: Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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