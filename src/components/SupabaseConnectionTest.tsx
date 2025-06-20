import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { testSupabaseConnection, getSupabaseInfo, checkEnvironmentConfig } from '@/utils/supabase-test';
import { CheckCircle, XCircle, AlertTriangle, Database, Shield, HardDrive, Users, RefreshCw } from 'lucide-react';

export const SupabaseConnectionTest = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [supabaseInfo, setSupabaseInfo] = useState<any>(null);

  useEffect(() => {
    setSupabaseInfo(getSupabaseInfo());
    checkEnvironmentConfig();
  }, []);

  const runTest = async () => {
    setTesting(true);
    try {
      const results = await testSupabaseConnection();
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? 'default' : 'destructive'}>
        {status ? 'OK' : 'FAILED'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Supabase Configuration
          </CardTitle>
          <CardDescription>
            Current Supabase connection configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supabaseInfo && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Connection Status:</span>
                <Badge variant={supabaseInfo.isConfigured ? 'default' : 'destructive'}>
                  {supabaseInfo.isConfigured ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Supabase URL:</span>
                <span className="text-sm text-gray-600 font-mono">
                  {supabaseInfo.url.substring(0, 30)}...
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">API Key Length:</span>
                <span className="text-sm text-gray-600">
                  {supabaseInfo.keyLength} characters
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Key Preview:</span>
                <span className="text-sm text-gray-600 font-mono">
                  {supabaseInfo.keyPreview}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Connection Test
          </CardTitle>
          <CardDescription>
            Test all Supabase services and database connectivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTest} 
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Test Supabase Connection
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Alert variant={testResults.connection ? 'default' : 'destructive'}>
            {testResults.connection ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              Connection Status: {testResults.connection ? 'Connected' : 'Failed'}
            </AlertTitle>
            <AlertDescription>
              {testResults.connection 
                ? 'Successfully connected to Supabase database'
                : 'Failed to connect to Supabase. Check configuration and network.'
              }
            </AlertDescription>
          </Alert>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResults.connection)}
                    <span className="text-sm font-medium">Database Connection</span>
                  </div>
                  {getStatusBadge(testResults.connection)}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResults.auth)}
                    <span className="text-sm font-medium">Authentication</span>
                  </div>
                  {getStatusBadge(testResults.auth)}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResults.storage)}
                    <span className="text-sm font-medium">Storage Service</span>
                  </div>
                  {getStatusBadge(testResults.storage)}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResults.rls)}
                    <span className="text-sm font-medium">RLS Policies</span>
                  </div>
                  {getStatusBadge(testResults.rls)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Database Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(testResults.tables).map(([table, status]) => (
                  <div key={table} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status as boolean)}
                      <span className="text-sm font-medium">{table}</span>
                    </div>
                    {getStatusBadge(status as boolean)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {testResults.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Errors Detected</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {testResults.errors.map((error: string, index: number) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};