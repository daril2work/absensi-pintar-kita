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
import { Download, FileText, Filter, BarChart3, Clock, Calendar, Grid3X3 } from 'lucide-react';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { AnalyticsCards } from '@/components/analytics/AnalyticsCards';
import { DailyHoursGrid } from '@/components/admin/DailyHoursGrid';

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

export const AttendanceReports = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [hoursSummary, setHoursSummary] = useState<HoursSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-01'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userId: 'all',
    status: 'all' as AttendanceStatus | 'all',
    method: 'all' as AttendanceMethod | 'all'
  });

  useEffect(() => {
    fetchUsers();
    fetchAttendanceData();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [filters]);

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

          // Calculate actual hours if both check-in and check-out exist
          if (record.waktu && record.clock_out_time) {
            const actualHours = calculateHoursDifference(
              format(new Date(record.waktu), 'HH:mm'),
              format(new Date(record.clock_out_time), 'HH:mm')
            );
            totalActualHours += actualHours;
          }
          // If no clock out, consider it as incomplete (0 actual hours for that day)
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
    const headers = [t('general.name'), t('admin.date'), t('general.time'), t('attendance.status'), t('general.method'), t('general.location'), t('admin.reason')];
    const csvData = attendance.map(record => [
      record.profiles?.name || 'Unknown',
      format(new Date(record.waktu), 'yyyy-MM-dd'),
      format(new Date(record.waktu), 'HH:mm:ss'),
      t(`status.${record.status}`),
      record.metode === 'absen' ? t('admin.regular') : t('admin.makeup'),
      record.lokasi || '',
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
      t('general.name'),
      t('admin.workingDays'),
      t('admin.totalExpectedHours'),
      t('admin.totalActualHours'),
      t('admin.missingHours'),
      t('admin.overtimeHours'),
      t('admin.averageHoursPerDay'),
      t('admin.hoursEfficiency') + ' (%)'
    ];
    
    const csvData = hoursSummary.map(summary => [
      summary.userName,
      summary.workingDays.toString(),
      summary.totalExpectedHours.toString(),
      summary.totalActualHours.toString(),
      summary.missingHours.toString(),
      summary.overtimeHours.toString(),
      summary.averageHoursPerDay.toString(),
      summary.efficiency.toString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hours-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 90) return <Badge variant="default">{efficiency}%</Badge>;
    if (efficiency >= 75) return <Badge variant="secondary">{efficiency}%</Badge>;
    return <Badge variant="destructive">{efficiency}%</Badge>;
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('admin.hoursReport')}
          </TabsTrigger>
          <TabsTrigger value="daily-grid" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Grid Harian
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
                {t('admin.hoursReportDescription')}
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
                    {t('admin.csv')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hours Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('admin.employeeHoursSummary')}
              </CardTitle>
              <CardDescription>
                {hoursSummary.length} {t('admin.employee').toLowerCase()} ditemukan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.employee')}</TableHead>
                        <TableHead className="text-center">{t('admin.workingDays')}</TableHead>
                        <TableHead className="text-center">{t('admin.expectedHours')}</TableHead>
                        <TableHead className="text-center">{t('admin.actualHours')}</TableHead>
                        <TableHead className="text-center">{t('admin.missingHours')}</TableHead>
                        <TableHead className="text-center">{t('admin.overtimeHours')}</TableHead>
                        <TableHead className="text-center">{t('admin.averageHoursPerDay')}</TableHead>
                        <TableHead className="text-center">{t('admin.hoursEfficiency')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hoursSummary.map((summary) => (
                        <TableRow key={summary.userId}>
                          <TableCell className="font-medium">
                            {summary.userName}
                          </TableCell>
                          <TableCell className="text-center">
                            {summary.workingDays}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono">{summary.totalExpectedHours}h</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono">{summary.totalActualHours}h</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {summary.missingHours > 0 ? (
                              <span className="font-mono text-red-600">-{summary.missingHours}h</span>
                            ) : (
                              <span className="text-gray-400">0h</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {summary.overtimeHours > 0 ? (
                              <span className="font-mono text-green-600">+{summary.overtimeHours}h</span>
                            ) : (
                              <span className="text-gray-400">0h</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono">{summary.averageHoursPerDay}h</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getEfficiencyBadge(summary.efficiency)}
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

        <TabsContent value="daily-grid">
          <DailyHoursGrid 
            startDate={filters.startDate}
            endDate={filters.endDate}
            selectedUserId={filters.userId}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('admin.filterExport')}
              </CardTitle>
              <CardDescription>
                {t('admin.filterAttendanceData')}
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
                    {attendance.length} {t('admin.recordsFound')}
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
                        <TableHead>{t('general.time')}</TableHead>
                        <TableHead>{t('attendance.status')}</TableHead>
                        <TableHead>{t('general.method')}</TableHead>
                        <TableHead>{t('general.location')}</TableHead>
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
                            {getStatusBadge(record.status)}
                          </TableCell>
                          <TableCell>
                            {getMethodBadge(record.metode)}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate text-sm">
                              {record.lokasi || '-'}
                            </div>
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