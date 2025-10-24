import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, BookOpen } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState } from 'react';

export default function LearningRecords() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: sessions } = useQuery({
    queryKey: ['learning-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_sessions')
        .select(`
          *,
          courses (title)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: records } = useQuery({
    queryKey: ['learning-records', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_records')
        .select(`
          *,
          courses (title)
        `)
        .eq('user_id', user!.id)
        .order('record_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDate = (date: Date) => {
    return sessions?.filter((session: any) =>
      isSameDay(new Date(session.session_date), date)
    );
  };

  const totalStudyTime = sessions?.reduce(
    (acc: number, session: any) => acc + (session.duration_minutes || 0),
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Catatan Pembelajaran
          </h1>
          <p className="text-muted-foreground">
            Lihat histori dan kalender belajar Anda
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-gradient-card border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Waktu Belajar</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalStudyTime || 0} menit</div>
              <p className="text-xs text-muted-foreground mt-1">Sepanjang waktu</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sesi Belajar</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{sessions?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total sesi</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktivitas</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{records?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total aktivitas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Kalender Pembelajaran</CardTitle>
              <CardDescription>
                {format(currentMonth, 'MMMM yyyy', { locale: id })}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Riwayat Sesi</CardTitle>
              <CardDescription>Sesi pembelajaran terbaru Anda</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions && sessions.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {sessions.slice(0, 10).map((session: any) => (
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
                      {session.notes && (
                        <p className="text-xs mt-2 text-muted-foreground">{session.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada sesi pembelajaran
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
