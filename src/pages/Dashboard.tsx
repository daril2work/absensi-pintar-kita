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
import { Clock, MapPin, Calendar, AlertCircle, LogOut, Shield, AlertTriangle, Camera, CameraOff, ClockIcon, Bug } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceHistory } from '@/components/AttendanceHistory';
import { MakeupRequestDialog } from '@/components/MakeupRequestDialog';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ShiftSelector } from '@/components/ShiftSelector';
import { DashboardStats } from '@/components/DashboardStats';
import { ConnectionDebugger } from '@/components/ConnectionDebugger';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [validLocations, setValidLocations] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [photoCapturing, setPhotoCapturing] = useState(false);
  const [distanceToNearestValidLocation, setDistanceToNearestValidLocation] = useState<number | null>(null);
  const [nearestValidLocationName, setNearestValidLocationName] = useState<string>('');
  const [showClockOutButton, setShowClockOutButton] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);

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

  useEffect(() => {
    // Check if clock out button should be shown
    checkClockOutButtonVisibility();
  }, [todayAttendance, selectedShift, currentTime]);

  const checkClockOutButtonVisibility = () => {
    if (!todayAttendance || !selectedShift || todayAttendance.is_clocked_out) {
      setShowClockOutButton(false);
      return;
    }

    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const shiftEnd = selectedShift.jam_keluar;
    
    // Parse shift end time
    const shiftEndTime = new Date(`2000-01-01 ${shiftEnd}`);
    const currentDateTime = new Date(`2000-01-01 ${currentTime}`);
    
    // Show clock out button 30 minutes before shift end or after shift end
    const thirtyMinutesBefore = new Date(shiftEndTime.getTime() - 30 * 60000);
    
    const shouldShow = currentDateTime >= thirtyMinutesBefore;
    setShowClockOutButton(shouldShow);
  };

  const checkCameraAvailability = async () => {
    try {
      const available = await isCameraAvailable();
      setCameraAvailable(available);
    } catch (error) {
      setCameraAvailable(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      console.log('🔍 Fetching today attendance for:', today);
      
      const { data, error } = await supabase
        .from('absensi')
        .select(`
          *,
          shift:shift_id (
            id,
            nama_shift,
            jam_masuk,
            jam_keluar,
            jenis_hari
          )
        `)
        .eq('user_id', user?.id)
        .gte('waktu', `${today}T00:00:00.000Z`)
        .lt('waktu', `${today}T23:59:59.999Z`)
        .order('waktu', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Error fetching attendance:', error);
        toast({
          title: 'Connection Error',
          description: `Failed to fetch attendance: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0) {
        console.log('✅ Today attendance found:', data[0]);
        setTodayAttendance(data[0]);
        
        // UPDATED: Set the shift from attendance record - this is the key fix
        if (data[0].shift) {
          console.log('✅ Setting shift from attendance:', data[0].shift);
          setSelectedShift(data[0].shift);
        }
      } else {
        console.log('ℹ️ No attendance record found for today');
        setTodayAttendance(null);
        // UPDATED: Clear selected shift if no attendance found
        setSelectedShift(null);
      }
    } catch (error: any) {
      console.error('💥 Exception in fetchTodayAttendance:', error);
      toast({
        title: 'Network Error',
        description: `Failed to connect: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const fetchValidLocations = async () => {
    try {
      console.log('🔍 Fetching valid locations...');
      
      const { data, error } = await supabase
        .from('lokasi_valid')
        .select('*')
        .eq('aktif', true);

      if (error) {
        console.error('❌ Error fetching locations:', error);
        toast({
          title: 'Connection Error',
          description: `Failed to fetch locations: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Valid locations fetched:', data?.length || 0);
      setValidLocations(data || []);
    } catch (error: any) {
      console.error('💥 Exception in fetchValidLocations:', error);
      toast({
        title: 'Network Error',
        description: `Failed to connect: ${error.message}`,
        variant: "destructive",
      });
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
    // Reset distance and location info
    setDistanceToNearestValidLocation(null);
    setNearestValidLocationName('');
    
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
        // Calculate distance to nearest valid location
        let nearestDistance = Infinity;
        let nearestLocationName = '';
        
        validLocations.forEach(validLoc => {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            validLoc.latitude,
            validLoc.longitude
          );
          
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestLocationName = validLoc.nama_lokasi;
          }
        });

        // Update state with distance and location info
        setDistanceToNearestValidLocation(Math.round(nearestDistance));
        setNearestValidLocationName(nearestLocationName);

        // Enhanced error message with distance and current location
        const errorMessage = validLocations.length > 0 
          ? `${t('notification.notValidLocation')}.\n\nLokasi Anda saat ini: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}\n\nJarak ke lokasi terdekat "${nearestLocationName}": ${Math.round(nearestDistance)} meter`
          : `${t('notification.notValidLocation')}.\n\nLokasi Anda saat ini: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}\n\nTidak ada lokasi valid yang dikonfigurasi.`;

        toast({
          title: t('notification.locationError'),
          description: errorMessage,
          variant: "destructive",
          duration: 8000, // Longer duration for more detailed message
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
        risk_level: security.riskLevel,
        is_clocked_out: false
      };

      console.log('💾 Saving attendance data:', attendanceData);

      const { error } = await supabase
        .from('absensi')
        .insert(attendanceData);

      if (error) {
        console.error('❌ Error saving attendance:', error);
        toast({
          title: t('general.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ Attendance saved successfully');
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
      console.error('💥 Exception in handleCheckIn:', error);
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

  const handleClockOut = async () => {
    if (!todayAttendance || todayAttendance.is_clocked_out) {
      toast({
        title: t('general.error'),
        description: 'No active attendance record found or already clocked out.',
        variant: "destructive",
      });
      return;
    }

    setIsClockingOut(true);
    setSecurityWarnings([]);
    setPhotoCapturing(true);
    
    let photoUrl: string | null = null;
    let photoStatus = 'no_photo';
    
    try {
      // Step 1: Capture photo for clock out
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
        } else {
          try {
            photoUrl = await generateFallbackPhoto(user?.id || '', Date.now());
            photoStatus = 'fallback_photo';
          } catch (fallbackError) {
            photoStatus = 'no_photo';
          }
        }
      } catch (photoError) {
        photoStatus = 'photo_error';
      }

      setPhotoCapturing(false);

      // Step 2: Get location with security checks
      const locationResult = await getLocationWithSecurity();
      const { location, security } = locationResult;

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

      // Step 4: Update attendance record with clock out data
      const now = new Date();
      const { error } = await supabase
        .from('absensi')
        .update({
          clock_out_time: now.toISOString(),
          clock_out_location: `${location.lat},${location.lng}`,
          clock_out_security_data: JSON.stringify({
            confidence: security.confidence,
            riskLevel: security.riskLevel,
            deviceFingerprint: security.deviceFingerprint,
            warnings: security.warnings,
            timestamp: now.toISOString(),
            photoStatus,
            photoUrl
          }),
          is_clocked_out: true
        })
        .eq('id', todayAttendance.id);

      if (error) {
        toast({
          title: t('general.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        // CRITICAL FIX: Update the local state immediately after successful backend update
        setTodayAttendance(prevAttendance => ({
          ...prevAttendance,
          clock_out_time: now.toISOString(),
          clock_out_location: `${location.lat},${location.lng}`,
          clock_out_security_data: JSON.stringify({
            confidence: security.confidence,
            riskLevel: security.riskLevel,
            deviceFingerprint: security.deviceFingerprint,
            warnings: security.warnings,
            timestamp: now.toISOString(),
            photoStatus,
            photoUrl
          }),
          is_clocked_out: true
        }));

        toast({
          title: t('general.success'),
          description: `Clock out successful at ${format(now, 'HH:mm')}!`,
        });
        
        // Still fetch from backend to ensure data consistency
        fetchTodayAttendance();
      }
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsClockingOut(false);
      setPhotoCapturing(false);
    }
  };

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDebugger(!showDebugger)}
                className="flex items-center gap-2"
              >
                <Bug className="h-4 w-4" />
                {showDebugger ? 'Hide' : 'Debug'}
              </Button>
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
            {/* Debug Panel */}
            {showDebugger && (
              <ConnectionDebugger />
            )}

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

            {/* Distance and Location Info Alert */}
            {distanceToNearestValidLocation !== null && nearestValidLocationName && (
              <Alert variant="destructive">
                <MapPin className="h-4 w-4" />
                <AlertTitle>Informasi Lokasi</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Jarak ke lokasi terdekat "{nearestValidLocationName}": <strong>{distanceToNearestValidLocation} meter</strong></p>
                    <p className="text-xs text-gray-600">Silakan bergerak lebih dekat ke lokasi yang valid untuk melakukan absen.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Shift Selection - UPDATED: Pass currentSelectedShiftId prop */}
            <ShiftSelector 
              userId={user?.id || ''} 
              onShiftChange={setSelectedShift}
              disabled={!!todayAttendance}
              currentSelectedShiftId={selectedShift?.id} // CRITICAL: This ensures the component shows the correct shift
            />

            {/* Current time and check-in/out */}
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
                      <div className="text-4xl mb-2">
                        {todayAttendance.is_clocked_out ? '✅' : '🕐'}
                      </div>
                      <h3 className="text-lg font-semibold">
                        {todayAttendance.is_clocked_out ? 'Completed for Today' : t('dashboard.alreadyCheckedIn')}
                      </h3>
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          Clock In: {format(new Date(todayAttendance.waktu), 'HH:mm')}
                        </p>
                        {todayAttendance.clock_out_time && (
                          <p className="text-gray-600">
                            Clock Out: {format(new Date(todayAttendance.clock_out_time), 'HH:mm')}
                          </p>
                        )}
                        {!todayAttendance.clock_out_time && !todayAttendance.is_clocked_out && (
                          <p className="text-amber-600 text-sm">
                            Belum Clock Out
                          </p>
                        )}
                      </div>
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
                    
                    {/* Clock Out Button */}
                    {showClockOutButton && !todayAttendance.is_clocked_out && (
                      <div className="mt-6">
                        <Button 
                          onClick={handleClockOut}
                          disabled={isClockingOut || photoCapturing}
                          size="lg"
                          variant="outline"
                          className="text-lg px-8 py-6 border-orange-500 text-orange-600 hover:bg-orange-50"
                        >
                          {photoCapturing ? (
                            <div className="flex items-center gap-2">
                              <Camera className="h-5 w-5 animate-pulse" />
                              {t('camera.takingPhoto')}
                            </div>
                          ) : isClockingOut ? (
                            'Clocking Out...'
                          ) : (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-5 w-5" />
                              Clock Out
                            </div>
                          )}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          Clock out when your shift is ending
                        </p>
                      </div>
                    )}
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
            {/* Dynamic Statistics - Replace the old static stats */}
            {user?.id && <DashboardStats userId={user.id} />}

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
                      <p className="text-xs text-gray-500">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
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
          </div>
        </div>
      </div>
    </div>
  );
}