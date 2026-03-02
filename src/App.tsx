import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Exams from "./pages/Exams";
import CreateExam from "./pages/CreateExam";
import Questions from "./pages/Questions";
import Classes from "./pages/Classes";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Corrections from "./pages/Corrections";
import MyExams from "./pages/MyExams";
import MyResults from "./pages/MyResults";
import TakeExam from "./pages/TakeExam";
import ExamSubmissions from "./pages/ExamSubmissions";
import AdminUsers from "./pages/admin/Users";
import AdminSubjects from "./pages/admin/Subjects";
import AdminLevels from "./pages/admin/Levels";
import SendNotifications from "./pages/admin/SendNotifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
      <Route path="/exams/create" element={<ProtectedRoute><CreateExam /></ProtectedRoute>} />
      <Route path="/exams/:id/submissions" element={<ProtectedRoute><ExamSubmissions /></ProtectedRoute>} />
      <Route path="/questions" element={<ProtectedRoute><Questions /></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/corrections/:id" element={<ProtectedRoute><Corrections /></ProtectedRoute>} />
      
      {/* Student routes */}
      <Route path="/my-exams" element={<ProtectedRoute><MyExams /></ProtectedRoute>} />
      <Route path="/my-results" element={<ProtectedRoute><MyResults /></ProtectedRoute>} />
      <Route path="/take-exam/:id" element={<ProtectedRoute><TakeExam /></ProtectedRoute>} />
      
      {/* Admin routes */}
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/subjects" element={<ProtectedRoute><AdminSubjects /></ProtectedRoute>} />
      <Route path="/admin/levels" element={<ProtectedRoute><AdminLevels /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute><SendNotifications /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
