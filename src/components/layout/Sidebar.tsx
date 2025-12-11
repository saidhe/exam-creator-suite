import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  BookOpen,
  HelpCircle,
  GraduationCap,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const Sidebar = () => {
  const { isProfesseur, isAdmin } = useAuth();

  const professorNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de Bord' },
    { to: '/exams', icon: FileText, label: 'Épreuves' },
    { to: '/questions', icon: HelpCircle, label: 'Banque de Questions' },
    { to: '/classes', icon: Users, label: 'Classes' },
    { to: '/analytics', icon: BarChart3, label: 'Rapports' },
  ];

  const studentNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
    { to: '/my-exams', icon: FileText, label: 'Mes Épreuves' },
    { to: '/my-results', icon: BarChart3, label: 'Mes Résultats' },
  ];

  const adminNavItems = [
    { to: '/admin/users', icon: UserCog, label: 'Gestion Utilisateurs' },
    { to: '/admin/subjects', icon: BookOpen, label: 'Matières' },
    { to: '/admin/levels', icon: GraduationCap, label: 'Niveaux' },
  ];

  const commonNavItems = [
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  const navItems = isProfesseur ? professorNavItems : studentNavItems;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col flex-1 min-h-0 pt-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">EvalPro</h2>
            <p className="text-xs text-muted-foreground">Gestion d'épreuves</p>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="mb-4">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Menu Principal
            </p>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          {isAdmin && (
            <div className="mb-4">
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administration
              </p>
              {adminNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                    )
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )}

          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Compte
            </p>
            {commonNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
