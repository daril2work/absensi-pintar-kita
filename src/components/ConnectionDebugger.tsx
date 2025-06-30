import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const ConnectionDebugger = () => {
  const { user, profile } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    const diagnostics = {
      timestamp: new Date().toISOString(),
      user: !!user,
      profile: !!profile,
      tests: {
        basicConnection: false,
        authStatus: false,
        profileAccess: false,
        shiftsAccess: false,
        locationsAccess: false,
        attendanceAccess: false
      },
      errors: [] as string[]
    };

    try {
      // Test 1: Basic connection
      console.log('🔍 Testing basic connection...');
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (!error) {
          diagnostics.tests.basicConnection = true;
          console.log('✅ Basic connection: OK');
        } else {
          diagnostics.errors.push(`Basic connection: ${error.message}`);
          console.log('❌ Basic connection failed:', error.message);
        }
      } catch (err: any) {
        diagnostics.errors.push(`Basic connection exception: ${err.message}`);
        console.log('❌ Basic connection exception:', err.message);
      }

      // Test 2: Auth status
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session) {
          diagnostics.tests.authStatus = true;
          console.log('✅ Auth status: OK');
        } else {
          diagnostics.errors.push(`Auth status: ${error?.message || 'No session'}`);
          console.log('❌ Auth status failed:', error?.message || 'No session');
        }
      } catch (err: any) {
        diagnostics.errors.push(`Auth status exception: ${err.message}`);
        console.log('❌ Auth status exception:', err.message);
      }

      // Test 3: Profile access
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            diagnostics.tests.profileAccess = true;
            console.log('✅ Profile access: OK');
          } else {
            diagnostics.errors.push(`Profile access: ${error?.message || 'No data'}`);
            console.log('❌ Profile access failed:', error?.message);
          }
        } catch (err: any) {
          diagnostics.errors.push(`Profile access exception: ${err.message}`);
          console.log('❌ Profile access exception:', err.message);
        }
      }

      // Test 4: Shifts access
      try {
        const { data, error } = await supabase
          .from('shift')
          .select('*')
          .eq('aktif', true)
          .limit(5);
        
        if (!error) {
          diagnostics.tests.shiftsAccess = true;
          console.log('✅ Shifts access: OK', data?.length || 0, 'shifts found');
        } else {
          diagnostics.errors.push(`Shifts access: ${error.message}`);
          console.log('❌ Shifts access failed:', error.message);
        }
      } catch (err: any) {
        diagnostics.errors.push(`Shifts access exception: ${err.message}`);
        console.log('❌ Shifts access exception:', err.message);
      }

      // Test 5: Locations access
      try {
        const { data, error } = await supabase
          .from('lokasi_valid')
          .select('*')
          .eq('aktif', true)
          .limit(5);
        
        if (!error) {
          diagnostics.tests.locationsAccess = true;
          console.log('✅ Locations access: OK', data?.length || 0, 'locations found');
        } else {
          diagnostics.errors.push(`Locations access: ${error.message}`);
          console.log('❌ Locations access failed:', error.message);
        }
      } catch (err: any) {
        diagnostics.errors.push(`Locations access exception: ${err.message}`);
        console.log('❌ Locations access exception:', err.message);
      }

      // Test 6: Attendance access
      if (user) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const { data, error } = await supabase
            .from('absensi')
            .select('*')
            .eq('user_id', user.id)
            .gte('waktu', `${today}T00:00:00.000Z`)
            .limit(5);
          
          if (!error) {
            diagnostics.tests.attendanceAccess = true;
            console.log('✅ Attendance access: OK', data?.length || 0, 'records found');
          } else {
            diagnostics.errors.push(`Attendance access: ${error.message}`);
            console.log('❌ Attendance access failed:', error.message);
          }
        } catch (err: any) {
          diagnostics.errors.push(`Attendance access exception: ${err.message}`);
          console.log('❌ Attendance access exception:', err.message);
        }
      }

    } catch (globalError: any) {
      diagnostics.errors.push(`Global error: ${globalError.message}`);
      console.log('💥 Global error:', globalError.message);
    }

    setResults(diagnostics);
    setTesting(false);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Connection Diagnostics
        </CardTitle>
        <CardDescription>
          Diagnose "Failed to fetch" issues with Supabase connection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm font-medium">User Status</div>
            <div className="flex items-center gap-2">
              {getStatusIcon(!!user)}
              <span className="text-sm">{user ? 'Authenticated' : 'Not authenticated'}</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Profile Status</div>
            <div className="flex items-center gap-2">
              {getStatusIcon(!!profile)}
              <span className="text-sm">{profile ? `Role: ${profile.role}` : 'No profile'}</span>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <Button 
          onClick={runDiagnostics} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Connection Diagnostics'
          )}
        </Button>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Test completed at: {new Date(results.timestamp).toLocaleString()}
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              <h4 className="font-medium">Test Results:</h4>
              {Object.entries(results.tests).map(([test, status]) => (
                <div key={test} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm capitalize">{test.replace(/([A-Z])/g, ' $1')}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status as boolean)}
                    <span className="text-sm">{status ? 'PASS' : 'FAIL'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Errors */}
            {results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Errors Detected ({results.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {results.errors.map((error: string, index: number) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Environment Info */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Environment Info:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>URL: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 30)}...</div>
                <div>Key Length: {import.meta.env.VITE_SUPABASE_ANON_KEY?.length} chars</div>
                <div>Mode: {import.meta.env.MODE}</div>
                <div>User Agent: {navigator.userAgent.substring(0, 50)}...</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};