import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Smartphone, Shield, AlertTriangle, RotateCcw, Ban, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface DeviceRecord {
  id: string;
  user_id: string;
  device_fingerprint: string;
  security_data: any;
  risk_level: string;
  waktu: string;
  profiles: { name: string };
}

export const DeviceManagement = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<DeviceRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [processingReset, setProcessingReset] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDevices();
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [selectedUser]);

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

  const fetchDevices = async () => {
    setLoading(true);
    
    let query = supabase
      .from('absensi')
      .select(`
        id,
        user_id,
        device_fingerprint,
        security_data,
        risk_level,
        waktu,
        profiles:user_id (name)
      `)
      .not('device_fingerprint', 'is', null)
      .order('waktu', { ascending: false });

    if (selectedUser && selectedUser !== 'all') {
      query = query.eq('user_id', selectedUser);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Group by device fingerprint and get latest record for each device
      const deviceMap = new Map();
      data.forEach((record: any) => {
        const key = `${record.user_id}-${record.device_fingerprint}`;
        if (!deviceMap.has(key) || new Date(record.waktu) > new Date(deviceMap.get(key).waktu)) {
          deviceMap.set(key, record);
        }
      });
      
      setDevices(Array.from(deviceMap.values()));
    }
    setLoading(false);
  };

  const handleResetDevice = async (userId: string, deviceFingerprint: string) => {
    setProcessingReset(true);
    
    try {
      // Update all records with this device fingerprint to mark as reset
      const { error } = await supabase
        .from('absensi')
        .update({ 
          device_fingerprint: null,
          security_data: {
            ...selectedDevice?.security_data,
            device_reset: true,
            reset_timestamp: new Date().toISOString(),
            reset_reason: 'Admin reset'
          }
        })
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint);

      if (error) throw error;

      toast({
        title: t('general.success'),
        description: `Device fingerprint reset successfully for user`,
      });
      
      setResetConfirmOpen(false);
      setSelectedDevice(null);
      fetchDevices();
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingReset(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    const variants = {
      'low': 'default',
      'medium': 'secondary',
      'high': 'destructive'
    };
    
    return <Badge variant={variants[risk as keyof typeof variants]}>{risk.toUpperCase()}</Badge>;
  };

  const getDeviceInfo = (securityData: any) => {
    if (!securityData) return 'Unknown Device';
    
    try {
      const deviceInfo = typeof securityData === 'string' ? JSON.parse(securityData) : securityData;
      const fingerprint = deviceInfo.deviceFingerprint ? JSON.parse(atob(deviceInfo.deviceFingerprint)) : null;
      
      if (fingerprint) {
        const platform = fingerprint.platform || 'Unknown';
        const resolution = fingerprint.screenResolution || 'Unknown';
        return `${platform} (${resolution})`;
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    return 'Unknown Device';
  };

  const getSecurityWarnings = (securityData: any): string[] => {
    if (!securityData) return [];
    
    try {
      const data = typeof securityData === 'string' ? JSON.parse(securityData) : securityData;
      return data.warnings || [];
    } catch (e) {
      return [];
    }
  };

  const openDeviceDetails = (device: DeviceRecord) => {
    setSelectedDevice(device);
    setDetailsOpen(true);
  };

  const openResetConfirm = (device: DeviceRecord) => {
    setSelectedDevice(device);
    setResetConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Device Management
          </CardTitle>
          <CardDescription>
            Manage user devices, reset fingerprints, and monitor security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Filter by User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchDevices}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Device List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Registered Devices
          </CardTitle>
          <CardDescription>
            {devices.length} unique devices found
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
                    <TableHead>User</TableHead>
                    <TableHead>Device Info</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Security Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const warnings = getSecurityWarnings(device.security_data);
                    
                    return (
                      <TableRow key={`${device.user_id}-${device.device_fingerprint}`}>
                        <TableCell className="font-medium">
                          {device.profiles?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{getDeviceInfo(device.security_data)}</div>
                            <div className="text-xs text-gray-500 font-mono">
                              {device.device_fingerprint?.substring(0, 12)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRiskBadge(device.risk_level || 'low')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(device.waktu), 'dd MMM yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {warnings.length > 0 ? (
                              <div className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs">{warnings.length} warnings</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs">Clean</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeviceDetails(device)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openResetConfirm(device)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
            <DialogDescription>
              Detailed information about this device and its security status
            </DialogDescription>
          </DialogHeader>
          
          {selectedDevice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">User</label>
                  <p className="text-sm text-gray-600">{selectedDevice.profiles?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Risk Level</label>
                  <div className="mt-1">{getRiskBadge(selectedDevice.risk_level || 'low')}</div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Device Fingerprint</label>
                <p className="text-xs text-gray-600 font-mono mt-1 break-all">
                  {selectedDevice.device_fingerprint}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Device Information</label>
                <p className="text-sm text-gray-600 mt-1">{getDeviceInfo(selectedDevice.security_data)}</p>
              </div>
              
              {getSecurityWarnings(selectedDevice.security_data).length > 0 && (
                <div>
                  <label className="text-sm font-medium">Security Warnings</label>
                  <div className="mt-2 space-y-1">
                    {getSecurityWarnings(selectedDevice.security_data).map((warning, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{warning}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Last Activity</label>
                <p className="text-sm text-gray-600 mt-1">
                  {format(new Date(selectedDevice.waktu), 'dd MMMM yyyy HH:mm:ss')}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                setDetailsOpen(false);
                openResetConfirm(selectedDevice!);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Reset Device Fingerprint
            </DialogTitle>
            <DialogDescription>
              This action will reset the device fingerprint for this user. They will need to re-register their device on next login.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDevice && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Confirm Reset</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p><strong>User:</strong> {selectedDevice.profiles?.name}</p>
                  <p><strong>Device:</strong> {getDeviceInfo(selectedDevice.security_data)}</p>
                  <p><strong>Current Risk:</strong> {selectedDevice.risk_level?.toUpperCase()}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResetConfirmOpen(false)}
              disabled={processingReset}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedDevice && handleResetDevice(selectedDevice.user_id, selectedDevice.device_fingerprint)}
              disabled={processingReset}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {processingReset ? (
                <>Processing...</>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Device
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};