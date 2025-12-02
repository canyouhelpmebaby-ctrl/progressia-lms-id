import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { useState } from 'react';

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      if (!modules || modules.length === 0) return [];
      const moduleIds = modules.map(m => m.id);
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .in('module_id', moduleIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!modules && modules.length > 0,
  });

  const { data: progress } = useQuery({
    queryKey: ['lesson-progress', user?.id, courseId],
    queryFn: async () => {
      if (!user || !lessons) return [];
      const lessonIds = lessons.map(l => l.id);
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!lessons,
  });

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const getModuleLessons = (moduleId: string) => {
    return lessons?.filter(l => l.module_id === moduleId) || [];
  };

  const isLessonCompleted = (lessonId: string) => {
    return progress?.some(p => p.lesson_id === lessonId && p.completed) || false;
  };

  const calculateProgress = () => {
    if (!lessons || lessons.length === 0) return 0;
    const completed = progress?.filter(p => p.completed).length || 0;
    return Math.round((completed / lessons.length) * 100);
  };

  const getNextLesson = () => {
    if (!lessons || lessons.length === 0) return null;
    const incomplete = lessons.find(l => !isLessonCompleted(l.id));
    return incomplete || lessons[0];
  };

  if (courseLoading || modulesLoading || lessonsLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat kursus...</p>
          </div>
        </div>
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Kursus tidak ditemukan</p>
        </div>
      </>
    );
  }

  const progressPercentage = calculateProgress();
  const nextLesson = getNextLesson();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">{course.title}</CardTitle>
              <CardDescription className="text-base mt-2">{course.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress Anda</span>
                    <span className="font-semibold text-primary">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>
                {nextLesson && (
                  <Button
                    onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    <PlayCircle className="mr-2 h-5 w-5" />
                    {progressPercentage === 0 ? 'Mulai Belajar' : 'Lanjutkan Belajar'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Daftar Modul</h2>
            {modules && modules.length > 0 ? (
              modules.map((module, index) => {
                const moduleLessons = getModuleLessons(module.id);
                const completedCount = moduleLessons.filter(l => isLessonCompleted(l.id)).length;
                const isExpanded = expandedModules.has(module.id);

                return (
                  <Card key={module.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <div>
                              <CardTitle className="text-lg">
                                Modul {index + 1}: {module.title}
                              </CardTitle>
                              {module.description && (
                                <CardDescription className="mt-1">{module.description}</CardDescription>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 text-sm text-muted-foreground whitespace-nowrap">
                          {completedCount}/{moduleLessons.length} selesai
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="space-y-2 ml-8">
                          {moduleLessons.map((lesson, lessonIndex) => {
                            const completed = isLessonCompleted(lesson.id);
                            return (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                                onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                              >
                                {completed ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="text-sm text-muted-foreground flex-shrink-0">
                                  {lessonIndex + 1}.
                                </span>
                                <span className={`flex-1 ${completed ? 'text-muted-foreground' : 'font-medium group-hover:text-primary'}`}>
                                  {lesson.title}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Belum ada modul untuk kursus ini.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
