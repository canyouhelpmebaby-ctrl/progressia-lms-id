import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, TrendingUp, Award, Target, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  const { data: goals } = useQuery({
    queryKey: ['active-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: recentSessions } = useQuery({
    queryKey: ['recent-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('session_date', { ascending: false })
        .limit(7);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const chartData = recentSessions?.map((session: any) => ({
    date: new Date(session.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    minutes: session.duration_minutes,
  })).reverse() || [];

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
  const totalStudyTime = recentSessions?.reduce((acc: number, session: any) => acc + session.duration_minutes, 0) || 0;

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

        <div className="grid gap-6 md:grid-cols-4 mb-8">
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

          <Card className="bg-gradient-card border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waktu Belajar</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalStudyTime}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Menit minggu ini
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Grafik Waktu Belajar</CardTitle>
              <CardDescription>7 hari terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Belum ada data</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Target Aktif</CardTitle>
                  <CardDescription>Target yang sedang berjalan</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/goals">Lihat Semua</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {goals && goals.length > 0 ? (
                <div className="space-y-3">
                  {goals.slice(0, 3).map((goal: any) => (
                    <div key={goal.id} className="p-3 rounded-lg bg-gradient-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{goal.title}</span>
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <Progress value={(goal.current_value / goal.target_value) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {goal.current_value} / {goal.target_value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Belum ada target aktif</p>
              )}
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