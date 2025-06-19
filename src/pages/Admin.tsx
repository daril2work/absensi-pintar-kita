
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Users, MapPin, Clock, FileText, Settings } from 'lucide-react';
import { LocationManagement } from '@/components/admin/LocationManagement';
import { ShiftManagement } from '@/components/admin/ShiftManagement';
import { MakeupRequests } from '@/components/admin/MakeupRequests';
import { AttendanceReports } from '@/components/admin/AttendanceReports';
import { UserManagement } from '@/components/admin/UserManagement';

export default function Admin() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {profile?.name}</p>
            </div>
            <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Shifts
            </TabsTrigger>
            <TabsTrigger value="makeup" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Make-up Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <AttendanceReports />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
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
    </div>
  );
}
