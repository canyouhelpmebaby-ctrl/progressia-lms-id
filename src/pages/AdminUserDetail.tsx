import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  Trophy, 
  Clock, 
  Target,
  Calendar,
  Award,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();

  // Fetch user profile with roles
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) return null;

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      return {
        ...profileData,
        user_roles: rolesData || []
      };
    },
  });

  // Fetch course progress
  const { data: courseProgress } = useQuery({
    queryKey: ['user-course-progress', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_progress')
        .select(`
          *,
          courses (
            title,
            total_modules
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch learning sessions
  const { data: learningSessions } = useQuery({
    queryKey: ['user-learning-sessions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_sessions')
        .select(`
          *,
          courses (
            title
          )
        `)
        .eq('user_id', userId)
        .order('session_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch learning records
  const { data: learningRecords } = useQuery({
    queryKey: ['user-learning-records', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_records')
        .select(`
          *,
          courses (
            title
          )
        `)
        .eq('user_id', userId)
        .order('record_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch rewards
  const { data: rewards } = useQuery({
    queryKey: ['user-rewards', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch goals
  const { data: goals } = useQuery({
    queryKey: ['user-goals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const userIsAdmin = (roles: any[]) => {
    return roles?.some((r) => r.role === 'admin') || false;
  };

  const totalLearningMinutes = learningSessions?.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0;
  const totalPoints = rewards?.reduce((sum, reward) => sum + (reward.points || 0), 0) || 0;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Memuat data...</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Pengguna tidak ditemukan</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/users')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Pengguna
        </Button>

        {/* User Info Header */}
        <Card className="mb-6 shadow-md">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl mb-2">{profile.full_name}</CardTitle>
                  <p className="text-muted-foreground mb-2">{profile.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={userIsAdmin(profile.user_roles || []) ? 'default' : 'secondary'}>
                      {userIsAdmin(profile.user_roles || []) ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        'Student'
                      )}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Bergabung {format(new Date(profile.created_at), 'dd MMM yyyy', { locale: id })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Kursus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{courseProgress?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Waktu Belajar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{totalLearningMinutes}</span>
                <span className="text-sm text-muted-foreground">menit</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Poin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{totalPoints}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Badge</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{rewards?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="progress" className="space-y-4">
          <TabsList>
            <TabsTrigger value="progress">Progress Kursus</TabsTrigger>
            <TabsTrigger value="sessions">Sesi Belajar</TabsTrigger>
            <TabsTrigger value="records">Catatan Belajar</TabsTrigger>
            <TabsTrigger value="goals">Target</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          {/* Course Progress Tab */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Progress Kursus
                </CardTitle>
                <CardDescription>Perkembangan pembelajaran pada setiap kursus</CardDescription>
              </CardHeader>
              <CardContent>
                {courseProgress && courseProgress.length > 0 ? (
                  <div className="space-y-4">
                    {courseProgress.map((progress: any) => {
                      const percentage = progress.courses?.total_modules 
                        ? (progress.completed_modules / progress.courses.total_modules) * 100 
                        : 0;
                      
                      return (
                        <div key={progress.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{progress.courses?.title || 'Kursus'}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
                                {progress.status === 'completed' ? 'Selesai' : 
                                 progress.status === 'in_progress' ? 'Sedang Berjalan' : 'Belum Dimulai'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {progress.completed_modules}/{progress.courses?.total_modules || 0} modul
                              </span>
                            </div>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Belum ada progress kursus</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Sessions Tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Sesi Belajar
                </CardTitle>
                <CardDescription>10 sesi belajar terbaru</CardDescription>
              </CardHeader>
              <CardContent>
                {learningSessions && learningSessions.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Kursus</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Durasi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {learningSessions.map((session: any) => (
                          <TableRow key={session.id}>
                            <TableCell>
                              {format(new Date(session.session_date), 'dd MMM yyyy', { locale: id })}
                            </TableCell>
                            <TableCell>{session.courses?.title || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{session.session_type}</Badge>
                            </TableCell>
                            <TableCell>{session.duration_minutes} menit</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Belum ada sesi belajar</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Records Tab */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Catatan Belajar
                </CardTitle>
                <CardDescription>10 catatan belajar terbaru</CardDescription>
              </CardHeader>
              <CardContent>
                {learningRecords && learningRecords.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Kursus</TableHead>
                          <TableHead>Aktivitas</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Durasi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {learningRecords.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {format(new Date(record.record_date), 'dd MMM yyyy', { locale: id })}
                            </TableCell>
                            <TableCell>{record.courses?.title || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{record.activity_type}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {record.activity_description || '-'}
                            </TableCell>
                            <TableCell>{record.duration_minutes ? `${record.duration_minutes} menit` : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Belum ada catatan belajar</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Target Belajar
                </CardTitle>
                <CardDescription>Daftar target yang telah dibuat</CardDescription>
              </CardHeader>
              <CardContent>
                {goals && goals.length > 0 ? (
                  <div className="space-y-4">
                    {goals.map((goal: any) => {
                      const percentage = (goal.current_value / goal.target_value) * 100;
                      
                      return (
                        <div key={goal.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{goal.title}</h4>
                              <p className="text-sm text-muted-foreground">{goal.description}</p>
                            </div>
                            <Badge variant={goal.status === 'completed' ? 'default' : 
                                          goal.status === 'active' ? 'secondary' : 'outline'}>
                              {goal.status === 'completed' ? 'Selesai' : 
                               goal.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {goal.current_value}/{goal.target_value} {goal.goal_type}
                              </span>
                              <span className="font-medium">{Math.round(percentage)}%</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(goal.start_date), 'dd MMM yyyy', { locale: id })}
                            </span>
                            <span>→</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(goal.end_date), 'dd MMM yyyy', { locale: id })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Belum ada target belajar</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Rewards & Badge
                </CardTitle>
                <CardDescription>Pencapaian dan penghargaan yang diraih</CardDescription>
              </CardHeader>
              <CardContent>
                {rewards && rewards.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rewards.map((reward: any) => (
                      <div key={reward.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Award className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{reward.badge_name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {reward.badge_type}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">+{reward.points}</div>
                            <div className="text-xs text-muted-foreground">poin</div>
                          </div>
                        </div>
                        {reward.description && (
                          <p className="text-sm text-muted-foreground">{reward.description}</p>
                        )}
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(reward.earned_at), 'dd MMM yyyy HH:mm', { locale: id })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Belum ada rewards yang diraih</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
