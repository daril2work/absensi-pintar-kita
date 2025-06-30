import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock, Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { format, isWeekend } from 'date-fns';

interface Shift {
  id: string;
  nama_shift: string;
  jam_masuk: string;
  jam_keluar: string;
  jenis_hari: string; // Changed from union type to string to match database
  aktif: boolean;
  created_at?: string;
}

interface ShiftSelectorProps {
  userId: string;
  onShiftChange?: (shift: Shift | null) => void;
  disabled?: boolean;
  currentSelectedShiftId?: string; // NEW: Prop to control which shift is selected
}

export const ShiftSelector = ({ userId, onShiftChange, disabled = false, currentSelectedShiftId }: ShiftSelectorProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAttendanceToday, setHasAttendanceToday] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const isWeekendDay = isWeekend(new Date());
  const dayType = isWeekendDay ? 'weekend' : 'weekday';

  useEffect(() => {
    fetchShifts();
    checkTodayAttendance();
  }, [userId]);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shift')
        .select('*')
        .eq('aktif', true)
        .or(`jenis_hari.eq.${dayType},jenis_hari.eq.all`)
        .order('jam_masuk');

      if (error) throw error;
      
      // Cast the data to match our interface
      const shiftsData = (data || []) as Shift[];
      setShifts(shiftsData);
      
      // REMOVED: Auto-selection logic since we now use controlled component
      // The parent component will handle which shift should be selected
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('absensi')
        .select('id')
        .eq('user_id', userId)
        .gte('waktu', `${today}T00:00:00.000Z`)
        .lt('waktu', `${today}T23:59:59.999Z`)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasAttendanceToday(true);
      }
    } catch (error) {
      console.log('Error checking attendance:', error);
    }
  };

  const handleShiftChange = async (shiftId: string) => {
    if (hasAttendanceToday) {
      toast({
        title: t('shift.cannotChangeAfterAttendance'),
        description: t('shift.cannotChangeAfterAttendance'),
        variant: "destructive",
      });
      return;
    }

    // REMOVED: setSelectedShift(shiftId); - no longer using internal state
    const selectedShiftData = shifts.find(s => s.id === shiftId);
    onShiftChange?.(selectedShiftData || null);

    toast({
      title: t('general.success'),
      description: `${t('shift.shiftChangedSuccess')} ${selectedShiftData?.nama_shift}!`,
    });
  };

  const getShiftStatus = (shift: Shift) => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const shiftStart = shift.jam_masuk;
    const shiftEnd = shift.jam_keluar;

    if (currentTime >= shiftStart && currentTime <= shiftEnd) {
      return { status: 'active', label: t('shift.status.active'), color: 'bg-green-100 text-green-800' };
    } else if (currentTime < shiftStart) {
      return { status: 'upcoming', label: t('shift.status.upcoming'), color: 'bg-blue-100 text-blue-800' };
    } else {
      return { status: 'ended', label: t('shift.status.ended'), color: 'bg-gray-100 text-gray-800' };
    }
  };

  // UPDATED: Get current shift from prop instead of internal state
  const currentShift = shifts.find(s => s.id === currentSelectedShiftId);

  const formatShiftTime = (shift: Shift) => {
    return `${shift.jam_masuk} - ${shift.jam_keluar}`;
  };

  const calculateShiftDuration = (shift: Shift) => {
    const start = new Date(`2000-01-01 ${shift.jam_masuk}`);
    const end = new Date(`2000-01-01 ${shift.jam_keluar}`);
    const duration = Math.abs(end.getTime() - start.getTime());
    const hours = Math.floor(duration / (1000 * 60 * 60));
    return `${hours} ${t('admin.hours')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const shiftStatus = currentShift ? getShiftStatus(currentShift) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('shift.todayShiftSelection')}
        </CardTitle>
        <CardDescription>
          {t('shift.chooseWorkingShift')} {format(new Date(), 'dd MMMM yyyy')} ({t(`dayType.${dayType}`)})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAttendanceToday && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('shift.cannotChangeAfterAttendance')}
            </AlertDescription>
          </Alert>
        )}

        {/* Shift Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('shift.selectShift')}</label>
          <Select 
            value={currentSelectedShiftId || undefined} // UPDATED: Use prop value
            onValueChange={handleShiftChange}
            disabled={disabled || hasAttendanceToday}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('shift.chooseShiftToday')} />
            </SelectTrigger>
            <SelectContent>
              {shifts.map((shift) => {
                const status = getShiftStatus(shift);
                return (
                  <SelectItem key={shift.id} value={shift.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{shift.nama_shift}</span>
                        <span className="text-xs text-gray-500">
                          {formatShiftTime(shift)} • {calculateShiftDuration(shift)}
                        </span>
                      </div>
                      <Badge className={`ml-2 text-xs ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Current Shift Info */}
        {currentShift && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {t('shift.currentShift')}: {currentShift.nama_shift}
              </h4>
              {shiftStatus && (
                <Badge className={shiftStatus.color}>
                  {shiftStatus.label}
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{t('shift.startTime')}:</span>
                <p className="font-medium">{currentShift.jam_masuk}</p>
              </div>
              <div>
                <span className="text-gray-600">{t('shift.endTime')}:</span>
                <p className="font-medium">{currentShift.jam_keluar}</p>
              </div>
              <div>
                <span className="text-gray-600">{t('shift.duration')}:</span>
                <p className="font-medium">{calculateShiftDuration(currentShift)}</p>
              </div>
              <div>
                <span className="text-gray-600">{t('shift.dayType')}:</span>
                <p className="font-medium">{t(`dayType.${currentShift.jenis_hari}`)}</p>
              </div>
            </div>

            {/* Shift Timeline */}
            <div className="space-y-2">
              <span className="text-sm text-gray-600">{t('shift.todayTimeline')}:</span>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{t('shift.start')}: {currentShift.jam_masuk}</span>
                </div>
                <div className="flex-1 h-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span>{t('shift.end')}: {currentShift.jam_keluar}</span>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <Button 
          variant="outline" 
          onClick={fetchShifts}
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('shift.refreshShifts')}
        </Button>
      </CardContent>
    </Card>
  );
};