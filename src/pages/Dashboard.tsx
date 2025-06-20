
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
import { captureHiddenPhoto, isCameraAvailable, generateFallbackPhoto } from '@/utils/camera';
import { Clock, MapPin, Calendar, AlertCircle, LogOut, Shield, AlertTriangle, Camera, CameraOff } from 'lucide-react';
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
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [photoCapturing, setPhotoCapturing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
      fetchValidLocations();
      checkCameraAvailability();
    }
  }, [user]);

  const checkCameraAvailability = async () => {
    try {
      const available = await isCameraAvailable();
      setCameraAvailable(available);
    } catch (error) {
      setCameraAvailable(false);
    }
  };

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
        title: t('shift.shiftRequired'),
        description: t('shift.pleaseSelectShift'),
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setSecurityWarnings([]);
    setPhotoCapturing(true);
    
    let photoUrl: string | null = null;
    let photoStatus = 'no_photo';
    
    try {
      // Step 1: Capture photo (hidden)
      try {
        const photoResult = await captureHiddenPhoto({
          quality: 0.8,
          maxWidth: 1280,
          maxHeight: 720,
          format: 'jpeg'
        });

        if (photoResult.success && photoResult.photoUrl) {
          photoUrl = photoResult.photoUrl;
          photoStatus = 'photo_captured';
          
          toast({
            title: t('camera.photoTaken'),
            description: t('camera.photoSaved'),
            duration: 2000,
          });
        } else {
          console.warn('Photo capture failed:', photoResult.error);
          
          // Generate fallback photo
          try {
            photoUrl = await generateFallbackPhoto(user?.id || '', Date.now());
            photoStatus = 'fallback_photo';
            
            toast({
              title: t('camera.usingFallback'),
              description: t('camera.cameraNotAvailable'),
              duration: 2000,
            });
          } catch (fallbackError) {
            console.error('Fallback photo failed:', fallbackError);
            photoStatus = 'no_photo';
          }
        }
      } catch (photoError) {
        console.error('Photo capture error:', photoError);
        photoStatus = 'photo_error';
        
        // Try fallback photo
        try {
          photoUrl = await generateFallbackPhoto(user?.id || '', Date.now());
          photoStatus = 'fallback_photo';
        } catch (fallbackError) {
          console.error('Fallback photo failed:', fallbackError);
          photoStatus = 'no_photo';
        }
      }

      setPhotoCapturing(false);

      // Step 2: Get location with comprehensive security checks
      const locationResult = await getLocationWithSecurity();
      const { location, security } = locationResult;

      // Update security warnings and risk level
      setSecurityWarnings(security.warnings);
      setRiskLevel(security.riskLevel);

      // Check if location is secure enough for attendance
      if (!security.isSecure || security.riskLevel === 'high') {
        toast({
          title: t('security.securityWarning'),
          description: `${t('security.locationValidationFailed')}: ${security.riskLevel}. ${t('security.confidence')}: ${security.confidence}%`,
          variant: "destructive",
        });
        return;
      }

      // Show warning for medium risk
      if (security.riskLevel === 'medium') {
        const proceed = confirm(
          `${t('security.securityWarning')}: Medium risk detected (${security.confidence}% ${t('security.confidence')}). Warnings: ${security.warnings.join(', ')}. ${t('security.proceedQuestion')}`
        );
        if (!proceed) return;
      }

      // Step 3: Check if user is within valid location
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

      // Step 4: Determine status based on shift time
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

      // Step 5: Save attendance with all data
      const attendanceData = {
        user_id: user?.id,
        waktu: now.toISOString(),
        status,
        metode: 'absen' as const, // Fixed type casting
        lokasi: `${location.lat},${location.lng}`,
        shift_id: selectedShift.id,
        photo_url: photoUrl,
        security_data: JSON.stringify({
          confidence: security.confidence,
          riskLevel: security.riskLevel,
          deviceFingerprint: security.deviceFingerprint,
          warnings: security.warnings,
          timestamp: now.toISOString(),
          photoStatus,
          cameraAvailable: cameraAvailable,
          shiftInfo: {
            shift_id: selectedShift.id,
            shift_name: selectedShift.nama_shift,
            shift_start: selectedShift.jam_masuk,
            shift_end: selectedShift.jam_keluar
          }
        }),
        device_fingerprint: security.deviceFingerprint,
        risk_level: security.riskLevel
      };

      const { error } = await supabase
        .from('absensi')
        .insert(attendanceData);

      if (error) {
        toast({
          title: t('general.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        const successMessage = photoStatus === 'photo_captured' 
          ? t('camera.attendanceWithPhoto')
          : t('camera.attendanceWithoutPhoto');
          
        toast({
          title: t('general.success'),
          description: `${successMessage}: ${t(`status.${status}`)} (${selectedShift.nama_shift})`,
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
      setPhotoCapturing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    // Fixed badge variant mapping
    const getVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
      switch (status) {
        case 'HADIR': return 'default';
        case 'TERLAMBAT': return 'secondary';
        case 'MAKE_UP': return 'outline';
        default: return 'default';
      }
    };
    
    return <Badge variant={getVariant(status)}>{t(`status.${status}`)}</Badge>;
  };

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    const getVariant = (risk: string): "default" | "destructive" | "outline" | "secondary" => {
      switch (risk) {
        case 'low': return 'default';
        case 'medium': return 'secondary';
        case 'high': return 'destructive';
        default: return 'default';
      }
    };
    
    return <Badge variant={getVariant(risk)}>{risk.toUpperCase()}</Badge>;
  };

  const getShiftTimeStatus = () => {
    if (!selectedShift) return null;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const shiftStart = selectedShift.jam_masuk;
    const shiftEnd = selectedShift.jam_keluar;

    if (currentTime < shiftStart) {
      return { status: 'before', message: `${t('shift.shiftStarts')} ${shiftStart}`, color: 'text-blue-600' };
    } else if (currentTime >= shiftStart && currentTime <= shiftEnd) {
      return { status: 'during', message: `${t('shift.shiftActive')} ${shiftEnd}`, color: 'text-green-600' };
    } else {
      return { status: 'after', message: `${t('shift.shiftEnded')} ${shiftEnd}`, color: 'text-gray-600' };
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
                <AlertTitle>{t('security.securityAlert')}: {getRiskBadge(riskLevel)}</AlertTitle>
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
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    {cameraAvailable ? (
                      <Camera className="h-4 w-4 text-blue-600" />
                    ) : (
                      <CameraOff className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  <div className="space-y-1">
                    <div>{t('dashboard.currentTime')}: {format(currentTime, 'HH:mm:ss, dd MMMM yyyy')}</div>
                    {selectedShift && shiftTimeStatus && (
                      <div className={`text-sm ${shiftTimeStatus.color}`}>
                        {shiftTimeStatus.message}
                      </div>
                    )}
                    {cameraAvailable !== null && (
                      <div className="flex items-center gap-2 text-xs">
                        {cameraAvailable ? (
                          <span className="text-blue-600 flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            {t('camera.securePhotoCapture')}
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-1">
                            <CameraOff className="h-3 w-3" />
                            {t('camera.cameraNotAvailable')}
                          </span>
                        )}
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
                        {todayAttendance.photo_url && (
                          <div className="text-xs text-green-600 flex items-center justify-center gap-1">
                            <Camera className="h-3 w-3" />
                            <span>Photo recorded</span>
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
                          <h3 className="text-lg font-semibold text-amber-700">{t('shift.selectShiftFirst')}</h3>
                          <p className="text-sm text-amber-600">
                            {t('shift.chooseShiftBeforeCheckin')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Button 
                          onClick={handleCheckIn}
                          disabled={isChecking || photoCapturing}
                          size="lg"
                          className="text-lg px-8 py-6"
                        >
                          {photoCapturing ? (
                            <div className="flex items-center gap-2">
                              <Camera className="h-5 w-5 animate-pulse" />
                              {t('camera.takingPhoto')}
                            </div>
                          ) : isChecking ? (
                            t('dashboard.checkingLocation')
                          ) : (
                            t('dashboard.checkInNow')
                          )}
                        </Button>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">
                            {t('dashboard.makeValidLocation')}
                          </p>
                          <div className="flex items-center justify-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-green-600">
                              <Shield className="h-3 w-3" />
                              <span>{t('security.protectedByAntiFraud')}</span>
                            </div>
                            {cameraAvailable && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Camera className="h-3 w-3" />
                                <span>Auto photo capture</span>
                              </div>
                            )}
                          </div>
                          {selectedShift && (
                            <div className="text-sm text-blue-600">
                              {t('shift.selectedShift')}: {selectedShift.nama_shift} ({selectedShift.jam_masuk} - {selectedShift.jam_keluar})
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
                  {t('security.securityStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('device.riskLevel')}</span>
                    {getRiskBadge(riskLevel)}
                  </div>
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('security.mockLocationDetection')}: {t('security.active')}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('security.deviceFingerprinting')}: {t('security.active')}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('security.velocityCheck')}: {t('security.active')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${cameraAvailable ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Photo Capture: {cameraAvailable ? t('security.active') : 'Fallback'}</span>
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
