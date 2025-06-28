import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWeekend } from 'date-fns';

interface DailyHourData {
  date: string;
  expectedHours: number;
  actualHours: number;
  missingHours: number;
  hasAttendance: boolean;
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

interface DailyHoursGridProps {
  startDate: string;
  endDate: string;
  selectedUserId: string;
}

export const DailyHoursGrid = ({ startDate, endDate, selectedUserId }: DailyHoursGridProps) => {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [gridData, setGridData] = useState<UserDailyData[]>([]);
  const [workingDays, setWorkingDays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGridData();
  }, [currentMonth, selectedUserId]);

  const fetchGridData = async () => {
    setLoading(true);
    
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

    if (selectedUserId && selectedUserId !== 'all') {
      userQuery = userQuery.eq('id', selectedUserId);
    }

    const { data: users, error: usersError } = await userQuery;

    if (usersError || !users) {
      setLoading(false);
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
      setLoading(false);
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

        dayAttendance.forEach(record => {
          if (record.shift && record.shift.jam_masuk && record.shift.jam_keluar) {
            // Calculate expected hours from shift
            expectedHours += calculateHoursDifference(
              record.shift.jam_masuk,
              record.shift.jam_keluar
            );

            // Calculate actual hours if both check-in and check-out exist
            if (record.waktu && record.clock_out_time) {
              actualHours += calculateHoursDifference(
                format(new Date(record.waktu), 'HH:mm'),
                format(new Date(record.clock_out_time), 'HH:mm')
              );
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
          hasAttendance
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
    setLoading(false);
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

  const getCellStyle = (dayData: DailyHourData) => {
    if (!dayData.hasAttendance) {
      return "bg-gray-100 text-gray-400";
    }

    if (dayData.missingHours > 0) {
      return "bg-red-100 text-red-800 border-red-200";
    }

    return "bg-green-100 text-green-800 border-green-200";
  };

  const getCellContent = (dayData: DailyHourData) => {
    if (!dayData.hasAttendance) {
      return "-";
    }

    if (dayData.missingHours > 0) {
      return `-${dayData.missingHours}h`;
    }

    return "✓";
  };

  const exportGridToCSV = () => {
    const headers = ['Nama', 'Total Kekurangan Jam', 'Hari Kerja', ...workingDays.map(date => format(date, 'd'))];
    
    const csvData = gridData.map(user => {
      const row = [
        user.userName,
        user.totalMissingHours.toString(),
        user.workingDays.toString()
      ];
      
      // Add daily data
      workingDays.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = user.dailyData[dateStr];
        if (dayData && dayData.hasAttendance) {
          if (dayData.missingHours > 0) {
            row.push(`-${dayData.missingHours}h`);
          } else {
            row.push('✓');
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
    link.setAttribute('download', `daily-hours-grid-${format(currentMonth, 'yyyy-MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Laporan Harian Jam Kerja
          </CardTitle>
          <CardDescription>
            Grid harian menampilkan kekurangan jam kerja per karyawan per tanggal
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={exportGridToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 border border-red-200 rounded flex items-center justify-center text-red-800 text-xs font-bold">
                -2h
              </div>
              <span>Kekurangan Jam</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 border border-green-200 rounded flex items-center justify-center text-green-800 text-xs font-bold">
                ✓
              </div>
              <span>Jam Lengkap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                -
              </div>
              <span>Tidak Absen</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
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
                    <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r">
                      Nama Karyawan
                    </th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-900 border-r min-w-[120px]">
                      Total Kurang Jam
                    </th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-900 border-r">
                      Hari Kerja
                    </th>
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
    </div>
  );
};