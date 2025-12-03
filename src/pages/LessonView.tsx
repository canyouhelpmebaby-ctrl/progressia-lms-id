import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle, List, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function LessonView() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: module } = useQuery({
    queryKey: ['module', lesson?.module_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', lesson?.module_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lesson?.module_id,
  });

  const { data: allLessons } = useQuery({
    queryKey: ['module-lessons', lesson?.module_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', lesson?.module_id)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!lesson?.module_id,
  });

  const { data: progress } = useQuery({
    queryKey: ['lesson-progress', user?.id, lessonId],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!lessonId,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !lessonId) throw new Error('User or lesson not found');

      if (progress) {
        const { error } = await supabase
          .from('user_lesson_progress')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', progress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_lesson_progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      toast.success('Materi ditandai sebagai selesai!');
    },
    onError: () => {
      toast.error('Gagal menandai materi sebagai selesai');
    },
  });

  const getCurrentLessonIndex = () => {
    return allLessons?.findIndex(l => l.id === lessonId) ?? -1;
  };

  const getPreviousLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex > 0 && allLessons) {
      return allLessons[currentIndex - 1];
    }
    return null;
  };

  const getNextLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex >= 0 && allLessons && currentIndex < allLessons.length - 1) {
      return allLessons[currentIndex + 1];
    }
    return null;
  };

  if (lessonLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat materi...</p>
          </div>
        </div>
      </>
    );
  }

  if (!lesson) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Materi tidak ditemukan</p>
        </div>
      </>
    );
  }

  const previousLesson = getPreviousLesson();
  const nextLesson = getNextLesson();
  const isCompleted = progress?.completed || false;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            <List className="mr-2 h-4 w-4" />
            Kembali ke Daftar Modul
          </Button>

          <Card className="shadow-lg">
            <CardContent className="pt-8">
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <h1 className="text-4xl font-bold mb-2 pb-4 border-b-2 border-primary">
                  {lesson.title}
                </h1>

                {lesson.image_url && (
                  <img
                    src={lesson.image_url}
                    alt={lesson.title}
                    className="w-full rounded-lg my-6"
                  />
                )}

                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({children}) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
                    h2: ({children}) => <h2 className="text-2xl font-semibold mt-6 mb-3">{children}</h2>,
                    h3: ({children}) => <h3 className="text-xl font-semibold mt-5 mb-2">{children}</h3>,
                    p: ({children}) => <p className="mb-4 text-foreground leading-relaxed">{children}</p>,
                    ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                    li: ({children}) => <li className="text-foreground">{children}</li>,
                    strong: ({children}) => <strong className="font-bold">{children}</strong>,
                    em: ({children}) => <em className="italic">{children}</em>,
                    blockquote: ({children}) => <blockquote className="border-l-4 border-primary pl-4 italic my-4">{children}</blockquote>,
                    code: ({children}) => <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>,
                  }}
                >
                  {lesson.content_html}
                </ReactMarkdown>
              </div>

              <div className="mt-8 pt-6 border-t">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => previousLesson && navigate(`/courses/${courseId}/lessons/${previousLesson.id}`)}
                    disabled={!previousLesson}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Materi Sebelumnya
                  </Button>

                  <Button
                    variant={isCompleted ? "secondary" : "default"}
                    onClick={() => markCompleteMutation.mutate()}
                    disabled={isCompleted || markCompleteMutation.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isCompleted ? 'Sudah Selesai' : 'Tandai Selesai'}
                  </Button>

                  <Button
                    onClick={() => nextLesson && navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                    disabled={!nextLesson}
                  >
                    Materi Selanjutnya
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
