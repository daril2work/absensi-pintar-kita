import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface DayData {
  date: Date;
  expectedHours: number;
  actualHours: number;
  missingHours: number;
  overtimeHours: number;
  hasAttendance: boolean;
  status: 'complete' | 'missing' | 'overtime' | 'no-attendance';
  attendanceRecords: any[];
}

interface HoursCalendarViewProps {
  selectedUserId: string;
  startDate: string;
  endDate: string;
}

export const HoursCalendarView = ({ selectedUserId, startDate, endDate }: HoursCalendarViewProps) => {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(selectedUserId);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedUser !== 'all') {
      fetchCalendarData();
    }
  }, [currentMonth, selectedUser]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'user')
      .order('name');

    if (!error && data) {
      setUsers(data);
      if (!selectedUser || selectedUser === 'all') {
        setSelectedUser(data[0]?.id || '');
      }
    }
  };

  const fetchCalendarData = async () => {
    if (!selectedUser || selectedUser === 'all') return;
    
    setLoading(true);
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Fetch attendance data for the month
    const { data: attendanceData, error } = await supabase
      .from('absensi')
      .select(`
        *,
        shift:shift_id (
          id,
          nama_shift,
          jam_masuk,
          jam_keluar
        )
      `)
      .eq('user_id', selectedUser)
      .gte('waktu', monthStart.toISOString())
      .lte('waktu', monthEnd.toISOString())
      .order('waktu');

    if (error) {
      console.error('Error fetching calendar data:', error);
      setLoading(false);
      return;
    }

    // Create calendar grid (including days from previous/next month to fill the grid)
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Process data for each day
    const processedData: DayData[] = calendarDays.map(date => {
      const dayAttendance = (attendanceData || []).filter(record => {
        const recordDate = format(new Date(record.waktu), 'yyyy-MM-dd');
        const currentDate = format(date, 'yyyy-MM-dd');
        return recordDate === currentDate;
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
      const overtimeHours = Math.max(0, actualHours - expectedHours);
      const hasAttendance = dayAttendance.length > 0;

      let status: DayData['status'] = 'no-attendance';
      if (hasAttendance) {
        if (missingHours > 0) {
          status = 'missing';
        } else if (overtimeHours > 0) {
          status = 'overtime';
        } else {
          status = 'complete';
        }
      }

      return {
        date,
        expectedHours: Math.round(expectedHours * 100) / 100,
        actualHours: Math.round(actualHours * 100) / 100,
        missingHours: Math.round(missingHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        hasAttendance,
        status,
        attendanceRecords: dayAttendance
      };
    });

    setCalendarData(processedData);
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

  const getDayStyle = (dayData: DayData) => {
    const isCurrentMonth = isSameMonth(dayData.date, currentMonth);
    const baseClasses = "min-h-[80px] p-2 border border-gray-200 relative";
    
    if (!isCurrentMonth) {
      return `${baseClasses} bg-gray-50 text-gray-400`;
    }

    switch (dayData.status) {
      case 'missing':
        return `${baseClasses} bg-red-50 border-red-200`;
      case 'overtime':
        return `${baseClasses} bg-green-50 border-green-200`;
      case 'complete':
        return `${baseClasses} bg-blue-50 border-blue-200`;
      default:
        return `${baseClasses} bg-white`;
    }
  };

  const getStatusIndicator = (dayData: DayData) => {
    if (!dayData.hasAttendance) return null;

    switch (dayData.status) {
      case 'missing':
        return (
          <div className="text-red-600 text-xs font-medium">
            -{dayData.missingHours}h
          </div>
        );
      case 'overtime':
        return (
          <div className="text-green-600 text-xs font-medium">
            +{dayData.overtimeHours}h
          </div>
        );
      case 'complete':
        return (
          <div className="text-blue-600 text-xs font-medium">
            ✓ {dayData.actualHours}h
          </div>
        );
      default:
        return null;
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthlyStats = calendarData
    .filter(day => isSameMonth(day.date, currentMonth) && day.hasAttendance)
    .reduce(
      (acc, day) => ({
        totalExpected: acc.totalExpected + day.expectedHours,
        totalActual: acc.totalActual + day.actualHours,
        totalMissing: acc.totalMissing + day.missingHours,
        totalOvertime: acc.totalOvertime + day.overtimeHours,
        workingDays: acc.workingDays + 1
      }),
      { totalExpected: 0, totalActual: 0, totalMissing: 0, totalOvertime: 0, workingDays: 0 }
    );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('admin.hoursReport')} - Calendar View
          </CardTitle>
          <CardDescription>
            Daily working hours analysis with visual indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
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
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span>Missing Hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span>Overtime</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span>Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
              <span>No Attendance</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Monthly Summary - {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{monthlyStats.workingDays}</div>
              <div className="text-sm text-gray-600">Working Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{monthlyStats.totalExpected.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Expected Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{monthlyStats.totalActual.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Actual Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">-{monthlyStats.totalMissing.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Missing Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+{monthlyStats.totalOvertime.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Overtime Hours</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {weekDays.map(day => (
                  <div key={day} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-gray-600 text-sm">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarData.map((dayData, index) => (
                  <div key={index} className={getDayStyle(dayData)}>
                    <div className="flex flex-col h-full">
                      <div className="text-sm font-medium mb-1">
                        {format(dayData.date, 'd')}
                      </div>
                      
                      {dayData.hasAttendance && (
                        <div className="flex-1 space-y-1">
                          <div className="text-xs text-gray-600">
                            {dayData.expectedHours}h expected
                          </div>
                          <div className="text-xs text-gray-800 font-medium">
                            {dayData.actualHours}h actual
                          </div>
                          {getStatusIndicator(dayData)}
                        </div>
                      )}

                      {!dayData.hasAttendance && isSameMonth(dayData.date, currentMonth) && (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-xs text-gray-400">No data</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};