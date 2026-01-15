import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Award, TrendingUp, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Rewards() {
  const { user } = useAuth();

  const { data: rewards, isLoading } = useQuery({
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Penghargaan & Poin
          </h1>
          <p className="text-muted-foreground">
            Lihat pencapaian dan badge yang telah Anda raih
          </p>
        </div>

        <Card className="bg-gradient-card border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Total Poin</CardTitle>
            <CardDescription>Kumpulan poin dari semua pencapaian</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-6xl font-bold text-primary">{totalPoints}</div>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Memuat data...</p>
        ) : rewards && rewards.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward: any) => (
              <Card key={reward.id} className="shadow-md">
                <CardHeader>
                  <div
                    className={`w-16 h-16 rounded-full ${getBadgeColor(
                      reward.badge_type
                    )} flex items-center justify-center text-white mb-4`}
                  >
                    {getBadgeIcon(reward.badge_type)}
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {reward.badge_name}
                    <Badge variant="secondary">+{reward.points} poin</Badge>
                  </CardTitle>
                  <CardDescription>
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
          <Card className="shadow-md">
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Belum ada penghargaan. Terus belajar untuk mendapatkan badge pertama Anda!
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
