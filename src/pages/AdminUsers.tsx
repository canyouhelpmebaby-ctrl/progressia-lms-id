import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminUsers() {
  const queryClient = useQueryClient();

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

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
      } else {
        // Add admin role
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground">
            Kelola pengguna dan atur peran admin
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daftar Pengguna
            </CardTitle>
            <CardDescription>
              Total {profiles?.length || 0} pengguna terdaftar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : profiles && profiles.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Peran</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile: any) => {
                      const isAdmin = userIsAdmin(profile.user_roles);

                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <UserCircle className="h-5 w-5 text-muted-foreground" />
                              {profile.full_name}
                            </div>
                          </TableCell>
                          <TableCell>{profile.email}</TableCell>
                          <TableCell>
                            <Badge variant={isAdmin ? 'default' : 'secondary'}>
                              {isAdmin ? (
                                <>
                                  <Shield className="h-3 w-3 mr-1" />
                                  Admin
                                </>
                              ) : (
                                'Student'
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={isAdmin ? 'destructive' : 'default'}
                              size="sm"
                              onClick={() =>
                                toggleAdminMutation.mutate({
                                  userId: profile.id,
                                  isAdmin,
                                })
                              }
                              disabled={toggleAdminMutation.isPending}
                            >
                              {isAdmin ? 'Hapus Admin' : 'Jadikan Admin'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Belum ada pengguna terdaftar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}