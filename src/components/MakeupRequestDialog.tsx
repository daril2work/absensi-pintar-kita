import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { CalendarDays } from 'lucide-react';

interface MakeupRequestDialogProps {
  userId?: string;
  onSuccess?: () => void;
}

export const MakeupRequestDialog = ({ userId, onSuccess }: MakeupRequestDialogProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tanggal_absen: '',
    alasan: '',
    bukti_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('makeup_requests')
        .insert({
          user_id: userId,
          tanggal_absen: formData.tanggal_absen,
          alasan: formData.alasan,
          bukti_url: formData.bukti_url || null,
          status: 'pending'
        });

      if (error) {
        toast({
          title: t('general.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('general.success'),
          description: t('makeup.requestSubmittedSuccess'),
        });
        setFormData({ tanggal_absen: '', alasan: '', bukti_url: '' });
        setOpen(false);
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <CalendarDays className="h-4 w-4 mr-2" />
          {t('makeup.requestMakeup')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('makeup.requestMakeupTime')}</DialogTitle>
          <DialogDescription>
            {t('makeup.requestMakeupDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal_absen">{t('makeup.dateOfMissedAttendance')}</Label>
              <Input
                id="tanggal_absen"
                type="date"
                value={formData.tanggal_absen}
                onChange={(e) => setFormData({ ...formData, tanggal_absen: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alasan">{t('admin.reason')}</Label>
              <Textarea
                id="alasan"
                placeholder={t('makeup.reasonPlaceholder')}
                value={formData.alasan}
                onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bukti_url">{t('makeup.supportingDocumentOptional')}</Label>
              <Input
                id="bukti_url"
                type="url"
                placeholder={t('makeup.documentUrlPlaceholder')}
                value={formData.bukti_url}
                onChange={(e) => setFormData({ ...formData, bukti_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('general.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('makeup.submitting') : t('makeup.submitRequest')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};