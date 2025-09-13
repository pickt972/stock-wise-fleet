-- Créer l'enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'magasinier', 'chef_agence');

-- Table des profils utilisateur
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des rôles utilisateur (séparée pour éviter les problèmes RLS)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Activer RLS sur les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier les rôles (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fonction pour obtenir le rôle principal de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'chef_agence' THEN 2
      WHEN 'magasinier' THEN 3
    END
  LIMIT 1
$$;

-- Politiques RLS pour profiles
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Les admins peuvent voir tous les profils"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Les admins peuvent modifier tous les profils"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Insertion automatique via trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Politiques RLS pour user_roles
CREATE POLICY "Les utilisateurs peuvent voir leurs propres rôles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les admins peuvent voir tous les rôles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Seuls les admins peuvent gérer les rôles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Fonction pour créer un profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer le profil avec les métadonnées de l'inscription
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  
  -- Assigner le rôle par défaut (magasinier)
  -- Le premier utilisateur sera promu admin manuellement
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'magasinier');
  
  RETURN NEW;
END;
$$;

-- Trigger pour créer automatiquement un profil à l'inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger pour updated_at sur profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();