import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Award, Download, Eye, GraduationCap, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CompletedCourse {
  courseId: string;
  courseTitle: string;
  completedAt: string;
  certificate?: {
    id: string;
    certificateNumber: string;
    issuedAt: string;
  };
}

export default function Certificates() {
  const { user } = useAuth();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<CompletedCourse | null>(null);

  // Fetch completed courses and certificates
  const { data: completedCourses, isLoading, refetch } = useQuery({
    queryKey: ['user-completed-courses', user?.id],
    queryFn: async () => {
      // Get all courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title');

      if (coursesError) throw coursesError;

      // Get user certificates
      const { data: certificates, error: certsError } = await supabase
        .from('user_certificates')
        .select('*')
        .eq('user_id', user!.id);

      if (certsError) throw certsError;

      // Get user lesson progress
      const { data: lessonProgress, error: progressError } = await supabase
        .from('user_lesson_progress')
        .select(`
          lesson_id,
          completed,
          completed_at,
          lessons:lesson_id (
            id,
            is_active,
            modules:module_id (
              id,
              course_id,
              is_active
            )
          )
        `)
        .eq('user_id', user!.id)
        .eq('completed', true);

      if (progressError) throw progressError;

      // Calculate completion for each course
      const completedCoursesList: CompletedCourse[] = [];

      for (const course of courses || []) {
        // Get all active lessons for this course
        const { data: courseLessons, error: lessonsError } = await supabase
          .from('lessons')
          .select(`
            id,
            is_active,
            modules:module_id (
              id,
              course_id,
              is_active
            )
          `)
          .eq('is_active', true);

        if (lessonsError) continue;

        const lessonsForCourse = (courseLessons || []).filter(
          (lesson: any) => lesson.modules?.course_id === course.id && lesson.modules?.is_active
        );

        if (lessonsForCourse.length === 0) continue;

        // Count completed lessons for this course
        const completedLessonsForCourse = (lessonProgress || []).filter((progress: any) => {
          return (
            progress.lessons?.modules?.course_id === course.id &&
            progress.lessons?.is_active &&
            progress.lessons?.modules?.is_active
          );
        });

        // Check if all lessons are completed
        if (completedLessonsForCourse.length >= lessonsForCourse.length) {
          const latestCompletion = completedLessonsForCourse.reduce((latest: any, current: any) => {
            if (!latest) return current;
            return new Date(current.completed_at) > new Date(latest.completed_at)
              ? current
              : latest;
          }, null);

          const certificate = (certificates || []).find(
            (cert: any) => cert.course_id === course.id
          );

          completedCoursesList.push({
            courseId: course.id,
            courseTitle: course.title,
            completedAt: latestCompletion?.completed_at || new Date().toISOString(),
            certificate: certificate
              ? {
                  id: certificate.id,
                  certificateNumber: certificate.certificate_number,
                  issuedAt: certificate.issued_at,
                }
              : undefined,
          });
        }
      }

      return completedCoursesList;
    },
    enabled: !!user,
  });

  // Generate certificate mutation
  const generateCertMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('generate-certificate', {
        body: { courseId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate certificate');
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.svg) {
        setPreviewSvg(data.svg);
        setPreviewOpen(true);
      }
      refetch();
    },
    onError: (error: any) => {
      toast.error('Gagal menghasilkan sertifikat: ' + error.message);
    },
  });

  const handlePreview = async (course: CompletedCourse) => {
    setSelectedCourse(course);
    generateCertMutation.mutate(course.courseId);
  };

  const handleDownload = async (course: CompletedCourse) => {
    setSelectedCourse(course);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('generate-certificate', {
        body: { courseId: course.courseId },
      });

      if (response.error || !response.data.svg) {
        throw new Error('Failed to generate certificate');
      }

      // Convert SVG to downloadable file
      const svgBlob = new Blob([response.data.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sertifikat-${course.courseTitle.replace(/\s+/g, '-')}-${response.data.certificate.certificateNumber}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Sertifikat berhasil diunduh!');
    } catch (error: any) {
      toast.error('Gagal mengunduh sertifikat: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Sertifikat Saya
          </h1>
          <p className="text-muted-foreground">
            Lihat dan unduh sertifikat kursus yang telah Anda selesaikan
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Memuat data...</span>
          </div>
        ) : completedCourses && completedCourses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {completedCourses.map((course) => (
              <Card key={course.courseId} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white mb-4">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-lg">{course.courseTitle}</CardTitle>
                  <CardDescription>
                    Selesai pada{' '}
                    {new Date(course.completedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.certificate ? (
                    <>
                      <Badge variant="secondary" className="text-xs">
                        No. {course.certificate.certificateNumber}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(course)}
                          disabled={generateCertMutation.isPending && selectedCourse?.courseId === course.courseId}
                        >
                          {generateCertMutation.isPending && selectedCourse?.courseId === course.courseId ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4 mr-1" />
                          )}
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(course)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Unduh
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      onClick={() => handlePreview(course)}
                      disabled={generateCertMutation.isPending && selectedCourse?.courseId === course.courseId}
                    >
                      {generateCertMutation.isPending && selectedCourse?.courseId === course.courseId ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Award className="h-4 w-4 mr-1" />
                      )}
                      Dapatkan Sertifikat
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-md">
            <CardContent className="text-center py-12">
              <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum Ada Sertifikat</h3>
              <p className="text-muted-foreground">
                Selesaikan kursus 100% untuk mendapatkan sertifikat penyelesaian.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Certificate Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Preview Sertifikat</DialogTitle>
            </DialogHeader>
            <div 
              className="w-full bg-white rounded-lg shadow-inner p-4"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
            {selectedCourse && (
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Tutup
                </Button>
                <Button onClick={() => handleDownload(selectedCourse)}>
                  <Download className="h-4 w-4 mr-1" />
                  Unduh Sertifikat
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
