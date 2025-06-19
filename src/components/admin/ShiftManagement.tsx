
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';

export const ShiftManagement = () => {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [formData, setFormData] = useState({
    nama_shift: '',
    jam_masuk: '',
    jam_keluar: ''
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shift')
      .select('*')
      .order('jam_masuk');

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
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Shift ${editingShift ? 'updated' : 'created'} successfully!`,
        });
        setFormData({ nama_shift: '', jam_masuk: '', jam_keluar: '' });
        setEditingShift(null);
        setOpen(false);
        fetchShifts();
      }
    } catch (error: any) {
      toast({
        title: "Error",
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
      jam_keluar: shift.jam_keluar
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    const { error } = await supabase
      .from('shift')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Shift deleted successfully!",
      });
      fetchShifts();
    }
  };

  const resetForm = () => {
    setFormData({ nama_shift: '', jam_masuk: '', jam_keluar: '' });
    setEditingShift(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Shift Management
            </CardTitle>
            <CardDescription>
              Manage work shifts and their time schedules
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(value) => {
            setOpen(value);
            if (!value) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingShift ? 'Edit Shift' : 'Add New Shift'}
                </DialogTitle>
                <DialogDescription>
                  Set up work shift times for attendance tracking.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama_shift">Shift Name</Label>
                    <Input
                      id="nama_shift"
                      value={formData.nama_shift}
                      onChange={(e) => setFormData({ ...formData, nama_shift: e.target.value })}
                      placeholder="e.g., Morning Shift"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jam_masuk">Start Time</Label>
                      <Input
                        id="jam_masuk"
                        type="time"
                        value={formData.jam_masuk}
                        onChange={(e) => setFormData({ ...formData, jam_masuk: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jam_keluar">End Time</Label>
                      <Input
                        id="jam_keluar"
                        type="time"
                        value={formData.jam_keluar}
                        onChange={(e) => setFormData({ ...formData, jam_keluar: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingShift ? 'Update' : 'Create'}
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
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
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
                      <TableCell>{shift.jam_masuk}</TableCell>
                      <TableCell>{shift.jam_keluar}</TableCell>
                      <TableCell>{hours} hours</TableCell>
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
