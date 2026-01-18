import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';

export default function LearningTimer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [sessionType, setSessionType] = useState<'study' | 'break'>('study');
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(25);

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      return data;
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['learning-sessions'] });
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
    if (!isActive && !selectedCourse) {
      toast.error('Pilih kursus terlebih dahulu sebelum memulai timer');
      return;
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Waktu Pembelajaran
          </h1>
          <p className="text-muted-foreground">
            Kelola waktu belajar dengan teknik Pomodoro
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Waktu</CardTitle>
              <CardDescription>Atur waktu fokus dan istirahat Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Pengaturan Sesi</CardTitle>
              <CardDescription>Pilih kursus yang sedang dipelajari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Kursus <span className="text-destructive">*</span>
                </label>
                <Select 
                  value={selectedCourse} 
                  onValueChange={setSelectedCourse}
                  disabled={isActive}
                >
                  <SelectTrigger className={!selectedCourse && !isActive ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Pilih kursus (wajib)" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedCourse && !isActive && (
                  <p className="text-sm text-destructive mt-1">Pilih kursus sebelum memulai timer</p>
                )}
                {isActive && (
                  <p className="text-sm text-muted-foreground mt-1">Kursus terkunci saat timer berjalan</p>
                )}
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
