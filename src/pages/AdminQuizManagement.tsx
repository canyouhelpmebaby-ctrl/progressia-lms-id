import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface QuestionData {
  id?: string;
  question_text: string;
  points: number;
  options: Array<{
    id?: string;
    option_text: string;
    is_correct: boolean;
  }>;
}

export default function AdminQuizManagement() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [questions, setQuestions] = useState<QuestionData[]>([]);

  const { data: quiz, isLoading } = useQuery({
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
    enabled: !!quizId,
  });

  const { data: existingQuestions } = useQuery({
    queryKey: ['quiz-questions', quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*, quiz_options(*)')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
  });

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title);
      setPassingScore(quiz.passing_score.toString());
    }
  }, [quiz]);

  useEffect(() => {
    if (existingQuestions) {
      const formattedQuestions = existingQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        points: q.points,
        options: q.quiz_options.map((o: any) => ({
          id: o.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
        })),
      }));
      setQuestions(formattedQuestions);
    }
  }, [existingQuestions]);

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      if (!quizId) throw new Error('Quiz ID not found');

      // Update quiz
      const { error: quizError } = await supabase
        .from('quizzes')
        .update({
          title,
          passing_score: parseInt(passingScore),
        })
        .eq('id', quizId);
      if (quizError) throw quizError;

      // Delete all existing questions and options
      const { error: deleteError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);
      if (deleteError) throw deleteError;

      // Insert new questions and options
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const { data: newQuestion, error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quizId,
            question_text: question.question_text,
            points: question.points,
            order_index: i,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        for (let j = 0; j < question.options.length; j++) {
          const option = question.options[j];
          const { error: optionError } = await supabase
            .from('quiz_options')
            .insert({
              question_id: newQuestion.id,
              option_text: option.option_text,
              is_correct: option.is_correct,
              order_index: j,
            });

          if (optionError) throw optionError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      toast.success('Kuis berhasil disimpan');
    },
    onError: () => {
      toast.error('Gagal menyimpan kuis');
    },
  });

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        points: 1,
        options: [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionData, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options.push({ option_text: '', is_correct: false });
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = {
      ...updated[questionIndex].options[optionIndex],
      [field]: value,
    };
    setQuestions(updated);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Judul kuis harus diisi');
      return;
    }
    if (questions.length === 0) {
      toast.error('Minimal harus ada 1 pertanyaan');
      return;
    }
    for (const q of questions) {
      if (!q.question_text.trim()) {
        toast.error('Semua pertanyaan harus diisi');
        return;
      }
      if (q.options.length < 2) {
        toast.error('Setiap pertanyaan harus memiliki minimal 2 pilihan');
        return;
      }
      const hasCorrect = q.options.some(o => o.is_correct);
      if (!hasCorrect) {
        toast.error('Setiap pertanyaan harus memiliki minimal 1 jawaban benar');
        return;
      }
    }
    saveQuizMutation.mutate();
  };

  if (isLoading) {
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <BackButton />

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Manajemen Kuis</h1>
            <Button onClick={handleSave} disabled={saveQuizMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Simpan Semua
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pengaturan Kuis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Judul Kuis</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masukkan judul kuis"
                />
              </div>
              <div>
                <Label htmlFor="passing">Nilai Lulus (%)</Label>
                <Input
                  id="passing"
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <Card key={qIndex}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Pertanyaan {qIndex + 1}</CardTitle>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Teks Pertanyaan</Label>
                    <Input
                      value={question.question_text}
                      onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                      placeholder="Masukkan pertanyaan"
                    />
                  </div>
                  <div>
                    <Label>Poin</Label>
                    <Input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                      min="1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Pilihan Jawaban</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(qIndex)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah Pilihan
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <Checkbox
                            checked={option.is_correct}
                            onCheckedChange={(checked) =>
                              updateOption(qIndex, oIndex, 'is_correct', checked)
                            }
                          />
                          <Input
                            value={option.option_text}
                            onChange={(e) =>
                              updateOption(qIndex, oIndex, 'option_text', e.target.value)
                            }
                            placeholder={`Pilihan ${oIndex + 1}`}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(qIndex, oIndex)}
                            disabled={question.options.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full mt-6"
            onClick={addQuestion}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pertanyaan
          </Button>
        </div>
      </div>
    </>
  );
}
