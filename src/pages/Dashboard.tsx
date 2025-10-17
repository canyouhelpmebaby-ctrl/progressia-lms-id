import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, TrendingUp, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: courseProgress, isLoading } = useQuery({
    queryKey: ['course-progress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_progress')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            total_modules
          )
        `)
        .eq('user_id', user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      not_started: { label: 'Belum Mulai', variant: 'secondary' as const },
      in_progress: { label: 'Sedang Dipelajari', variant: 'default' as const },
      completed: { label: 'Selesai', variant: 'outline' as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.not_started;
  };

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const totalProgress = courseProgress?.reduce(
    (acc, cp: any) => acc + calculateProgress(cp.completed_modules, cp.courses.total_modules),
    0
  ) || 0;

  const averageProgress = courseProgress?.length
    ? Math.round(totalProgress / courseProgress.length)
    : 0;

  const completedCourses = courseProgress?.filter((cp: any) => cp.status === 'completed').length || 0;
  const inProgressCourses = courseProgress?.filter((cp: any) => cp.status === 'in_progress').length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Dashboard Pembelajaran
          </h1>
          <p className="text-muted-foreground">
            Selamat datang kembali! Lihat perkembangan belajar Anda di sini.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-gradient-card border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{averageProgress}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Rata-rata dari semua kursus
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kursus Aktif</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{inProgressCourses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Sedang dipelajari
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kursus Selesai</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{completedCourses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Kursus yang telah diselesaikan
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Progress Kursus Anda</CardTitle>
            <CardDescription>
              Lihat detail perkembangan dari setiap kursus yang Anda ikuti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : courseProgress && courseProgress.length > 0 ? (
              <div className="space-y-6">
                {courseProgress.map((cp: any) => {
                  const progress = calculateProgress(cp.completed_modules, cp.courses.total_modules);
                  const status = getStatusBadge(cp.status);

                  return (
                    <div key={cp.id} className="space-y-3 p-4 rounded-lg bg-gradient-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{cp.courses.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {cp.courses.description}
                          </p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-primary">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {cp.completed_modules} dari {cp.courses.total_modules} modul selesai
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Anda belum mengikuti kursus apapun. Mulai belajar sekarang!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}