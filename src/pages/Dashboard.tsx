import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, CheckCircle, Clock, Plus, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Exam {
  id: string;
  title: string;
  status: string;
  subject: { name: string; color: string } | null;
  level: { name: string } | null;
}

interface Submission {
  id: string;
  exam: { title: string; subject: { name: string } | null } | null;
  student: { full_name: string; email: string } | null;
}

const Dashboard = () => {
  const { user, isProfesseur } = useAuth();
  const [stats, setStats] = useState({
    averageScore: 0,
    successRate: 0,
    activeExams: 0,
  });
  const [pendingCorrections, setPendingCorrections] = useState<Submission[]>([]);
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch exams
        const { data: examsData } = await supabase
          .from('exams')
          .select(`
            id,
            title,
            status,
            subject:subjects(name, color),
            level:levels(name)
          `)
          .order('created_at', { ascending: false })
          .limit(6);

        if (examsData) {
          setRecentExams(examsData as unknown as Exam[]);
          setStats(prev => ({
            ...prev,
            activeExams: examsData.filter(e => e.status === 'publie').length
          }));
        }

        // Fetch pending corrections
        if (isProfesseur) {
          const { data: submissionsData } = await supabase
            .from('submissions')
            .select(`
              id,
              exam:exams(title, subject:subjects(name)),
              student:profiles(full_name, email)
            `)
            .eq('status', 'soumis')
            .limit(5);

          if (submissionsData) {
            setPendingCorrections(submissionsData as unknown as Submission[]);
          }
        }

        // Calculate stats
        const { data: completedSubmissions } = await supabase
          .from('submissions')
          .select('score')
          .not('score', 'is', null);

        if (completedSubmissions && completedSubmissions.length > 0) {
          const total = completedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0);
          const avg = total / completedSubmissions.length;
          const passing = completedSubmissions.filter(s => (s.score || 0) >= 10).length;
          
          setStats(prev => ({
            ...prev,
            averageScore: Math.round(avg * 10) / 10,
            successRate: Math.round((passing / completedSubmissions.length) * 100),
          }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isProfesseur]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'publie':
        return <Badge className="bg-success/20 text-success border-0">Publié</Badge>;
      case 'brouillon':
        return <Badge className="bg-warning/20 text-warning border-0">Brouillon</Badge>;
      case 'corrige':
        return <Badge className="bg-primary/20 text-primary border-0">Corrigé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Tableau de Bord">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Bonjour, {isProfesseur ? 'Professeur' : 'Étudiant'}!
          </h2>
          <p className="text-muted-foreground">
            {isProfesseur 
              ? 'Gérez vos épreuves et suivez les performances de vos étudiants.'
              : 'Consultez vos épreuves à venir et vos résultats.'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="gradient-primary border-0 shadow-glow">
            <CardContent className="p-4">
              <p className="text-sm text-primary-foreground/80">Note Moyenne</p>
              <p className="text-3xl font-bold text-primary-foreground">{stats.averageScore}/20</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Taux de réussite</p>
              <p className="text-3xl font-bold text-foreground">{stats.successRate}%</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Épreuves actives</p>
              <p className="text-3xl font-bold text-foreground">{stats.activeExams}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Corrections - Only for professors */}
        {isProfesseur && pendingCorrections.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Corrections en Attente</h3>
            <div className="space-y-2">
              {pendingCorrections.map((submission) => (
                <Card key={submission.id} className="bg-card border-border hover:bg-secondary/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{submission.exam?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {submission.student?.full_name || submission.student?.email}
                        </p>
                      </div>
                    </div>
                    <Link to={`/corrections/${submission.id}`}>
                      <Button size="sm" className="gradient-success text-success-foreground">
                        Corriger
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Exams */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Épreuves Créées</h3>
            {isProfesseur && (
              <Link to="/exams/create">
                <Button size="sm" className="gradient-success text-success-foreground">
                  <Plus className="w-4 h-4 mr-1" />
                  Nouvelle
                </Button>
              </Link>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentExams.map((exam) => (
              <Link key={exam.id} to={`/exams/${exam.id}`}>
                <Card className="bg-card border-border hover:border-primary/50 transition-all group cursor-pointer h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${exam.subject?.color}20`, color: exam.subject?.color }}
                      >
                        {exam.subject?.name?.charAt(0) || 'E'}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {exam.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {exam.level?.name} - {exam.subject?.name}
                      </p>
                    </div>
                    {getStatusBadge(exam.status)}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
