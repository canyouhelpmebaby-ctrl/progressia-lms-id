import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Plus, Pencil, Trash2, Image, BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminCourses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalModules, setTotalModules] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (courseData: { title: string; description: string; total_modules: number; difficulty?: string; thumbnail_url?: string }) => {
      const { error } = await supabase.from('courses').insert(courseData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Berhasil membuat kursus baru');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Gagal membuat kursus: ' + error.message);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('courses')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Berhasil mengupdate kursus');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Gagal mengupdate kursus: ' + error.message);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Berhasil menghapus kursus');
    },
    onError: (error: any) => {
      toast.error('Gagal menghapus kursus: ' + error.message);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTotalModules('');
    setDifficulty('');
    setThumbnailUrl('');
    setEditingCourse(null);
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCourse) {
      // Langsung update jika sedang edit
      const courseData = {
        title,
        description,
        total_modules: parseInt(totalModules),
        difficulty: difficulty || null,
        thumbnail_url: thumbnailUrl || null,
      };
      updateCourseMutation.mutate({ id: editingCourse.id, data: courseData });
    } else {
      // Tampilkan konfirmasi jika tambah baru
      setOpen(false);
      setConfirmOpen(true);
    }
  };

  const handleConfirmCreate = () => {
    const courseData = {
      title,
      description,
      total_modules: parseInt(totalModules),
      difficulty: difficulty || null,
      thumbnail_url: thumbnailUrl || null,
    };
    createCourseMutation.mutate(courseData);
    setConfirmOpen(false);
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    setOpen(true);
  };

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setTitle(course.title);
    setDescription(course.description || '');
    setTotalModules(course.total_modules.toString());
    setDifficulty(course.difficulty || '');
    setThumbnailUrl(course.thumbnail_url || '');
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Manajemen Kursus
            </h1>
            <p className="text-muted-foreground">
              Kelola kursus dan modul pembelajaran
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCourse(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kursus
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCourse ? 'Edit Kursus' : 'Tambah Kursus Baru'}
                </DialogTitle>
                <DialogDescription>
                  {editingCourse
                    ? 'Perbarui informasi kursus'
                    : 'Buat kursus baru untuk siswa'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Kursus</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Contoh: Dasar-dasar Pemrograman"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Jelaskan tentang kursus ini..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modules">Total Modul</Label>
                  <Input
                    id="modules"
                    type="number"
                    min="1"
                    value={totalModules}
                    onChange={(e) => setTotalModules(e.target.value)}
                    required
                    placeholder="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Tingkat Kesulitan</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tingkat kesulitan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemula">Pemula</SelectItem>
                      <SelectItem value="menengah">Menengah</SelectItem>
                      <SelectItem value="lanjutan">Lanjutan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail">URL Thumbnail (opsional)</Label>
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="thumbnail"
                      type="url"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
                  >
                    {editingCourse ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Confirmation Dialog */}
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Tambah Kursus</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>Apakah Anda yakin ingin menambahkan kursus dengan detail berikut?</p>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-left">
                    <p><strong>Judul:</strong> {title}</p>
                    <p><strong>Deskripsi:</strong> {description || '-'}</p>
                    <p><strong>Total Modul:</strong> {totalModules}</p>
                    <p><strong>Tingkat Kesulitan:</strong> {difficulty ? <span className="capitalize">{difficulty}</span> : '-'}</p>
                    <p><strong>Thumbnail:</strong> {thumbnailUrl || '-'}</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleCancelConfirm}>
                  Kembali
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmCreate}
                  disabled={createCourseMutation.isPending}
                >
                  Ya, Tambahkan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Daftar Kursus
            </CardTitle>
            <CardDescription>
              Total {courses?.length || 0} kursus tersedia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : courses && courses.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-center">Modul</TableHead>
                    <TableHead>Tingkat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course: any) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {course.description || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {course.total_modules}
                        </TableCell>
                        <TableCell>
                          {course.difficulty ? (
                            <span className="capitalize text-sm">{course.difficulty}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/courses/${course.id}/modules`)}
                            >
                              <BookMarked className="h-4 w-4 mr-1" />
                              Modul
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(course)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteCourseMutation.mutate(course.id)}
                              disabled={deleteCourseMutation.isPending}
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
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Belum ada kursus. Buat kursus pertama Anda!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}