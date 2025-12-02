import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function QuizPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['quiz-questions', quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
  });

  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['quiz-options', quizId],
    queryFn: async () => {
      if (!questions || questions.length === 0) return [];
      const questionIds = questions.map(q => q.id);
      const { data, error } = await supabase
        .from('quiz_options')
        .select('*')
        .in('question_id', questionIds)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!questions && questions.length > 0,
  });

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!user || !quiz || !questions || !options) {
        throw new Error('Data tidak lengkap');
      }

      let totalScore = 0;
      let earnedScore = 0;

      questions.forEach(question => {
        const questionOptions = options.filter(o => o.question_id === question.id);
        const correctOption = questionOptions.find(o => o.is_correct);
        const userAnswer = answers[question.id];

        totalScore += question.points;
        if (userAnswer === correctOption?.id) {
          earnedScore += question.points;
        }
      });

      const score = Math.round((earnedScore / totalScore) * 100);
      const passed = score >= quiz.passing_score;

      const { error } = await supabase
        .from('user_quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quizId!,
          score,
          passed,
          answers: answers,
        });

      if (error) throw error;

      return { score, passed };
    },
    onSuccess: (data) => {
      setResult(data);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      
      if (data.passed) {
        toast.success(`Selamat! Anda lulus dengan nilai ${data.score}`);
      } else {
        toast.error(`Nilai Anda ${data.score}. Nilai minimal: ${quiz?.passing_score}`);
      }
    },
    onError: () => {
      toast.error('Gagal menyimpan hasil kuis');
    },
  });

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    if (!questions) return;
    
    const allAnswered = questions.every(q => answers[q.id]);
    if (!allAnswered) {
      toast.error('Mohon jawab semua pertanyaan');
      return;
    }

    submitQuizMutation.mutate();
  };

  const getQuestionOptions = (questionId: string) => {
    return options?.filter(o => o.question_id === questionId) || [];
  };

  if (quizLoading || questionsLoading || optionsLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat kuis...</p>
          </div>
        </div>
      </>
    );
  }

  if (!quiz || !questions) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Kuis tidak ditemukan</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="text-3xl">{quiz.title}</CardTitle>
              <p className="text-muted-foreground mt-2">
                Nilai minimal untuk lulus: {quiz.passing_score}%
              </p>
            </CardHeader>
          </Card>

          {!submitted ? (
            <>
              <div className="space-y-6">
                {questions.map((question, index) => {
                  const questionOptions = getQuestionOptions(question.id);
                  return (
                    <Card key={question.id} className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Pertanyaan {index + 1}
                        </CardTitle>
                        <p className="text-base mt-2">{question.question_text}</p>
                        <p className="text-sm text-muted-foreground">Poin: {question.points}</p>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup
                          value={answers[question.id] || ''}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                        >
                          {questionOptions.map((option) => (
                            <div key={option.id} className="flex items-center space-x-2 mb-3">
                              <RadioGroupItem value={option.id} id={option.id} />
                              <Label htmlFor={option.id} className="cursor-pointer flex-1">
                                {option.option_text}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitQuizMutation.isPending}
                >
                  {submitQuizMutation.isPending ? 'Menyimpan...' : 'Submit Jawaban'}
                </Button>
              </div>
            </>
          ) : (
            <Card className="shadow-lg">
              <CardContent className="pt-8 text-center">
                {result?.passed ? (
                  <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto mb-4" />
                ) : (
                  <XCircle className="h-20 w-20 text-destructive mx-auto mb-4" />
                )}
                <h2 className="text-3xl font-bold mb-2">
                  {result?.passed ? 'Selamat!' : 'Belum Lulus'}
                </h2>
                <p className="text-xl mb-6">
                  Nilai Anda: <span className="font-bold text-primary">{result?.score}%</span>
                </p>
                <p className="text-muted-foreground mb-8">
                  {result?.passed
                    ? 'Anda telah berhasil menyelesaikan kuis ini.'
                    : `Nilai minimal: ${quiz.passing_score}%. Silakan coba lagi.`}
                </p>
                <Button onClick={() => navigate(`/courses/${courseId}`)}>
                  Kembali ke Kursus
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
