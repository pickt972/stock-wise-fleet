-- Créer une table pour stocker les préférences de couleurs par utilisateur
CREATE TABLE public.color_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'category' ou 'location'
  name TEXT NOT NULL, -- nom de la catégorie ou de l'emplacement
  color_class TEXT NOT NULL, -- classe CSS de couleur
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, type, name)
);

-- Enable RLS
ALTER TABLE public.color_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own color preferences" 
ON public.color_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own color preferences" 
ON public.color_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own color preferences" 
ON public.color_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own color preferences" 
ON public.color_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_color_preferences_updated_at
BEFORE UPDATE ON public.color_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();