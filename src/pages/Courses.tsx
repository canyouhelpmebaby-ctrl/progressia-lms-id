import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import iconCourses from '@/assets/icon-courses.png';

export default function Courses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: userProgress } = useQuery({
    queryKey: ['user-progress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const startCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('course_progress').insert({
        user_id: user!.id,
        course_id: courseId,
        status: 'in_progress',
        completed_modules: 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      toast.success('Berhasil memulai kursus!');
    },
    onError: (error: any) => {
      toast.error('Gagal memulai kursus: ' + error.message);
    },
  });

  const getCourseStatus = (courseId: string) => {
    return userProgress?.find((p: any) => p.course_id === courseId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Kursus Tersedia
          </h1>
          <p className="text-muted-foreground">
            Jelajahi kursus yang tersedia dan mulai perjalanan belajar Anda
          </p>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Memuat kursus...</p>
        ) : courses && courses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course: any) => {
              const status = getCourseStatus(course.id);
              const isEnrolled = !!status;

              return (
                <Card 
                  key={course.id} 
                  className="shadow-md hover:shadow-lg transition-shadow bg-gradient-card cursor-pointer"
                  onClick={() => isEnrolled && navigate(`/courses/${course.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <img src={iconCourses} alt="Course icon" className="h-12 w-12" />
                      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {course.total_modules} Modul
                      </div>
                    </div>
                    <CardTitle className="text-xl">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description || 'Tidak ada deskripsi'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEnrolled ? (
                      <Button 
                        className="w-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/courses/${course.id}`);
                        }}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Lihat Kursus
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          startCourseMutation.mutate(course.id);
                        }}
                        disabled={startCourseMutation.isPending}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {startCourseMutation.isPending ? 'Memproses...' : 'Mulai Kursus'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              Belum ada kursus tersedia saat ini
            </p>
          </div>
        )}
      </main>
    </div>
  );
}