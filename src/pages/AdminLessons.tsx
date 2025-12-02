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
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminLessons() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');

  const { data: module } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*, courses(*)')
        .eq('id', moduleId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['lessons', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('lessons').insert({
        module_id: moduleId,
        title,
        content_html: contentHtml,
        image_url: imageUrl || null,
        order_index: parseInt(orderIndex),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      toast.success('Materi berhasil ditambahkan');
      resetForm();
    },
    onError: () => {
      toast.error('Gagal menambahkan materi');
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('lessons')
        .update({
          title,
          content_html: contentHtml,
          image_url: imageUrl || null,
          order_index: parseInt(orderIndex),
        })
        .eq('id', editingLesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      toast.success('Materi berhasil diperbarui');
      resetForm();
    },
    onError: () => {
      toast.error('Gagal memperbarui materi');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      toast.success('Materi berhasil dihapus');
    },
    onError: () => {
      toast.error('Gagal menghapus materi');
    },
  });

  const resetForm = () => {
    setTitle('');
    setContentHtml('');
    setImageUrl('');
    setOrderIndex('0');
    setEditingLesson(null);
    setDialogOpen(false);
  };

  const handleEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setTitle(lesson.title);
    setContentHtml(lesson.content_html);
    setImageUrl(lesson.image_url || '');
    setOrderIndex(lesson.order_index.toString());
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || !contentHtml.trim()) {
      toast.error('Judul dan konten materi harus diisi');
      return;
    }
    if (editingLesson) {
      updateLessonMutation.mutate();
    } else {
      createLessonMutation.mutate();
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(`/admin/courses/${module?.course_id}/modules`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Modul
          </Button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Manajemen Materi</h1>
              <p className="text-muted-foreground mt-1">Modul: {module?.title}</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Materi
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLesson ? 'Edit Materi' : 'Tambah Materi Baru'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Judul Materi</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Masukkan judul materi"
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Konten HTML</Label>
                    <Textarea
                      id="content"
                      value={contentHtml}
                      onChange={(e) => setContentHtml(e.target.value)}
                      placeholder="<h2>Judul</h2><p>Paragraf...</p><ul><li>Item 1</li></ul>"
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Gunakan tag HTML: h2, h3, p, ul, ol, li, strong, em
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="image">URL Gambar (opsional)</Label>
                    <Input
                      id="image"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
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
                    {editingLesson ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Materi</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : lessons && lessons.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urutan</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead>Gambar</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessons.map((lesson) => (
                      <TableRow key={lesson.id}>
                        <TableCell>{lesson.order_index}</TableCell>
                        <TableCell className="font-medium">{lesson.title}</TableCell>
                        <TableCell>{lesson.image_url ? '✓' : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(lesson)}
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
                                  <AlertDialogTitle>Hapus Materi</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus materi ini?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteLessonMutation.mutate(lesson.id)}>
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
                  Belum ada materi. Tambahkan materi pertama Anda!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
