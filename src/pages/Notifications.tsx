import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user!.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      toast.success('Semua notifikasi ditandai sudah dibaca');
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Notifikasi
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `Anda memiliki ${unreadCount} notifikasi yang belum dibaca`
                : 'Semua notifikasi sudah dibaca'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Tandai Semua Dibaca
            </Button>
          )}
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Daftar Notifikasi
            </CardTitle>
            <CardDescription>
              Lihat semua notifikasi dan pengingat pembelajaran Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Memuat notifikasi...</p>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.read
                        ? 'bg-background border-border'
                        : 'bg-gradient-card border-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{notification.title}</h3>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: idLocale,
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Belum ada notifikasi
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}