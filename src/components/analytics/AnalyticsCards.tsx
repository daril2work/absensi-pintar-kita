import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  MapPin,
  Shield,
  Target,
  Activity,
  BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface AnalyticsData {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  monthlyAttendance: {
    present: number;
    late: number;
    absent: number;
    total: number;
  };
  attendanceRate: number;
  punctualityRate: number;
  riskLevels: {
    low: number;
    medium: number;
    high: number;
  };
  topLocations: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  trends: {
    attendanceChange: number;
    punctualityChange: number;
  };
}

export const AnalyticsCards = () => {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const currentMonth = {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      };
      const previousMonth = {
        start: startOfMonth(subMonths(new Date(), 1)),
        end: endOfMonth(subMonths(new Date(), 1))
      };

      // Fetch total employees
      const { data: employees } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'user');

      // Fetch today's attendance
      const { data: todayAttendance } = await supabase
        .from('absensi')
        .select('status, risk_level')
        .gte('waktu', `${today}T00:00:00.000Z`)
        .lt('waktu', `${today}T23:59:59.999Z`);

      // Fetch current month attendance
      const { data: currentMonthData } = await supabase
        .from('absensi')
        .select('status, risk_level, lokasi')
        .gte('waktu', currentMonth.start.toISOString())
        .lte('waktu', currentMonth.end.toISOString());

      // Fetch previous month for trends
      const { data: previousMonthData } = await supabase
        .from('absensi')
        .select('status')
        .gte('waktu', previousMonth.start.toISOString())
        .lte('waktu', previousMonth.end.toISOString());

      // Fetch location data with real attendance counts
      const { data: locations } = await supabase
        .from('lokasi_valid')
        .select('nama_lokasi, latitude, longitude');

      // Process data
      const totalEmployees = employees?.length || 0;
      
      // Today's stats
      const presentToday = todayAttendance?.filter(a => a.status === 'HADIR').length || 0;
      const lateToday = todayAttendance?.filter(a => a.status === 'TERLAMBAT').length || 0;
      const absentToday = totalEmployees - (presentToday + lateToday);

      // Monthly stats
      const monthlyPresent = currentMonthData?.filter(a => a.status === 'HADIR').length || 0;
      const monthlyLate = currentMonthData?.filter(a => a.status === 'TERLAMBAT').length || 0;
      const monthlyMakeup = currentMonthData?.filter(a => a.status === 'MAKE_UP').length || 0;
      const monthlyTotal = currentMonthData?.length || 0;

      // Risk levels
      const riskLow = currentMonthData?.filter(a => a.risk_level === 'low').length || 0;
      const riskMedium = currentMonthData?.filter(a => a.risk_level === 'medium').length || 0;
      const riskHigh = currentMonthData?.filter(a => a.risk_level === 'high').length || 0;

      // Calculate rates
      const attendanceRate = totalEmployees > 0 ? ((presentToday + lateToday) / totalEmployees) * 100 : 0;
      const punctualityRate = (presentToday + lateToday) > 0 ? (presentToday / (presentToday + lateToday)) * 100 : 0;

      // Calculate trends
      const prevMonthPresent = previousMonthData?.filter(a => a.status === 'HADIR').length || 0;
      const prevMonthLate = previousMonthData?.filter(a => a.status === 'TERLAMBAT').length || 0;
      const prevMonthTotal = previousMonthData?.length || 0;
      
      const prevAttendanceRate = prevMonthTotal > 0 ? ((prevMonthPresent + prevMonthLate) / prevMonthTotal) * 100 : 0;
      const prevPunctualityRate = (prevMonthPresent + prevMonthLate) > 0 ? (prevMonthPresent / (prevMonthPresent + prevMonthLate)) * 100 : 0;
      
      const currentAttendanceRate = monthlyTotal > 0 ? ((monthlyPresent + monthlyLate) / monthlyTotal) * 100 : 0;
      const currentPunctualityRate = (monthlyPresent + monthlyLate) > 0 ? (monthlyPresent / (monthlyPresent + monthlyLate)) * 100 : 0;

      // Calculate REAL top locations based on actual attendance data
      const locationStats = new Map<string, number>();
      
      // Count attendance per location
      currentMonthData?.forEach(record => {
        if (record.lokasi) {
          // Find the closest valid location for this attendance record
          const [lat, lng] = record.lokasi.split(',').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            let closestLocation = null;
            let minDistance = Infinity;
            
            locations?.forEach(location => {
              const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
              if (distance < minDistance) {
                minDistance = distance;
                closestLocation = location.nama_lokasi;
              }
            });
            
            if (closestLocation && minDistance < 1000) { // Within 1km
              locationStats.set(closestLocation, (locationStats.get(closestLocation) || 0) + 1);
            }
          }
        }
      });

      // Convert to sorted array and calculate percentages
      const totalLocationAttendance = Array.from(locationStats.values()).reduce((sum, count) => sum + count, 0);
      const topLocations = Array.from(locationStats.entries())
        .sort(([, a], [, b]) => b - a) // Sort by count descending
        .slice(0, 3) // Top 3 locations
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalLocationAttendance > 0 ? Math.round((count / totalLocationAttendance) * 100) : 0
        }));

      // If no location data, show message instead of dummy data
      if (topLocations.length === 0 && locations && locations.length > 0) {
        topLocations.push({
          name: t('analytics.noLocationData'),
          count: 0,
          percentage: 0
        });
      }

      setAnalytics({
        totalEmployees,
        presentToday,
        lateToday,
        absentToday,
        monthlyAttendance: {
          present: monthlyPresent,
          late: monthlyLate,
          absent: monthlyMakeup,
          total: monthlyTotal
        },
        attendanceRate,
        punctualityRate,
        riskLevels: {
          low: riskLow,
          medium: riskMedium,
          high: riskHigh
        },
        topLocations,
        trends: {
          attendanceChange: currentAttendanceRate - prevAttendanceRate,
          punctualityChange: currentPunctualityRate - prevPunctualityRate
        }
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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

  if (loading || !analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Today's Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('analytics.todayOverview')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Present Today */}
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">{t('analytics.presentToday')}</p>
                  <p className="text-2xl font-bold text-green-900">{analytics.presentToday}</p>
                  <p className="text-xs text-green-600">
                    {analytics.totalEmployees > 0 ? 
                      `${((analytics.presentToday / analytics.totalEmployees) * 100).toFixed(1)}% ${t('analytics.ofTotal')}` 
                      : '0%'
                    }
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Late Today */}
          <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">{t('analytics.lateToday')}</p>
                  <p className="text-2xl font-bold text-yellow-900">{analytics.lateToday}</p>
                  <p className="text-xs text-yellow-600">
                    {analytics.totalEmployees > 0 ? 
                      `${((analytics.lateToday / analytics.totalEmployees) * 100).toFixed(1)}% ${t('analytics.ofTotal')}` 
                      : '0%'
                    }
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Absent Today */}
          <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">{t('analytics.absentToday')}</p>
                  <p className="text-2xl font-bold text-red-900">{analytics.absentToday}</p>
                  <p className="text-xs text-red-600">
                    {analytics.totalEmployees > 0 ? 
                      `${((analytics.absentToday / analytics.totalEmployees) * 100).toFixed(1)}% ${t('analytics.ofTotal')}` 
                      : '0%'
                    }
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Employees */}
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">{t('analytics.totalEmployees')}</p>
                  <p className="text-2xl font-bold text-blue-900">{analytics.totalEmployees}</p>
                  <p className="text-xs text-blue-600">{t('analytics.activeUsers')}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          {t('analytics.performanceMetrics')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Attendance Rate */}
          <Card className="bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-purple-700">{t('analytics.attendanceRate')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-purple-900">
                      {analytics.attendanceRate.toFixed(1)}%
                    </p>
                    {getTrendIcon(analytics.trends.attendanceChange)}
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <Progress value={analytics.attendanceRate} className="h-2 mb-2" />
              <p className={`text-xs ${getTrendColor(analytics.trends.attendanceChange)}`}>
                {analytics.trends.attendanceChange > 0 ? '+' : ''}
                {analytics.trends.attendanceChange.toFixed(1)}% {t('analytics.fromLastMonth')}
              </p>
            </CardContent>
          </Card>

          {/* Punctuality Rate */}
          <Card className="bg-gradient-to-br from-indigo-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-indigo-700">{t('analytics.punctualityRate')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-indigo-900">
                      {analytics.punctualityRate.toFixed(1)}%
                    </p>
                    {getTrendIcon(analytics.trends.punctualityChange)}
                  </div>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <Clock className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <Progress value={analytics.punctualityRate} className="h-2 mb-2" />
              <p className={`text-xs ${getTrendColor(analytics.trends.punctualityChange)}`}>
                {analytics.trends.punctualityChange > 0 ? '+' : ''}
                {analytics.trends.punctualityChange.toFixed(1)}% {t('analytics.fromLastMonth')}
              </p>
            </CardContent>
          </Card>

          {/* Monthly Summary */}
          <Card className="bg-gradient-to-br from-teal-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-teal-700">{t('analytics.thisMonth')}</p>
                  <p className="text-2xl font-bold text-teal-900">{analytics.monthlyAttendance.total}</p>
                </div>
                <div className="p-3 bg-teal-100 rounded-full">
                  <Calendar className="h-6 w-6 text-teal-600" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">{t('dashboard.present')}: {analytics.monthlyAttendance.present}</span>
                  <span className="text-yellow-600">{t('dashboard.late')}: {analytics.monthlyAttendance.late}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600">Make-up: {analytics.monthlyAttendance.absent}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Security & Location Analytics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('analytics.securityLocationAnalytics')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Security Risk Levels */}
          <Card className="bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-600" />
                {t('analytics.securityRiskDistribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{t('analytics.lowRisk')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{analytics.riskLevels.low}</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {analytics.monthlyAttendance.total > 0 ? 
                        `${((analytics.riskLevels.low / analytics.monthlyAttendance.total) * 100).toFixed(1)}%` 
                        : '0%'
                      }
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">{t('analytics.mediumRisk')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{analytics.riskLevels.medium}</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {analytics.monthlyAttendance.total > 0 ? 
                        `${((analytics.riskLevels.medium / analytics.monthlyAttendance.total) * 100).toFixed(1)}%` 
                        : '0%'
                      }
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">{t('analytics.highRisk')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{analytics.riskLevels.high}</span>
                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                      {analytics.monthlyAttendance.total > 0 ? 
                        `${((analytics.riskLevels.high / analytics.monthlyAttendance.total) * 100).toFixed(1)}%` 
                        : '0%'
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Locations */}
          <Card className="bg-gradient-to-br from-cyan-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-cyan-600" />
                {t('analytics.popularLocations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topLocations.length > 0 ? (
                  analytics.topLocations.map((location, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{location.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {location.count} {t('analytics.checkIns')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={location.percentage} className="h-2 flex-1" />
                        <span className="text-xs text-gray-600 w-12">
                          {location.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('analytics.noLocationData')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};