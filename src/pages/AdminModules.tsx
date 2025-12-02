import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, BookOpen, FileQuestion } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminModules() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: modules, isLoading } = useQuery({
    queryKey: ['modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createModuleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('modules').insert({
        course_id: courseId,
        title,
        description,
        order_index: parseInt(orderIndex),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Modul berhasil ditambahkan');
      resetForm();
    },
    onError: () => {
      toast.error('Gagal menambahkan modul');
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('modules')
        .update({
          title,
          description,
          order_index: parseInt(orderIndex),
        })
        .eq('id', editingModule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Modul berhasil diperbarui');
      resetForm();
    },
    onError: () => {
      toast.error('Gagal memperbarui modul');
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Modul berhasil dihapus');
    },
    onError: () => {
      toast.error('Gagal menghapus modul');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setOrderIndex('0');
    setEditingModule(null);
    setDialogOpen(false);
  };

  const handleEdit = (module: any) => {
    setEditingModule(module);
    setTitle(module.title);
    setDescription(module.description || '');
    setOrderIndex(module.order_index.toString());
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Judul modul harus diisi');
      return;
    }
    if (editingModule) {
      updateModuleMutation.mutate();
    } else {
      createModuleMutation.mutate();
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Manajemen Modul</h1>
              <p className="text-muted-foreground mt-1">Kursus: {course?.title}</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Modul
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingModule ? 'Edit Modul' : 'Tambah Modul Baru'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Judul Modul</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Masukkan judul modul"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Masukkan deskripsi modul"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="order">Urutan</Label>
                    <Input
                      id="order"
                      type="number"
                      value={orderIndex}
                      onChange={(e) => setOrderIndex(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    Batal
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingModule ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Modul</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : modules && modules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urutan</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => (
                      <TableRow key={module.id}>
                        <TableCell>{module.order_index}</TableCell>
                        <TableCell className="font-medium">{module.title}</TableCell>
                        <TableCell>{module.description}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/modules/${module.id}/lessons`)}
                            >
                              <BookOpen className="h-4 w-4 mr-1" />
                              Materi
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(module)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Modul</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus modul ini? Semua materi dan kuis dalam modul ini juga akan terhapus.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteModuleMutation.mutate(module.id)}>
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada modul. Tambahkan modul pertama Anda!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
