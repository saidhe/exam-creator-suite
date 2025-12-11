-- Enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'professeur', 'etudiant');

-- Enum pour le type de question
CREATE TYPE public.question_type AS ENUM ('qcm', 'vrai_faux', 'reponse_courte', 'redaction');

-- Enum pour la difficulté
CREATE TYPE public.difficulty_level AS ENUM ('facile', 'moyen', 'difficile');

-- Enum pour le statut d'épreuve
CREATE TYPE public.exam_status AS ENUM ('brouillon', 'publie', 'corrige', 'archive');

-- Table des profils utilisateurs
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des rôles utilisateurs (SÉCURITÉ: séparée des profils)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'etudiant',
    UNIQUE(user_id, role)
);

-- Table des matières
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des niveaux
CREATE TABLE public.levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des classes
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    level_id UUID REFERENCES public.levels(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des étudiants dans les classes
CREATE TABLE public.class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- Table banque de questions
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL DEFAULT 'qcm',
    difficulty difficulty_level DEFAULT 'moyen',
    subject_id UUID REFERENCES public.subjects(id),
    points INTEGER DEFAULT 1,
    options JSONB,
    correct_answer TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des épreuves
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id),
    level_id UUID REFERENCES public.levels(id),
    class_id UUID REFERENCES public.classes(id),
    duration_minutes INTEGER DEFAULT 60,
    total_points INTEGER DEFAULT 20,
    status exam_status DEFAULT 'brouillon',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table questions d'épreuve
CREATE TABLE public.exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id),
    order_index INTEGER DEFAULT 0,
    points INTEGER DEFAULT 1
);

-- Table des soumissions
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    score DECIMAL(5,2),
    status TEXT DEFAULT 'en_cours',
    graded_by UUID REFERENCES auth.users(id),
    graded_at TIMESTAMP WITH TIME ZONE
);

-- Table des réponses
CREATE TABLE public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id),
    answer_text TEXT,
    is_correct BOOLEAN,
    points_awarded DECIMAL(5,2),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Fonction pour vérifier le rôle
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Fonction pour obtenir le rôle
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Trigger pour créer le profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'etudiant');
    
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: tous peuvent voir, seul le propriétaire peut modifier
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles: visible par admins, propre rôle visible par l'utilisateur
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Subjects: tous peuvent voir
CREATE POLICY "Subjects viewable by all" ON public.subjects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage subjects" ON public.subjects
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Levels: tous peuvent voir
CREATE POLICY "Levels viewable by all" ON public.levels
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage levels" ON public.levels
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Classes
CREATE POLICY "Classes viewable by authenticated" ON public.classes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can manage classes" ON public.classes
    FOR ALL TO authenticated 
    USING (public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

-- Class students
CREATE POLICY "Class students viewable" ON public.class_students
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can manage class students" ON public.class_students
    FOR ALL TO authenticated 
    USING (public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

-- Questions
CREATE POLICY "Questions viewable by teachers and admins" ON public.questions
    FOR SELECT TO authenticated 
    USING (public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage questions" ON public.questions
    FOR ALL TO authenticated 
    USING (public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

-- Exams
CREATE POLICY "Published exams viewable by students" ON public.exams
    FOR SELECT TO authenticated USING (
        status = 'publie' OR 
        created_by = auth.uid() OR 
        public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Teachers can manage exams" ON public.exams
    FOR ALL TO authenticated 
    USING (public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

-- Exam questions
CREATE POLICY "Exam questions viewable" ON public.exam_questions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can manage exam questions" ON public.exam_questions
    FOR ALL TO authenticated 
    USING (public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

-- Submissions
CREATE POLICY "Students can view own submissions" ON public.submissions
    FOR SELECT TO authenticated 
    USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can create submissions" ON public.submissions
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can grade submissions" ON public.submissions
    FOR UPDATE TO authenticated 
    USING (public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

-- Answers
CREATE POLICY "Answers viewable by owner and teachers" ON public.answers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can create answers" ON public.answers
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Teachers can update answers" ON public.answers
    FOR UPDATE TO authenticated 
    USING (public.has_role(auth.uid(), 'professeur') OR public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Données initiales
INSERT INTO public.subjects (name, description, color) VALUES
    ('Mathématiques', 'Algèbre, géométrie, analyse', '#3B82F6'),
    ('Physique', 'Mécanique, optique, électricité', '#8B5CF6'),
    ('Chimie', 'Chimie organique et inorganique', '#10B981'),
    ('Histoire', 'Histoire mondiale et locale', '#F59E0B'),
    ('Géographie', 'Géographie physique et humaine', '#06B6D4'),
    ('Anglais', 'Langue anglaise', '#EC4899');

INSERT INTO public.levels (name, description) VALUES
    ('IUT Niv. 1', 'Première année IUT'),
    ('IUT Niv. 2', 'Deuxième année IUT'),
    ('IUT Niv. 3', 'Troisième année IUT'),
    ('Licence 1', 'Première année Licence'),
    ('Licence 2', 'Deuxième année Licence'),
    ('Licence 3', 'Troisième année Licence');