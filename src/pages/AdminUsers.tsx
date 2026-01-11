import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Shield, 
  UserCircle, 
  Search, 
  Calendar, 
  Eye, 
  Download, 
  UserPlus, 
  Clock, 
  BookOpen, 
  Trophy,
  Filter,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { exportUsersToCSV } from '@/lib/export-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Fetch profiles with roles and stats
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch user stats summary
  const { data: userStats } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const [sessionsResult, progressResult, rewardsResult] = await Promise.all([
        supabase.from('learning_sessions').select('user_id, duration_minutes'),
        supabase.from('course_progress').select('user_id, status'),
        supabase.from('user_rewards').select('user_id, points'),
      ]);

      const sessionsByUser = new Map<string, number>();
      sessionsResult.data?.forEach((s) => {
        const current = sessionsByUser.get(s.user_id) || 0;
        sessionsByUser.set(s.user_id, current + (s.duration_minutes || 0));
      });

      const coursesByUser = new Map<string, { total: number; completed: number }>();
      progressResult.data?.forEach((p) => {
        const current = coursesByUser.get(p.user_id) || { total: 0, completed: 0 };
        current.total++;
        if (p.status === 'completed') current.completed++;
        coursesByUser.set(p.user_id, current);
      });

      const pointsByUser = new Map<string, number>();
      rewardsResult.data?.forEach((r) => {
        const current = pointsByUser.get(r.user_id) || 0;
        pointsByUser.set(r.user_id, current + (r.points || 0));
      });

      return { sessionsByUser, coursesByUser, pointsByUser };
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Berhasil mengubah peran pengguna');
    },
    onError: (error: any) => {
      toast.error('Gagal mengubah peran: ' + error.message);
    },
  });

  const userIsAdmin = (roles: any[]) => {
    return roles?.some((r) => r.role === 'admin') || false;
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info('Mengumpulkan data pengguna...');

      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`*, user_roles (role)`)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithDetails = await Promise.all(
        (allProfiles || []).map(async (profile) => {
          const [courseProgress, sessions, records, rewards, goals] = await Promise.all([
            supabase.from('course_progress').select('*, courses(title, total_modules)').eq('user_id', profile.id),
            supabase.from('learning_sessions').select('duration_minutes').eq('user_id', profile.id),
            supabase.from('learning_records').select('*').eq('user_id', profile.id),
            supabase.from('user_rewards').select('points').eq('user_id', profile.id),
            supabase.from('learning_goals').select('*').eq('user_id', profile.id),
          ]);

          const totalMinutes = sessions.data?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
          const totalPoints = rewards.data?.reduce((sum, r) => sum + (r.points || 0), 0) || 0;
          const completedCourses = courseProgress.data?.filter(cp => cp.status === 'completed').length || 0;
          const activeCourses = courseProgress.data?.filter(cp => cp.status === 'in_progress').length || 0;
          const activeGoals = goals.data?.filter(g => g.status === 'active').length || 0;
          const completedGoals = goals.data?.filter(g => g.status === 'completed').length || 0;

          return {
            profile,
            stats: {
              totalCourses: courseProgress.data?.length || 0,
              completedCourses,
              activeCourses,
              totalLearningMinutes: totalMinutes,
              totalLearningHours: (totalMinutes / 60).toFixed(2),
              totalSessions: sessions.data?.length || 0,
              totalRecords: records.data?.length || 0,
              totalPoints,
              totalRewards: rewards.data?.length || 0,
              activeGoals,
              completedGoals,
            },
          };
        })
      );

      exportUsersToCSV(usersWithDetails);
      toast.success('Data berhasil diexport!');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Gagal export data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredProfiles = profiles?.filter((profile: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      profile.full_name?.toLowerCase().includes(searchLower) ||
      profile.email?.toLowerCase().includes(searchLower);

    const isAdmin = userIsAdmin(profile.user_roles);
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' && isAdmin) ||
      (roleFilter === 'student' && !isAdmin);

    return matchesSearch && matchesRole;
  });

  const adminCount = profiles?.filter((p: any) => userIsAdmin(p.user_roles)).length || 0;
  const studentCount = (profiles?.length || 0) - adminCount;
  const totalLearningHours = userStats?.sessionsByUser
    ? Array.from(userStats.sessionsByUser.values()).reduce((a, b) => a + b, 0) / 60
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Manajemen Pengguna
            </h1>
            <p className="text-muted-foreground">
              Kelola pengguna, atur peran, dan pantau aktivitas pembelajaran
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={isExporting || !profiles || profiles.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Mengexport...' : 'Export ke CSV'}
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengguna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{profiles?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{adminCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Siswa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{studentCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Jam Belajar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{totalLearningHours.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">jam</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Daftar Pengguna
                </CardTitle>
                <CardDescription>
                  Menampilkan {filteredProfiles?.length || 0} dari {profiles?.length || 0} pengguna
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v: 'all' | 'admin' | 'student') => setRoleFilter(v)}>
                  <SelectTrigger className="w-36">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Peran</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="student">Siswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : filteredProfiles && filteredProfiles.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Peran</TableHead>
                      <TableHead>Waktu Belajar</TableHead>
                      <TableHead>Kursus</TableHead>
                      <TableHead>Poin</TableHead>
                      <TableHead>Bergabung</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile: any) => {
                      const isAdmin = userIsAdmin(profile.user_roles);
                      const learningMinutes = userStats?.sessionsByUser.get(profile.id) || 0;
                      const courses = userStats?.coursesByUser.get(profile.id) || { total: 0, completed: 0 };
                      const points = userStats?.pointsByUser.get(profile.id) || 0;

                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserCircle className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{profile.full_name}</p>
                                <p className="text-sm text-muted-foreground">{profile.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isAdmin ? 'default' : 'secondary'}>
                              {isAdmin ? (
                                <>
                                  <Shield className="h-3 w-3 mr-1" />
                                  Admin
                                </>
                              ) : (
                                'Siswa'
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {learningMinutes} menit
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              {courses.completed}/{courses.total}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Trophy className="h-4 w-4 text-muted-foreground" />
                              {points}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(profile.created_at), 'dd MMM yyyy', { locale: id })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/admin/users/${profile.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Lihat Detail
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleAdminMutation.mutate({ userId: profile.id, isAdmin })
                                  }
                                  disabled={toggleAdminMutation.isPending}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {isAdmin ? 'Hapus Admin' : 'Jadikan Admin'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : searchTerm || roleFilter !== 'all' ? (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">Tidak ada pengguna yang cocok dengan filter</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">Belum ada pengguna terdaftar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}