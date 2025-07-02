import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Download, FileText, Filter, BarChart3, Clock, ChevronLeft, ChevronRight, Calendar, Camera, ExternalLink, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWeekend } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { AnalyticsCards } from '@/components/analytics/AnalyticsCards';

type AttendanceStatus = Database['public']['Enums']['attendance_status'];
type AttendanceMethod = Database['public']['Enums']['attendance_method'];

interface HoursSummary {
  userId: string;
  userName: string;
  workingDays: number;
  totalExpectedHours: number;
  totalActualHours: number;
  missingHours: number;
  overtimeHours: number;
  efficiency: number;
  averageHoursPerDay: number;
}

interface DailyHourData {
  date: string;
  expectedHours: number;
  actualHours: number;
  missingHours: number;
  hasAttendance: boolean;
  clockInTime?: string;
  clockOutTime?: string;
  status?: string;
}

interface UserDailyData {
  userId: string;
  userName: string;
  dailyData: Record<string, DailyHourData>;
  totalMissingHours: number;
  totalExpectedHours: number;
  totalActualHours: number;
  workingDays: number;
}

interface ValidLocation {
  id: string;
  nama_lokasi: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  aktif: boolean;
}

export const AttendanceReports = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [validLocations, setValidLocations] = useState<ValidLocation[]>([]);
  const [hoursSummary, setHoursSummary] = useState<HoursSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-01'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userId: 'all',
    status: 'all' as AttendanceStatus | 'all',
    method: 'all' as AttendanceMethod | 'all'
  });

  // Daily Grid State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [gridData, setGridData] = useState<UserDailyData[]>([]);
  const [workingDays, setWorkingDays] = useState<Date[]>([]);
  const [gridLoading, setGridLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchValidLocations();
    fetchAttendanceData();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [filters]);

  useEffect(() => {
    fetchGridData();
  }, [currentMonth, filters.userId]);

  // 📐 Function to calculate distance between two coordinates using Haversine formula
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

    return R * c; // distance in metres
  };

  // 📍 Function to get distance from user location to nearest valid location
  const getDistanceFromValidLocations = (lokasi: string | null): string => {
    if (!lokasi || validLocations.length === 0) return '-';
    
    try {
      // Parse user coordinates from "lat,lng" format
      const [userLat, userLng] = lokasi.split(',').map(Number);
      if (isNaN(userLat) || isNaN(userLng)) return 'Invalid coordinates';
      
      // Find the nearest valid location
      let nearestDistance = Infinity;
      let nearestLocationName = '';
      
      validLocations.forEach(location => {
        const distance = calculateDistance(
          userLat, 
          userLng, 
          location.latitude, 
          location.longitude
        );
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestLocationName = location.nama_lokasi;
        }
      });
      
      // Format distance display with location name
      const formattedDistance = nearestDistance < 1000 
        ? `${Math.round(nearestDistance)} m`
        : `${(nearestDistance / 1000).toFixed(2)} km`;
      
      return `${formattedDistance} dari ${nearestLocationName}`;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 'Error calculating';
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'user')
      .order('name');

    if (!error && data) {
      setUsers(data);
    }
  };

  const fetchValidLocations = async () => {
    const { data, error } = await supabase
      .from('lokasi_valid')
      .select('*')
      .eq('aktif', true)
      .order('nama_lokasi');

    if (!error && data) {
      setValidLocations(data);
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    
    let query = supabase
      .from('absensi')
      .select(`
        *,
        profiles:user_id (name),
        shift:shift_id (
          id,
          nama_shift,
          jam_masuk,
          jam_keluar
        )
      `)
      .gte('waktu', `${filters.startDate}T00:00:00.000Z`)
      .lte('waktu', `${filters.endDate}T23:59:59.999Z`)
      .order('waktu', { ascending: false });

    if (filters.userId && filters.userId !== 'all') {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    
    if (filters.method && filters.method !== 'all') {
      query = query.eq('metode', filters.method);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAttendance(data);
      calculateHoursSummary(data);
    }
    setLoading(false);
  };

  const fetchGridData = async () => {
    setGridLoading(true);
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get all days in month excluding weekends (assuming weekends are non-working days)
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDaysInMonth = allDays.filter(day => !isWeekend(day));
    setWorkingDays(workingDaysInMonth);

    // Fetch users
    let userQuery = supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'user')
      .order('name');

    if (filters.userId && filters.userId !== 'all') {
      userQuery = userQuery.eq('id', filters.userId);
    }

    const { data: users, error: usersError } = await userQuery;

    if (usersError || !users) {
      setGridLoading(false);
      return;
    }

    // Fetch attendance data for the month
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('absensi')
      .select(`
        *,
        profiles:user_id (name),
        shift:shift_id (
          id,
          nama_shift,
          jam_masuk,
          jam_keluar
        )
      `)
      .gte('waktu', monthStart.toISOString())
      .lte('waktu', monthEnd.toISOString())
      .order('waktu');

    if (attendanceError) {
      setGridLoading(false);
      return;
    }

    // Process data for each user
    const processedData: UserDailyData[] = users.map(user => {
      const userAttendance = (attendanceData || []).filter(record => record.user_id === user.id);
      const dailyData: Record<string, DailyHourData> = {};
      
      let totalMissingHours = 0;
      let totalExpectedHours = 0;
      let totalActualHours = 0;
      let workingDaysCount = 0;

      // Process each working day
      workingDaysInMonth.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayAttendance = userAttendance.filter(record => {
          const recordDate = format(new Date(record.waktu), 'yyyy-MM-dd');
          return recordDate === dateStr;
        });

        let expectedHours = 0;
        let actualHours = 0;
        let clockInTime = '';
        let clockOutTime = '';
        let status = '';

        dayAttendance.forEach(record => {
          if (record.shift && record.shift.jam_masuk && record.shift.jam_keluar) {
            // Calculate expected hours from shift
            expectedHours += calculateHoursDifference(
              record.shift.jam_masuk,
              record.shift.jam_keluar
            );

            // Set clock in time
            clockInTime = format(new Date(record.waktu), 'HH:mm');
            status = record.status;

            // Calculate actual hours ONLY if both check-in and check-out exist
            if (record.waktu && record.clock_out_time) {
              actualHours += calculateHoursDifference(
                format(new Date(record.waktu), 'HH:mm'),
                format(new Date(record.clock_out_time), 'HH:mm')
              );
              clockOutTime = format(new Date(record.clock_out_time), 'HH:mm');
            } else {
              // If no clock out, actual hours = 0 for this day
              actualHours = 0;
              clockOutTime = '';
            }
          }
        });

        const missingHours = Math.max(0, expectedHours - actualHours);
        const hasAttendance = dayAttendance.length > 0;

        if (hasAttendance) {
          workingDaysCount++;
          totalExpectedHours += expectedHours;
          totalActualHours += actualHours;
          totalMissingHours += missingHours;
        }

        dailyData[dateStr] = {
          date: dateStr,
          expectedHours: Math.round(expectedHours * 100) / 100,
          actualHours: Math.round(actualHours * 100) / 100,
          missingHours: Math.round(missingHours * 100) / 100,
          hasAttendance,
          clockInTime: clockInTime || undefined,
          clockOutTime: clockOutTime || undefined,
          status: status || undefined
        };
      });

      return {
        userId: user.id,
        userName: user.name,
        dailyData,
        totalMissingHours: Math.round(totalMissingHours * 100) / 100,
        totalExpectedHours: Math.round(totalExpectedHours * 100) / 100,
        totalActualHours: Math.round(totalActualHours * 100) / 100,
        workingDays: workingDaysCount
      };
    });

    setGridData(processedData);
    setGridLoading(false);
  };

  const calculateHoursSummary = (attendanceData: any[]) => {
    const userSummaries = new Map<string, HoursSummary>();

    // Group attendance by user
    const userAttendance = attendanceData.reduce((acc, record) => {
      const userId = record.user_id;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate summary for each user
    Object.entries(userAttendance).forEach(([userId, records]) => {
      const userName = records[0]?.profiles?.name || 'Unknown';
      let totalExpectedHours = 0;
      let totalActualHours = 0;
      let workingDays = 0;

      records.forEach(record => {
        if (record.shift && record.shift.jam_masuk && record.shift.jam_keluar) {
          workingDays++;
          
          // Calculate expected hours from shift
          const expectedHours = calculateHoursDifference(
            record.shift.jam_masuk,
            record.shift.jam_keluar
          );
          totalExpectedHours += expectedHours;

          // Calculate actual hours ONLY if both check-in and check-out exist
          if (record.waktu && record.clock_out_time) {
            const actualHours = calculateHoursDifference(
              format(new Date(record.waktu), 'HH:mm'),
              format(new Date(record.clock_out_time), 'HH:mm')
            );
            totalActualHours += actualHours;
          }
          // If no clock out, actual hours remain 0 for that day
        }
      });

      const missingHours = Math.max(0, totalExpectedHours - totalActualHours);
      const overtimeHours = Math.max(0, totalActualHours - totalExpectedHours);
      const efficiency = totalExpectedHours > 0 ? (totalActualHours / totalExpectedHours) * 100 : 0;
      const averageHoursPerDay = workingDays > 0 ? totalActualHours / workingDays : 0;

      userSummaries.set(userId, {
        userId,
        userName,
        workingDays,
        totalExpectedHours: Math.round(totalExpectedHours * 100) / 100,
        totalActualHours: Math.round(totalActualHours * 100) / 100,
        missingHours: Math.round(missingHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        efficiency: Math.round(efficiency * 100) / 100,
        averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100
      });
    });

    setHoursSummary(Array.from(userSummaries.values()));
  };

  const calculateHoursDifference = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  };

  const exportToCSV = () => {
    const headers = [
      t('general.name'), 
      t('admin.date'), 
      t('general.time'), 
      'Clock Out',
      'Jam Aktual',
      t('attendance.status'), 
      t('general.method'), 
      'Jarak dari Lokasi Valid',
      'Link Foto',
      t('admin.reason')
    ];
    
    const csvData = attendance.map(record => [
      record.profiles?.name || 'Unknown',
      format(new Date(record.waktu), 'yyyy-MM-dd'),
      format(new Date(record.waktu), 'HH:mm:ss'),
      record.clock_out_time ? format(new Date(record.clock_out_time), 'HH:mm:ss') : 'Belum Clock Out',
      record.clock_out_time ? calculateHoursDifference(
        format(new Date(record.waktu), 'HH:mm'),
        format(new Date(record.clock_out_time), 'HH:mm')
      ).toFixed(2) + ' jam' : '0 jam',
      t(`status.${record.status}`),
      record.metode === 'absen' ? t('admin.regular') : t('admin.makeup'),
      getDistanceFromValidLocations(record.lokasi),
      record.photo_url || 'Tidak ada foto',
      record.alasan || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('general.success'),
      description: t('admin.exportSuccess'),
    });
  };

  const exportHoursToCSV = () => {
    const headers = [
      'Nama',
      'Total Kekurangan Jam',
      'Hari Kerja',
      'Expected Hours (Target Jam)',
      'Actual Hours (Jam Aktual)',
      ...workingDays.map(date => format(date, 'd'))
    ];
    
    const csvData = gridData.map(user => {
      const row = [
        user.userName,
        user.totalMissingHours.toString(),
        user.workingDays.toString(),
        user.totalExpectedHours.toString(),
        user.totalActualHours.toString()
      ];
      
      // Add daily data
      workingDays.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = user.dailyData[dateStr];
        if (dayData && dayData.hasAttendance) {
          if (dayData.missingHours > 0) {
            row.push(`-${dayData.missingHours}h`);
          } else if (dayData.actualHours > 0) {
            row.push('✓');
          } else {
            row.push('No Clock Out');
          }
        } else {
          row.push('-');
        }
      });
      
      return row;
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hours-report-${format(currentMonth, 'yyyy-MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('general.success'),
      description: t('admin.exportSuccess'),
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'HADIR': 'default',
      'TERLAMBAT': 'secondary',
      'MAKE_UP': 'outline'
    };
    
    return <Badge variant={variants[status] || 'default'}>{t(`status.${status}`)}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    return (
      <Badge variant={method === 'absen' ? 'default' : 'outline'}>
        {method === 'absen' ? t('admin.regular') : t('admin.makeup')}
      </Badge>
    );
  };

  const getCellStyle = (dayData: DailyHourData) => {
    if (!dayData.hasAttendance) {
      return "bg-gray-100 text-gray-400";
    }

    if (dayData.missingHours > 0) {
      return "bg-red-100 text-red-800 border-red-200";
    }

    if (dayData.actualHours > 0) {
      return "bg-green-100 text-green-800 border-green-200";
    }

    // Has attendance but no clock out
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const getCellContent = (dayData: DailyHourData) => {
    if (!dayData.hasAttendance) {
      return "-";
    }

    if (dayData.missingHours > 0) {
      return `-${dayData.missingHours}h`;
    }

    if (dayData.actualHours > 0) {
      return "✓";
    }

    // Has attendance but no clock out
    return "⚠️";
  };

  const resetFilters = () => {
    setFilters({
      startDate: format(new Date(), 'yyyy-MM-01'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      userId: 'all',
      status: 'all',
      method: 'all'
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('admin.hoursReport')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detailed Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsCards />
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('admin.filterExport')}
              </CardTitle>
              <CardDescription>
                Laporan jam kerja dengan perhitungan clock in/out yang akurat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t('admin.startDate')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('admin.endDate')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('admin.employee')}</Label>
                  <Select value={filters.userId} onValueChange={(value) => setFilters({ ...filters, userId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.allEmployees')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin.allEmployees')}</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button variant="outline" onClick={resetFilters} className="w-full">
                    {t('admin.reset')}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={exportHoursToCSV} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Navigation for Grid */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-lg font-semibold min-w-[200px] text-center">
                    Grid Harian: {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-100 border border-red-200 rounded flex items-center justify-center text-red-800 text-xs font-bold">
                      -2h
                    </div>
                    <span>Kurang Jam</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-100 border border-green-200 rounded flex items-center justify-center text-green-800 text-xs font-bold">
                      ✓
                    </div>
                    <span>Lengkap</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-100 border border-yellow-200 rounded flex items-center justify-center text-yellow-800 text-xs font-bold">
                      ⚠️
                    </div>
                    <span>Belum Clock Out</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                      -
                    </div>
                    <span>Tidak Absen</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrated Hours Summary and Daily Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Laporan Jam Kerja & Grid Harian (Clock In/Out)
              </CardTitle>
              <CardDescription>
                Ringkasan jam kerja dengan detail harian per karyawan. 
                <strong> Expected</strong> = Target jam kerja berdasarkan shift yang dijadwalkan.
                <strong> Actual</strong> = Jam kerja aktual berdasarkan clock in dan clock out.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {gridLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {/* Summary Columns */}
                        <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r">
                          Nama Karyawan
                        </th>
                        <th className="px-3 py-3 text-center text-sm font-semibold text-gray-900 border-r min-w-[100px]">
                          Total Kurang
                        </th>
                        <th className="px-3 py-3 text-center text-sm font-semibold text-gray-900 border-r min-w-[80px]">
                          Hari Kerja
                        </th>
                        <th className="px-3 py-3 text-center text-sm font-semibold text-gray-900 border-r min-w-[100px]">
                          <div>Expected</div>
                          <div className="text-xs font-normal text-gray-600">(Target Jam)</div>
                        </th>
                        <th className="px-3 py-3 text-center text-sm font-semibold text-gray-900 border-r min-w-[90px]">
                          <div>Actual</div>
                          <div className="text-xs font-normal text-gray-600">(Jam Aktual)</div>
                        </th>
                        
                        {/* Daily Grid Columns */}
                        {workingDays.map(date => (
                          <th key={format(date, 'yyyy-MM-dd')} className="px-2 py-3 text-center text-sm font-semibold text-gray-900 border-r min-w-[50px]">
                            <div>{format(date, 'd')}</div>
                            <div className="text-xs text-gray-500 font-normal">
                              {format(date, 'EEE')}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {gridData.map((user) => (
                        <tr key={user.userId} className="hover:bg-gray-50">
                          {/* Summary Data */}
                          <td className="sticky left-0 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r">
                            {user.userName}
                          </td>
                          <td className="px-3 py-3 text-center border-r">
                            {user.totalMissingHours > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                -{user.totalMissingHours}h
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-xs">
                                0h
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-gray-900 border-r">
                            {user.workingDays}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-gray-900 border-r">
                            <span className="font-mono">{user.totalExpectedHours}h</span>
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-gray-900 border-r">
                            <span className="font-mono">{user.totalActualHours}h</span>
                          </td>
                          
                          {/* Daily Grid Data */}
                          {workingDays.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const dayData = user.dailyData[dateStr];
                            return (
                              <td key={dateStr} className="px-2 py-3 text-center border-r">
                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-medium border ${getCellStyle(dayData)}`}>
                                  {getCellContent(dayData)}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan {format(currentMonth, 'MMMM yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {gridData.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Karyawan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {gridData.reduce((sum, user) => sum + user.totalMissingHours, 0).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Total Kekurangan Jam</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {gridData.filter(user => user.totalMissingHours === 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Karyawan Tanpa Kekurangan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {workingDays.length}
                  </div>
                  <div className="text-sm text-gray-600">Hari Kerja</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('admin.filterExport')}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                {t('admin.filterAttendanceData')} - Termasuk jarak dari lokasi valid yang dikonfigurasi dan foto absensi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t('admin.startDate')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('admin.endDate')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('admin.employee')}</Label>
                  <Select value={filters.userId} onValueChange={(value) => setFilters({ ...filters, userId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.allEmployees')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin.allEmployees')}</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('attendance.status')}</Label>
                  <Select value={filters.status} onValueChange={(value: AttendanceStatus | 'all') => setFilters({ ...filters, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.allStatuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
                      <SelectItem value="HADIR">{t('status.HADIR')}</SelectItem>
                      <SelectItem value="TERLAMBAT">{t('status.TERLAMBAT')}</SelectItem>
                      <SelectItem value="MAKE_UP">{t('status.MAKE_UP')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('general.method')}</Label>
                  <Select value={filters.method} onValueChange={(value: AttendanceMethod | 'all') => setFilters({ ...filters, method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.allMethods')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin.allMethods')}</SelectItem>
                      <SelectItem value="absen">{t('admin.regular')}</SelectItem>
                      <SelectItem value="make-up">{t('admin.makeup')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={resetFilters} className="flex-1">
                      {t('admin.reset')}
                    </Button>
                    <Button onClick={exportToCSV} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      {t('admin.csv')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valid Locations Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-900">Lokasi Valid yang Dikonfigurasi ({validLocations.length} lokasi)</div>
                    <div className="text-xs text-blue-600 mt-1">
                      💡 Jarak dihitung dari lokasi absensi user ke lokasi valid terdekat menggunakan formula Haversine
                    </div>
                  </div>
                </div>
                
                {validLocations.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {validLocations.map((location) => (
                      <div key={location.id} className="bg-white p-3 rounded border border-blue-200">
                        <div className="font-medium text-blue-900">{location.nama_lokasi}</div>
                        <div className="text-sm text-blue-700">
                          📍 {location.latitude}, {location.longitude}
                        </div>
                        <div className="text-xs text-blue-600">
                          📏 Radius: {location.radius_meter}m
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Report Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t('admin.attendanceReport')}
                  </CardTitle>
                  <CardDescription>
                    {attendance.length} {t('admin.recordsFound')} - Dengan jarak dari lokasi valid terdekat dan foto absensi
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.employee')}</TableHead>
                        <TableHead>{t('admin.date')}</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Jam Aktual</TableHead>
                        <TableHead>{t('attendance.status')}</TableHead>
                        <TableHead>{t('general.method')}</TableHead>
                        <TableHead className="min-w-[180px]">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            Jarak dari Lokasi Valid
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <Camera className="h-4 w-4 text-green-600" />
                            Foto Absensi
                          </div>
                        </TableHead>
                        <TableHead>{t('admin.reason')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.profiles?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.waktu), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.waktu), 'HH:mm')}
                          </TableCell>
                          <TableCell>
                            {record.clock_out_time ? (
                              format(new Date(record.clock_out_time), 'HH:mm')
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Belum Clock Out
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.clock_out_time ? (
                              <span className="font-mono">
                                {calculateHoursDifference(
                                  format(new Date(record.waktu), 'HH:mm'),
                                  format(new Date(record.clock_out_time), 'HH:mm')
                                ).toFixed(2)}h
                              </span>
                            ) : (
                              <span className="text-gray-400">0h</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record.status)}
                          </TableCell>
                          <TableCell>
                            {getMethodBadge(record.metode)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-blue-500" />
                              <span className="text-sm font-mono">
                                {getDistanceFromValidLocations(record.lokasi)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.photo_url ? (
                              <div className="flex items-center gap-2">
                                <Camera className="h-4 w-4 text-green-600" />
                                <a 
                                  href={record.photo_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                >
                                  Lihat Foto
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-400">
                                <Camera className="h-4 w-4" />
                                <span className="text-sm">Tidak ada foto</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate text-sm">
                              {record.alasan || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};