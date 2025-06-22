import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';

export const ShiftManagement = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [formData, setFormData] = useState({
    nama_shift: '',
    jam_masuk: '',
    jam_keluar: '',
    jenis_hari: 'weekday',
    aktif: true
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shift')
      .select('*')
      .order('jenis_hari, jam_masuk');

    if (!error && data) {
      setShifts(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let error;
      if (editingShift) {
        ({ error } = await supabase
          .from('shift')
          .update(formData)
          .eq('id', editingShift.id));
      } else {
        ({ error } = await supabase
          .from('shift')
          .insert(formData));
      }

      if (error) {
        toast({
          title: t('general.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('general.success'),
          description: editingShift ? t('admin.shiftUpdated') : t('admin.shiftCreated'),
        });
        setFormData({ nama_shift: '', jam_masuk: '', jam_keluar: '', jenis_hari: 'weekday', aktif: true });
        setEditingShift(null);
        setOpen(false);
        fetchShifts();
      }
    } catch (error: any) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (shift: any) => {
    setEditingShift(shift);
    setFormData({
      nama_shift: shift.nama_shift,
      jam_masuk: shift.jam_masuk,
      jam_keluar: shift.jam_keluar,
      jenis_hari: shift.jenis_hari || 'weekday',
      aktif: shift.aktif !== undefined ? shift.aktif : true
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.deleteShiftConfirm'))) return;

    const { error } = await supabase
      .from('shift')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: t('general.error'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('general.success'),
        description: t('admin.shiftDeleted'),
      });
      fetchShifts();
    }
  };

  const resetForm = () => {
    setFormData({ nama_shift: '', jam_masuk: '', jam_keluar: '', jenis_hari: 'weekday', aktif: true });
    setEditingShift(null);
  };

  const getDayTypeBadge = (dayType: string) => {
    const variants: Record<string, any> = {
      'weekday': 'default',
      'weekend': 'secondary',
      'holiday': 'outline',
      'all': 'destructive'
    };
    
    return <Badge variant={variants[dayType] || 'default'}>{t(`admin.dayType.${dayType}`)}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('admin.shiftManagement')}
            </CardTitle>
            <CardDescription>
              {t('admin.manageWorkShifts')}
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(value) => {
            setOpen(value);
            if (!value) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.addShift')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingShift ? t('admin.editShift') : t('admin.addNewShift')}
                </DialogTitle>
                <DialogDescription>
                  {t('admin.setupWorkShift')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama_shift">{t('admin.shiftName')}</Label>
                    <Input
                      id="nama_shift"
                      value={formData.nama_shift}
                      onChange={(e) => setFormData({ ...formData, nama_shift: e.target.value })}
                      placeholder={t('admin.shiftNamePlaceholder')}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jenis_hari">{t('admin.dayType')}</Label>
                    <Select value={formData.jenis_hari} onValueChange={(value) => setFormData({ ...formData, jenis_hari: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.selectDayType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekday">{t('admin.dayType.weekday')}</SelectItem>
                        <SelectItem value="weekend">{t('admin.dayType.weekend')}</SelectItem>
                        <SelectItem value="holiday">{t('admin.dayType.holiday')}</SelectItem>
                        <SelectItem value="all">{t('admin.dayType.all')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jam_masuk">{t('admin.startTime')}</Label>
                      <Input
                        id="jam_masuk"
                        type="time"
                        value={formData.jam_masuk}
                        onChange={(e) => setFormData({ ...formData, jam_masuk: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jam_keluar">{t('admin.endTime')}</Label>
                      <Input
                        id="jam_keluar"
                        type="time"
                        value={formData.jam_keluar}
                        onChange={(e) => setFormData({ ...formData, jam_keluar: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aktif"
                      checked={formData.aktif}
                      onCheckedChange={(checked) => setFormData({ ...formData, aktif: checked })}
                    />
                    <Label htmlFor="aktif">{t('admin.active')}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {t('general.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingShift ? t('general.update') : t('general.create')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.shiftName')}</TableHead>
                  <TableHead>{t('admin.dayType')}</TableHead>
                  <TableHead>{t('admin.startTime')}</TableHead>
                  <TableHead>{t('admin.endTime')}</TableHead>
                  <TableHead>{t('admin.duration')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead>{t('general.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => {
                  const startTime = new Date(`2000-01-01 ${shift.jam_masuk}`);
                  const endTime = new Date(`2000-01-01 ${shift.jam_keluar}`);
                  const duration = Math.abs(endTime.getTime() - startTime.getTime());
                  const hours = Math.floor(duration / (1000 * 60 * 60));
                  
                  return (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.nama_shift}</TableCell>
                      <TableCell>
                        {getDayTypeBadge(shift.jenis_hari || 'weekday')}
                      </TableCell>
                      <TableCell>{shift.jam_masuk}</TableCell>
                      <TableCell>{shift.jam_keluar}</TableCell>
                      <TableCell>{hours} {t('admin.hours')}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          shift.aktif !== false
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {shift.aktif !== false ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(shift)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(shift.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
  );
};