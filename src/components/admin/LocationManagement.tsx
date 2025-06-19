
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';

export const LocationManagement = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [formData, setFormData] = useState({
    nama_lokasi: '',
    latitude: '',
    longitude: '',
    radius_meter: '100',
    aktif: true
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lokasi_valid')
      .select('*')
      .order('nama_lokasi');

    if (!error && data) {
      setLocations(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const locationData = {
      nama_lokasi: formData.nama_lokasi,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius_meter: parseInt(formData.radius_meter),
      aktif: formData.aktif
    };

    try {
      let error;
      if (editingLocation) {
        ({ error } = await supabase
          .from('lokasi_valid')
          .update(locationData)
          .eq('id', editingLocation.id));
      } else {
        ({ error } = await supabase
          .from('lokasi_valid')
          .insert(locationData));
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
          description: `Location ${editingLocation ? 'updated' : 'created'} successfully!`,
        });
        setFormData({ nama_lokasi: '', latitude: '', longitude: '', radius_meter: '100', aktif: true });
        setEditingLocation(null);
        setOpen(false);
        fetchLocations();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setFormData({
      nama_lokasi: location.nama_lokasi,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius_meter: location.radius_meter.toString(),
      aktif: location.aktif
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    const { error } = await supabase
      .from('lokasi_valid')
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
        description: "Location deleted successfully!",
      });
      fetchLocations();
    }
  };

  const resetForm = () => {
    setFormData({ nama_lokasi: '', latitude: '', longitude: '', radius_meter: '100', aktif: true });
    setEditingLocation(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Management
            </CardTitle>
            <CardDescription>
              Manage valid attendance locations with GPS coordinates
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(value) => {
            setOpen(value);
            if (!value) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? 'Edit Location' : 'Add New Location'}
                </DialogTitle>
                <DialogDescription>
                  Set up a valid attendance location with GPS coordinates and radius.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama_lokasi">Location Name</Label>
                    <Input
                      id="nama_lokasi"
                      value={formData.nama_lokasi}
                      onChange={(e) => setFormData({ ...formData, nama_lokasi: e.target.value })}
                      placeholder="e.g., Main Office"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="-6.200000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="106.816666"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="radius_meter">Radius (meters)</Label>
                    <Input
                      id="radius_meter"
                      type="number"
                      value={formData.radius_meter}
                      onChange={(e) => setFormData({ ...formData, radius_meter: e.target.value })}
                      placeholder="100"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aktif"
                      checked={formData.aktif}
                      onCheckedChange={(checked) => setFormData({ ...formData, aktif: checked })}
                    />
                    <Label htmlFor="aktif">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingLocation ? 'Update' : 'Create'}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Radius</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">{location.nama_lokasi}</TableCell>
                    <TableCell>
                      {location.latitude}, {location.longitude}
                    </TableCell>
                    <TableCell>{location.radius_meter}m</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        location.aktif 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {location.aktif ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(location.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
