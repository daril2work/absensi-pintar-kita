import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LogOut, Users, MapPin, Clock, FileText, Settings, Smartphone } from 'lucide-react';
import { LocationManagement } from '@/components/admin/LocationManagement';
import { ShiftManagement } from '@/components/admin/ShiftManagement';
import { MakeupRequests } from '@/components/admin/MakeupRequests';
import { AttendanceReports } from '@/components/admin/AttendanceReports';
import { UserManagement } from '@/components/admin/UserManagement';
import { DeviceManagement } from '@/components/admin/DeviceManagement';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function Admin() {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
              <p className="text-gray-600">{t('admin.welcomeBack')}, {profile?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                {t('auth.signOut')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('admin.reports')}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('admin.users')}
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('admin.locations')}
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('admin.shifts')}
            </TabsTrigger>
            <TabsTrigger value="makeup" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('admin.makeupRequests')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <AttendanceReports />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="devices">
            <DeviceManagement />
          </TabsContent>

          <TabsContent value="locations">
            <LocationManagement />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftManagement />
          </TabsContent>

          <TabsContent value="makeup">
            <MakeupRequests />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500">
              {t('landing.poweredBy')}
            </p>
            <p className="text-base font-semibold text-white">
              {t('landing.collaborationText')}
            </p>
            <div className="flex items-center justify-center space-x-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center mb-1">
                  <span className="text-white font-bold text-sm">C1</span>
                </div>
                <p className="text-xs text-gray-400">Cluster 1</p>
              </div>
              <div className="text-gray-400">×</div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center mb-1">
                  <span className="text-white font-bold text-sm">ST</span>
                </div>
                <p className="text-xs text-gray-400">Symbiotech</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}