import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Target,
  Activity
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

interface MonthlyStats {
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  makeUp: number;
  attendanceRate: number;
  punctualityRate: number;
}

interface YearlyStats {
  totalWorkingDays: number;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  totalMakeUp: number;
  averageAttendanceRate: number;
  averagePunctualityRate: number;
}

interface TrendData {
  currentMonth: MonthlyStats;
  previousMonth: MonthlyStats;
  yearlyStats: YearlyStats;
  attendanceChange: number;
  punctualityChange: number;
}

interface DashboardStatsProps {
  userId: string;
}

export const DashboardStats = ({ userId }: DashboardStatsProps) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserStats();
    }
  }, [userId]);

  const fetchUserStats = async () => {
    setLoading(true);
    
    try {
      const now = new Date();
      const currentMonth = {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
      const previousMonth = {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1))
      };
      const currentYear = {
        start: startOfYear(now),
        end: endOfYear(now)
      };

      // Fetch current month data
      const { data: currentMonthData } = await supabase
        .from('absensi')
        .select('status, waktu')
        .eq('user_id', userId)
        .gte('waktu', currentMonth.start.toISOString())
        .lte('waktu', currentMonth.end.toISOString());

      // Fetch previous month data
      const { data: previousMonthData } = await supabase
        .from('absensi')
        .select('status, waktu')
        .eq('user_id', userId)
        .gte('waktu', previousMonth.start.toISOString())
        .lte('waktu', previousMonth.end.toISOString());

      // Fetch yearly data
      const { data: yearlyData } = await supabase
        .from('absensi')
        .select('status, waktu')
        .eq('user_id', userId)
        .gte('waktu', currentYear.start.toISOString())
        .lte('waktu', currentYear.end.toISOString());

      // Calculate current month stats
      const currentStats = calculateMonthlyStats(currentMonthData || [], currentMonth.start, currentMonth.end);
      
      // Calculate previous month stats
      const previousStats = calculateMonthlyStats(previousMonthData || [], previousMonth.start, previousMonth.end);
      
      // Calculate yearly stats
      const yearlyStats = calculateYearlyStats(yearlyData || [], currentYear.start, currentYear.end);

      // Calculate trends
      const attendanceChange = currentStats.attendanceRate - previousStats.attendanceRate;
      const punctualityChange = currentStats.punctualityRate - previousStats.punctualityRate;

      setStats({
        currentMonth: currentStats,
        previousMonth: previousStats,
        yearlyStats,
        attendanceChange,
        punctualityChange
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (data: any[], startDate: Date, endDate: Date): MonthlyStats => {
    const present = data.filter(record => record.status === 'HADIR').length;
    const late = data.filter(record => record.status === 'TERLAMBAT').length;
    const makeUp = data.filter(record => record.status === 'MAKE_UP').length;
    const totalRecords = data.length;
    
    // Calculate working days in the month (excluding weekends)
    const totalWorkingDays = getWorkingDaysInRange(startDate, endDate);
    const absent = Math.max(0, totalWorkingDays - totalRecords);
    
    const attendanceRate = totalWorkingDays > 0 ? ((present + late + makeUp) / totalWorkingDays) * 100 : 0;
    const punctualityRate = (present + late + makeUp) > 0 ? (present / (present + late + makeUp)) * 100 : 0;

    return {
      totalDays: totalWorkingDays,
      present,
      late,
      absent,
      makeUp,
      attendanceRate,
      punctualityRate
    };
  };

  const calculateYearlyStats = (data: any[], startDate: Date, endDate: Date): YearlyStats => {
    const totalPresent = data.filter(record => record.status === 'HADIR').length;
    const totalLate = data.filter(record => record.status === 'TERLAMBAT').length;
    const totalMakeUp = data.filter(record => record.status === 'MAKE_UP').length;
    const totalRecords = data.length;
    
    const totalWorkingDays = getWorkingDaysInRange(startDate, endDate);
    const totalAbsent = Math.max(0, totalWorkingDays - totalRecords);
    
    const averageAttendanceRate = totalWorkingDays > 0 ? ((totalPresent + totalLate + totalMakeUp) / totalWorkingDays) * 100 : 0;
    const averagePunctualityRate = (totalPresent + totalLate + totalMakeUp) > 0 ? (totalPresent / (totalPresent + totalLate + totalMakeUp)) * 100 : 0;

    return {
      totalWorkingDays,
      totalPresent,
      totalLate,
      totalAbsent,
      totalMakeUp,
      averageAttendanceRate,
      averagePunctualityRate
    };
  };

  const getWorkingDaysInRange = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Count Monday to Friday (1-5) as working days
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('dashboard.thisMonth')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('dashboard.thisMonth')} - {format(new Date(), 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('dashboard.totalDays')}</span>
              <span className="font-medium">{stats.currentMonth.totalDays}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {t('dashboard.present')}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-600">{stats.currentMonth.present}</span>
                <Badge variant="outline" className="text-xs">
                  {stats.currentMonth.totalDays > 0 ? 
                    `${((stats.currentMonth.present / stats.currentMonth.totalDays) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                {t('dashboard.late')}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-yellow-600">{stats.currentMonth.late}</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.currentMonth.totalDays > 0 ? 
                    `${((stats.currentMonth.late / stats.currentMonth.totalDays) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                {t('dashboard.absent')}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-red-600">{stats.currentMonth.absent}</span>
                <Badge variant="destructive" className="text-xs">
                  {stats.currentMonth.totalDays > 0 ? 
                    `${((stats.currentMonth.absent / stats.currentMonth.totalDays) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Make-up
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-600">{stats.currentMonth.makeUp}</span>
                <Badge variant="outline" className="text-xs">
                  {stats.currentMonth.totalDays > 0 ? 
                    `${((stats.currentMonth.makeUp / stats.currentMonth.totalDays) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Attendance Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Attendance Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {stats.currentMonth.attendanceRate.toFixed(1)}%
                </span>
                {getTrendIcon(stats.attendanceChange)}
              </div>
            </div>
            <Progress value={stats.currentMonth.attendanceRate} className="h-2" />
            <p className={`text-xs ${getTrendColor(stats.attendanceChange)}`}>
              {stats.attendanceChange > 0 ? '+' : ''}
              {stats.attendanceChange.toFixed(1)}% from last month
            </p>
          </div>

          {/* Punctuality Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Punctuality Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {stats.currentMonth.punctualityRate.toFixed(1)}%
                </span>
                {getTrendIcon(stats.punctualityChange)}
              </div>
            </div>
            <Progress value={stats.currentMonth.punctualityRate} className="h-2" />
            <p className={`text-xs ${getTrendColor(stats.punctualityChange)}`}>
              {stats.punctualityChange > 0 ? '+' : ''}
              {stats.punctualityChange.toFixed(1)}% from last month
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {format(new Date(), 'yyyy')} Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Working Days:</span>
                <span className="font-medium">{stats.yearlyStats.totalWorkingDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Present:</span>
                <span className="font-medium text-green-600">{stats.yearlyStats.totalPresent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Late:</span>
                <span className="font-medium text-yellow-600">{stats.yearlyStats.totalLate}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Absent:</span>
                <span className="font-medium text-red-600">{stats.yearlyStats.totalAbsent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Make-up:</span>
                <span className="font-medium text-blue-600">{stats.yearlyStats.totalMakeUp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Rate:</span>
                <span className="font-medium">{stats.yearlyStats.averageAttendanceRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};