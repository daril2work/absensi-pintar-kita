
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Filter } from 'lucide-react';
import { format } from 'date-fns';

export const AttendanceReports = () => {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-01'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userId: '',
    status: '',
    method: ''
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

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.method) {
      query = query.eq('metode', filters.method);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAttendance(data);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Date', 'Time', 'Status', 'Method', 'Location', 'Reason'];
    const csvData = attendance.map(record => [
      record.profiles?.name || 'Unknown',
      format(new Date(record.waktu), 'yyyy-MM-dd'),
      format(new Date(record.waktu), 'HH:mm:ss'),
      record.status,
      record.metode,
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
      title: "Success",
      description: "Report exported successfully!",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'HADIR': 'default',
      'TERLAMBAT': 'secondary',
      'MAKE_UP': 'outline'
    };
    
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    return (
      <Badge variant={method === 'absen' ? 'default' : 'outline'}>
        {method === 'absen' ? 'Regular' : 'Make-up'}
      </Badge>
    );
  };

  const resetFilters = () => {
    setFilters({
      startDate: format(new Date(), 'yyyy-MM-01'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      userId: '',
      status: '',
      method: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Export
          </CardTitle>
          <CardDescription>
            Filter attendance data and export reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={filters.userId} onValueChange={(value) => setFilters({ ...filters, userId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All employees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="HADIR">HADIR</SelectItem>
                  <SelectItem value="TERLAMBAT">TERLAMBAT</SelectItem>
                  <SelectItem value="MAKE_UP">MAKE_UP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={filters.method} onValueChange={(value) => setFilters({ ...filters, method: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All methods</SelectItem>
                  <SelectItem value="absen">Regular</SelectItem>
                  <SelectItem value="make-up">Make-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFilters} className="flex-1">
                  Reset
                </Button>
                <Button onClick={exportToCSV} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  CSV
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
                Attendance Report
              </CardTitle>
              <CardDescription>
                {attendance.length} records found
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
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reason</TableHead>
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
    </div>
  );
};
