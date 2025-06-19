
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';

interface AttendanceHistoryProps {
  userId?: string;
}

export const AttendanceHistory = ({ userId }: AttendanceHistoryProps) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAttendanceHistory();
    }
  }, [userId]);

  const fetchAttendanceHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .eq('user_id', userId)
      .order('waktu', { ascending: false })
      .limit(10);

    if (!error && data) {
      setAttendance(data);
    }
    setLoading(false);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recent Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attendance.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No attendance records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
