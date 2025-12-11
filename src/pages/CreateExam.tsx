import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, FileCheck } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
}

interface Level {
  id: string;
  name: string;
}

interface Question {
  id?: string;
  question_text: string;
  question_type: 'qcm' | 'vrai_faux' | 'reponse_courte' | 'redaction';
  options: string[];
  correct_answer: string;
  points: number;
}

const CreateExam = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    level_id: '',
    duration_minutes: 60,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: '',
    question_type: 'qcm',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
  });

  useEffect(() => {
    const fetchData = async () => {
      const [subjectsRes, levelsRes] = await Promise.all([
        supabase.from('subjects').select('*'),
        supabase.from('levels').select('*'),
      ]);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (levelsRes.data) setLevels(levelsRes.data);
    };
    fetchData();
  }, []);

  const addQuestion = () => {
    if (!currentQuestion.question_text.trim()) {
      toast.error('Veuillez entrer une question');
      return;
    }
    setQuestions([...questions, { ...currentQuestion }]);
    setCurrentQuestion({
      question_text: '',
      question_type: 'qcm',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1,
    });
    setShowQuestionDialog(false);
    toast.success('Question ajoutée');
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (status: 'brouillon' | 'publie') => {
    if (!formData.title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }
    if (!formData.subject_id) {
      toast.error('Veuillez sélectionner une matière');
      return;
    }
    if (!formData.level_id) {
      toast.error('Veuillez sélectionner un niveau');
      return;
    }

    setLoading(true);
    try {
      // Create exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          title: formData.title,
          description: formData.description,
          subject_id: formData.subject_id,
          level_id: formData.level_id,
          duration_minutes: formData.duration_minutes,
          status,
          created_by: user?.id,
          total_points: questions.reduce((acc, q) => acc + q.points, 0),
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create questions and link them
      if (questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const { data: questionData, error: qError } = await supabase
            .from('questions')
            .insert({
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              correct_answer: q.correct_answer,
              points: q.points,
              subject_id: formData.subject_id,
              created_by: user?.id,
            })
            .select()
            .single();

          if (qError) throw qError;

          await supabase.from('exam_questions').insert({
            exam_id: exam.id,
            question_id: questionData.id,
            order_index: i,
            points: q.points,
          });
        }
      }

      toast.success(status === 'publie' ? 'Épreuve publiée !' : 'Brouillon enregistré');
      navigate('/exams');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Création d'Épreuve">
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <Button 
            onClick={() => handleSubmit('publie')}
            disabled={loading}
            className="gradient-primary"
          >
            Valider
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de l'épreuve</Label>
            <Input
              id="title"
              placeholder="Ex: Évaluation de Mathématiques N°1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Ajoutez une brève description de l'épreuve"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Matière</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select
                value={formData.level_id}
                onValueChange={(value) => setFormData({ ...formData, level_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Durée (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              max={240}
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
            />
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Questions</h3>
          
          <Card className="bg-card border-border border-dashed">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              {questions.length === 0 ? (
                <>
                  <FileCheck className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Ajoutez votre première question en utilisant le bouton ci-dessous.
                  </p>
                </>
              ) : (
                <div className="w-full space-y-3 mb-4">
                  {questions.map((q, index) => (
                    <Card key={index} className="bg-secondary border-0">
                      <CardContent className="p-4 flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-foreground">{q.question_text}</p>
                          <p className="text-sm text-muted-foreground">
                            {q.question_type === 'qcm' ? 'QCM' : 
                             q.question_type === 'vrai_faux' ? 'Vrai/Faux' :
                             q.question_type === 'reponse_courte' ? 'Réponse courte' : 'Rédaction'}
                            {' · '}{q.points} point{q.points > 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeQuestion(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
                <DialogTrigger asChild>
                  <Button className="gradient-success text-success-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une question
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nouvelle Question</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Type de question</Label>
                      <Select
                        value={currentQuestion.question_type}
                        onValueChange={(value: 'qcm' | 'vrai_faux' | 'reponse_courte' | 'redaction') => 
                          setCurrentQuestion({ ...currentQuestion, question_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="qcm">QCM</SelectItem>
                          <SelectItem value="vrai_faux">Vrai/Faux</SelectItem>
                          <SelectItem value="reponse_courte">Réponse courte</SelectItem>
                          <SelectItem value="redaction">Rédaction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Textarea
                        placeholder="Entrez votre question..."
                        value={currentQuestion.question_text}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                      />
                    </div>

                    {currentQuestion.question_type === 'qcm' && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {currentQuestion.options.map((opt, idx) => (
                          <Input
                            key={idx}
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...currentQuestion.options];
                              newOptions[idx] = e.target.value;
                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Réponse correcte</Label>
                      {currentQuestion.question_type === 'vrai_faux' ? (
                        <Select
                          value={currentQuestion.correct_answer}
                          onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correct_answer: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vrai">Vrai</SelectItem>
                            <SelectItem value="faux">Faux</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="Réponse correcte"
                          value={currentQuestion.correct_answer}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={currentQuestion.points}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <Button onClick={addQuestion} className="w-full gradient-primary">
                      Ajouter
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 pb-20 md:pb-0">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => handleSubmit('brouillon')}
            disabled={loading}
          >
            Enregistrer brouillon
          </Button>
          <Button 
            className="flex-1 gradient-primary"
            onClick={() => handleSubmit('publie')}
            disabled={loading}
          >
            Publier l'épreuve
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreateExam;
