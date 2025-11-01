import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, TrendingUp, Award, Target, Clock, Plus, Trash2, Play, Pause, RotateCcw, Calendar, FileText, Download, Search, Trophy, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  // Goals state
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    description: '',
    goal_type: 'daily',
    target_value: 1,
    end_date: '',
  });
  
  // Timer state
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [sessionType, setSessionType] = useState<'study' | 'break'>('study');
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(25);
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Materials state
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [materialFormData, setMaterialFormData] = useState({
    title: '',
    description: '',
    course_id: '',
  });

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
        .select(`
          *,
          courses (title)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(7);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  
  const { data: allGoals } = useQuery({
    queryKey: ['learning-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  
  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      return data;
    },
  });
  
  const { data: rewards, isLoading: isLoadingRewards } = useQuery({
    queryKey: ['user-rewards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', user!.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  
  const { data: materials, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ['learning-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_materials')
        .select(`
          *,
          courses (title)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
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
  
  // Goals mutations
  const createGoalMutation = useMutation({
    mutationFn: async (newGoal: any) => {
      const { error } = await supabase.from('learning_goals').insert({
        ...newGoal,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      toast.success('Target berhasil dibuat!');
      setIsGoalDialogOpen(false);
      setGoalFormData({
        title: '',
        description: '',
        goal_type: 'daily',
        target_value: 1,
        end_date: '',
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('learning_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      toast.success('Target berhasil dihapus!');
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, current_value }: { id: string; current_value: number }) => {
      const { error } = await supabase
        .from('learning_goals')
        .update({ current_value })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
    },
  });
  
  // Timer logic
  const saveSessionMutation = useMutation({
    mutationFn: async (duration: number) => {
      const { error } = await supabase.from('learning_sessions').insert({
        user_id: user!.id,
        course_id: selectedCourse || null,
        duration_minutes: duration,
        session_type: sessionType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
      toast.success('Sesi pembelajaran berhasil disimpan!');
    },
  });

  useEffect(() => {
    let interval: any = null;

    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            setIsActive(false);
            const duration = startTime;
            saveSessionMutation.mutate(duration);
            toast.success('Waktu habis! Sesi telah disimpan.');
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(startTime);
    setSeconds(0);
  };

  const setPresetTime = (mins: number, type: 'study' | 'break') => {
    setMinutes(mins);
    setSeconds(0);
    setStartTime(mins);
    setSessionType(type);
    setIsActive(false);
  };
  
  // Materials mutations
  const uploadMaterialMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected');

      const ALLOWED_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];

      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        throw new Error('File type not allowed. Only PDF, Word, PowerPoint, Excel, and text files are accepted.');
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (selectedFile.size > MAX_FILE_SIZE) {
        throw new Error('File too large. Maximum size is 10MB.');
      }

      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const sanitizedFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = sanitizedFileName;

      const { error: uploadError } = await supabase.storage
        .from('learning-materials')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('learning-materials')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('learning_materials').insert({
        ...materialFormData,
        file_path: publicUrl,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        uploaded_by: user!.id,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-materials'] });
      toast.success('Materi berhasil diunggah!');
      setIsMaterialDialogOpen(false);
      setMaterialFormData({ title: '', description: '', course_id: '' });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal mengunggah materi');
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_materials')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-materials'] });
      toast.success('Materi berhasil dihapus!');
    },
  });
  
  // Helper functions
  const getGoalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: 'Harian',
      weekly: 'Mingguan',
      monthly: 'Bulanan',
      yearly: 'Tahunan',
    };
    return labels[type] || type;
  };
  
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDate = (date: Date) => {
    return recentSessions?.filter((session: any) =>
      isSameDay(new Date(session.session_date || session.created_at), date)
    );
  };
  
  const totalPoints = rewards?.reduce((acc: number, reward: any) => acc + reward.points, 0) || 0;

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'progress':
        return <TrendingUp className="h-8 w-8" />;
      case 'streak':
        return <Award className="h-8 w-8" />;
      case 'completion':
        return <Trophy className="h-8 w-8" />;
      default:
        return <Award className="h-8 w-8" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'progress':
        return 'bg-blue-500';
      case 'streak':
        return 'bg-orange-500';
      case 'completion':
        return 'bg-green-500';
      case 'achievement':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const filteredMaterials = materials?.filter(
    (material: any) =>
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGoalMutation.mutate(goalFormData);
  };
  
  const handleMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMaterialMutation.mutate();
  };

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

        {/* Target & Goals Section */}
        <Card className="shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Target Pembelajaran</CardTitle>
                <CardDescription>Tetapkan dan lacak target belajar Anda</CardDescription>
              </div>
              <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Target
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buat Target Baru</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleGoalSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Judul Target</Label>
                      <Input
                        id="title"
                        value={goalFormData.title}
                        onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Deskripsi</Label>
                      <Textarea
                        id="description"
                        value={goalFormData.description}
                        onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="goal_type">Tipe Target</Label>
                      <Select
                        value={goalFormData.goal_type}
                        onValueChange={(value) => setGoalFormData({ ...goalFormData, goal_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Harian</SelectItem>
                          <SelectItem value="weekly">Mingguan</SelectItem>
                          <SelectItem value="monthly">Bulanan</SelectItem>
                          <SelectItem value="yearly">Tahunan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="target_value">Target (jumlah)</Label>
                      <Input
                        id="target_value"
                        type="number"
                        min="1"
                        value={goalFormData.target_value}
                        onChange={(e) =>
                          setGoalFormData({ ...goalFormData, target_value: parseInt(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">Tanggal Selesai</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={goalFormData.end_date}
                        onChange={(e) => setGoalFormData({ ...goalFormData, end_date: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Buat Target
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {allGoals && allGoals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allGoals.map((goal: any) => {
                  const progress = (goal.current_value / goal.target_value) * 100;
                  return (
                    <Card key={goal.id} className="shadow-sm">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Target className="h-6 w-6 text-primary" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteGoalMutation.mutate(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <CardDescription>{getGoalTypeLabel(goal.goal_type)}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-semibold text-primary">
                              {goal.current_value} / {goal.target_value}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateProgressMutation.mutate({
                                  id: goal.id,
                                  current_value: Math.max(0, goal.current_value - 1),
                                })
                              }
                            >
                              -
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() =>
                                updateProgressMutation.mutate({
                                  id: goal.id,
                                  current_value: Math.min(
                                    goal.target_value,
                                    goal.current_value + 1
                                  ),
                                })
                              }
                            >
                              + 1
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Selesai pada: {new Date(goal.end_date).toLocaleDateString('id-ID')}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Belum ada target. Mulai dengan membuat target pertama Anda!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timer Section */}
        <Card className="shadow-md mb-8">
          <CardHeader>
            <CardTitle>Timer Pembelajaran</CardTitle>
            <CardDescription>Kelola waktu belajar dengan teknik Pomodoro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-7xl font-bold text-primary mb-4">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sessionType === 'study' ? 'Sesi Belajar' : 'Waktu Istirahat'}
                  </p>
                </div>

                <div className="flex gap-2 justify-center">
                  <Button onClick={toggleTimer} size="lg" className="gap-2">
                    {isActive ? (
                      <>
                        <Pause className="h-5 w-5" />
                        Jeda
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        Mulai
                      </>
                    )}
                  </Button>
                  <Button onClick={resetTimer} variant="outline" size="lg" className="gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Preset Waktu:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPresetTime(25, 'study')}
                      disabled={isActive}
                    >
                      Belajar 25m
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPresetTime(5, 'break')}
                      disabled={isActive}
                    >
                      Istirahat 5m
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPresetTime(50, 'study')}
                      disabled={isActive}
                    >
                      Belajar 50m
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPresetTime(10, 'break')}
                      disabled={isActive}
                    >
                      Istirahat 10m
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Kursus</label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kursus (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg">
                  <Clock className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-2">Tips Produktivitas</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Fokus pada satu tugas selama sesi belajar</li>
                    <li>• Istirahat sejenak di antara sesi</li>
                    <li>• Hindari gangguan saat timer berjalan</li>
                    <li>• Catat progres setelah setiap sesi</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar & Records Section */}
        <Card className="shadow-md mb-8">
          <CardHeader>
            <CardTitle>Catatan & Kalender Pembelajaran</CardTitle>
            <CardDescription>Lihat histori dan kalender belajar Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-4">Kalender Pembelajaran</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {format(currentMonth, 'MMMM yyyy', { locale: id })}
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                  {daysInMonth.map((date) => {
                    const sessionsForDate = getSessionsForDate(date);
                    const hasActivity = sessionsForDate && sessionsForDate.length > 0;

                    return (
                      <button
                        key={date.toString()}
                        onClick={() => setSelectedDate(date)}
                        className={`
                          p-2 text-sm rounded-lg transition-colors
                          ${hasActivity ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'}
                          ${isSameDay(date, selectedDate) ? 'ring-2 ring-primary' : ''}
                        `}
                      >
                        {format(date, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Riwayat Sesi Terbaru</h3>
                {recentSessions && recentSessions.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {recentSessions.slice(0, 10).map((session: any) => (
                      <div
                        key={session.id}
                        className="p-3 rounded-lg bg-gradient-card border border-border"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-sm">
                            {session.courses?.title || 'Sesi Umum'}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {session.duration_minutes} menit
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(session.created_at), 'dd MMM yyyy, HH:mm', {
                            locale: id,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada sesi pembelajaran
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Materials Section */}
        <Card className="shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Materi Pembelajaran</CardTitle>
                <CardDescription>Akses semua materi dan file pembelajaran</CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Unggah Materi
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Unggah Materi Baru</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleMaterialSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="material_title">Judul Materi</Label>
                        <Input
                          id="material_title"
                          value={materialFormData.title}
                          onChange={(e) => setMaterialFormData({ ...materialFormData, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="material_description">Deskripsi</Label>
                        <Textarea
                          id="material_description"
                          value={materialFormData.description}
                          onChange={(e) =>
                            setMaterialFormData({ ...materialFormData, description: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="material_course_id">Kursus</Label>
                        <Select
                          value={materialFormData.course_id}
                          onValueChange={(value) => setMaterialFormData({ ...materialFormData, course_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kursus" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses?.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="file">File</Label>
                        <Input
                          id="file"
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={uploadMaterialMutation.isPending}>
                        {uploadMaterialMutation.isPending ? 'Mengunggah...' : 'Unggah Materi'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari materi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {isLoadingMaterials ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : filteredMaterials && filteredMaterials.length > 0 ? (
              <div className="grid gap-4">
                {filteredMaterials.slice(0, 5).map((material: any) => (
                  <Card key={material.id} className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <FileText className="h-6 w-6 text-primary mt-1" />
                          <div>
                            <CardTitle className="text-base">{material.title}</CardTitle>
                            <CardDescription>
                              {material.courses?.title || 'Materi Umum'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {material.file_path && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={material.file_path} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMaterialMutation.mutate(material.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {material.description && (
                        <p className="text-sm text-muted-foreground mb-2">{material.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {material.file_size && (
                          <span>Ukuran: {formatFileSize(material.file_size)}</span>
                        )}
                        <span>
                          Diunggah: {new Date(material.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Tidak ada materi yang cocok dengan pencarian'
                    : 'Belum ada materi tersedia'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rewards Section */}
        <Card className="shadow-md mb-8">
          <CardHeader>
            <CardTitle>Penghargaan & Poin</CardTitle>
            <CardDescription>Lihat pencapaian dan badge yang telah Anda raih</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Card className="bg-gradient-card border-none shadow-sm">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Total Poin</p>
                    <div className="text-5xl font-bold text-primary">{totalPoints}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {isLoadingRewards ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : rewards && rewards.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rewards.slice(0, 6).map((reward: any) => (
                  <Card key={reward.id} className="shadow-sm">
                    <CardHeader>
                      <div
                        className={`w-12 h-12 rounded-full ${getBadgeColor(
                          reward.badge_type
                        )} flex items-center justify-center text-white mb-2`}
                      >
                        {getBadgeIcon(reward.badge_type)}
                      </div>
                      <CardTitle className="text-base flex items-center justify-between">
                        {reward.badge_name}
                        <Badge variant="secondary" className="text-xs">+{reward.points}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(reward.earned_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Belum ada penghargaan. Terus belajar untuk mendapatkan badge pertama Anda!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Kursus */}
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