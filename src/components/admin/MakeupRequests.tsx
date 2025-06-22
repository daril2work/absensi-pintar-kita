import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, X, Eye, Settings } from 'lucide-react';
import { format } from 'date-fns';

export const MakeupRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMakeupRequests();
  }, []);

  const fetchMakeupRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('makeup_requests')
      .select(`
        *,
        profiles:user_id (name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('makeup_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create attendance record
      const request = requests.find(r => r.id === requestId);
      if (request) {
        const { error: attendanceError } = await supabase
          .from('absensi')
          .insert({
            user_id: request.user_id,
            waktu: new Date(`${request.tanggal_absen}T09:00:00`).toISOString(),
            status: 'MAKE_UP',
            metode: 'make-up',
            alasan: request.alasan,
            approved_by: user?.id
          });

        if (attendanceError) throw attendanceError;
      }

      toast({
        title: t('general.success'),
        description: t('admin.makeupRequestApproved'),
      });
      
      setOpen(false);
      setAdminNotes('');
      fetchMakeupRequests();
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase
        .from('makeup_requests')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: t('general.success'),
        description: t('admin.makeupRequestRejected'),
      });
      
      setOpen(false);
      setAdminNotes('');
      fetchMakeupRequests();
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'pending': 'secondary',
      'approved': 'default',
      'rejected': 'destructive'
    };
    
    return <Badge variant={variants[status] || 'default'}>{t(`status.${status}`)}</Badge>;
  };

  const openRequestDialog = (request: any) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t('admin.makeupRequestsTitle')}
        </CardTitle>
        <CardDescription>
          {t('admin.reviewProcessRequests')}
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
                  <TableHead>{t('admin.employee')}</TableHead>
                  <TableHead>{t('admin.date')}</TableHead>
                  <TableHead>{t('admin.reason')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead>{t('admin.submitted')}</TableHead>
                  <TableHead>{t('general.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.profiles?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.tanggal_absen), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {request.alasan}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRequestDialog(request)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('admin.reviewMakeupRequest')}</DialogTitle>
              <DialogDescription>
                {t('admin.reviewDetails')}
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">{t('admin.employee')}</Label>
                    <p className="text-sm text-gray-600">{selectedRequest.profiles?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t('admin.date')}</Label>
                    <p className="text-sm text-gray-600">
                      {format(new Date(selectedRequest.tanggal_absen), 'dd MMMM yyyy')}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">{t('admin.reason')}</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedRequest.alasan}</p>
                </div>
                
                {selectedRequest.bukti_url && (
                  <div>
                    <Label className="text-sm font-medium">{t('admin.supportingDocument')}</Label>
                    <a 
                      href={selectedRequest.bukti_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline block"
                    >
                      {t('admin.viewDocument')}
                    </a>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="admin_notes">{t('admin.adminNotes')}</Label>
                  <Textarea
                    id="admin_notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={t('admin.addNotesDecision')}
                    className="mt-1"
                  />
                </div>
                
                {selectedRequest.status === 'pending' && (
                  <DialogFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={processingId === selectedRequest.id}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('admin.reject')}
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={processingId === selectedRequest.id}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('admin.approve')}
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};