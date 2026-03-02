import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Send, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: unknown;
  points: number | null;
}

interface ExamQuestion {
  id: string;
  question_id: string;
  order_index: number | null;
  points: number | null;
  question: Question;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  total_points: number | null;
}

const TakeExam = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<{ id: string; started_at: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    fetchExamData();
  }, [id, user]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const fetchExamData = async () => {
    if (!id || !user) return;

    try {
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id, title, description, duration_minutes, total_points')
        .eq('id', id)
        .single();

      if (examError) throw examError;
      setExam(examData);

      // Check if already submitted
      const { data: submittedData } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('exam_id', id)
        .eq('student_id', user.id)
        .in('status', ['soumis', 'corrige'])
        .maybeSingle();

      if (submittedData) {
        toast.info('Vous avez déjà soumis cette épreuve');
        navigate('/my-exams');
        return;
      }

      // Fetch exam questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('exam_questions')
        .select(`
          id,
          question_id,
          order_index,
          points,
          question:questions(id, question_text, question_type, options, points)
        `)
        .eq('exam_id', id)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Get or create submission
      const { data: existingSubmission, error: subError } = await supabase
        .from('submissions')
        .select('id, started_at')
        .eq('exam_id', id)
        .eq('student_id', user.id)
        .eq('status', 'en_cours')
        .maybeSingle();

      if (subError) throw subError;

      if (existingSubmission) {
        setSubmission(existingSubmission);
        const startTime = new Date(existingSubmission.started_at).getTime();
        const durationMs = (examData.duration_minutes || 60) * 60 * 1000;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
        setTimeLeft(remaining);
      } else {
        // Create a new submission automatically
        const { data: newSubmission, error: createError } = await supabase
          .from('submissions')
          .insert({
            exam_id: id,
            student_id: user.id,
            status: 'en_cours',
            started_at: new Date().toISOString(),
          })
          .select('id, started_at')
          .single();

        if (createError) throw createError;
        setSubmission(newSubmission);
        setTimeLeft((examData.duration_minutes || 60) * 60);
      }

      // Load existing answers if any
      const { data: existingAnswers } = await supabase
        .from('answers')
        .select('question_id, answer_text')
        .eq('submission_id', existingSubmission?.id || '');

      if (existingAnswers) {
        const savedAnswers: Record<string, string> = {};
        existingAnswers.forEach(a => {
          if (a.question_id && a.answer_text) {
            savedAnswers[a.question_id] = a.answer_text;
          }
        });
        setAnswers(savedAnswers);
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('Erreur lors du chargement de l\'épreuve');
      navigate('/my-exams');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!submission || !user || submitting) return;

    setSubmitting(true);
    try {
      // Delete existing answers for this submission first (in case of retry)
      await supabase
        .from('answers')
        .delete()
        .eq('submission_id', submission.id);

      // Save all answers
      const answersToInsert = questions.map(eq => ({
        submission_id: submission.id,
        question_id: eq.question_id,
        answer_text: answers[eq.question_id] || null,
      }));

      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;

      // Update submission status
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          status: 'soumis',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      toast.success('Épreuve soumise avec succès');
      navigate('/my-results');
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Épreuve">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!exam) {
    return (
      <AppLayout title="Épreuve">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Épreuve non trouvée</p>
        </div>
      </AppLayout>
    );
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k]).length;
  const totalQuestions = questions.length;

  return (
    <AppLayout title={exam.title}>
      <div className="space-y-4 animate-fade-in pb-20 md:pb-0">
        {/* Timer and Progress */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              <span className={`font-mono text-lg font-bold ${timeLeft < 300 ? 'text-destructive' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {answeredCount}/{totalQuestions} questions répondues
            </div>
            <Button 
              onClick={() => setShowConfirmDialog(true)}
              disabled={submitting}
              className="gradient-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              Soumettre
            </Button>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((eq, index) => (
            <Card key={eq.id} className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-start gap-2">
                  <span className="text-primary font-mono">Q{index + 1}.</span>
                  <span>{eq.question.question_text}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {eq.points || eq.question.points} point{((eq.points || eq.question.points) || 0) > 1 ? 's' : ''}
                </p>
              </CardHeader>
              <CardContent>
                {eq.question.question_type === 'qcm' && eq.question.options && (
                  <RadioGroup
                    value={answers[eq.question_id] || ''}
                    onValueChange={(value) => handleAnswerChange(eq.question_id, value)}
                  >
                    {Array.isArray(eq.question.options) && (eq.question.options as string[]).map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2 py-2">
                        <RadioGroupItem value={option} id={`${eq.id}-${optIndex}`} />
                        <Label htmlFor={`${eq.id}-${optIndex}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {eq.question.question_type === 'vrai_faux' && (
                  <RadioGroup
                    value={answers[eq.question_id] || ''}
                    onValueChange={(value) => handleAnswerChange(eq.question_id, value)}
                  >
                    <div className="flex items-center space-x-2 py-2">
                      <RadioGroupItem value="Vrai" id={`${eq.id}-vrai`} />
                      <Label htmlFor={`${eq.id}-vrai`} className="cursor-pointer">Vrai</Label>
                    </div>
                    <div className="flex items-center space-x-2 py-2">
                      <RadioGroupItem value="Faux" id={`${eq.id}-faux`} />
                      <Label htmlFor={`${eq.id}-faux`} className="cursor-pointer">Faux</Label>
                    </div>
                  </RadioGroup>
                )}

                {(eq.question.question_type === 'reponse_courte' || eq.question.question_type === 'redaction') && (
                  <Textarea
                    placeholder="Votre réponse..."
                    value={answers[eq.question_id] || ''}
                    onChange={(e) => handleAnswerChange(eq.question_id, e.target.value)}
                    rows={eq.question.question_type === 'redaction' ? 6 : 2}
                    className="bg-input"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Confirm Submit Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Confirmer la soumission
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez répondu à {answeredCount} questions sur {totalQuestions}.
              {answeredCount < totalQuestions && (
                <span className="text-warning"> Attention: vous n'avez pas répondu à toutes les questions.</span>
              )}
              <br />
              Une fois soumise, vous ne pourrez plus modifier vos réponses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Soumission...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default TakeExam;
