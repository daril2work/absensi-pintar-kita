
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
import { Download, FileText, Filter, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { AnalyticsCards } from '@/components/analytics/AnalyticsCards';

type AttendanceStatus = Database['public']['Enums']['attendance_status'];
type AttendanceMethod = Database['public']['Enums']['attendance_method'];

export const AttendanceReports = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
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
        profiles:user_id (name)
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
    }
    setLoading(false);
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detailed Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsCards />
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
