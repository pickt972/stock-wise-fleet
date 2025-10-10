-- ============================================
-- CORRECTION DES VULNÉRABILITÉS DE SÉCURITÉ
-- ============================================

-- 1. Sécuriser la table mail_settings (tokens OAuth et mots de passe)
-- Supprimer les anciennes politiques trop permissives
DROP POLICY IF EXISTS "Users can view their own mail settings" ON public.mail_settings;
DROP POLICY IF EXISTS "Users can create their own mail settings" ON public.mail_settings;
DROP POLICY IF EXISTS "Users can update their own mail settings" ON public.mail_settings;
DROP POLICY IF EXISTS "Users can delete their own mail settings" ON public.mail_settings;

-- Créer des politiques sécurisées pour mail_settings
CREATE POLICY "Users can view their own mail settings" 
ON public.mail_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mail settings" 
ON public.mail_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mail settings" 
ON public.mail_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mail settings" 
ON public.mail_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Restreindre l'accès aux fournisseurs (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir tous les fournisseu" ON public.fournisseurs;

CREATE POLICY "Authenticated users can view suppliers" 
ON public.fournisseurs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Restreindre l'accès aux commandes (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir toutes les commandes" ON public.commandes;

CREATE POLICY "Authenticated users can view orders" 
ON public.commandes 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Restreindre l'accès aux items de commande (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les articles de commande" ON public.commande_items;

CREATE POLICY "Authenticated users can view order items" 
ON public.commande_items 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 5. Restreindre l'accès aux articles (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les articles" ON public.articles;
DROP POLICY IF EXISTS "articles_read" ON public.articles;

CREATE POLICY "Authenticated users can view articles" 
ON public.articles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 6. Restreindre l'accès aux mouvements de stock (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les mouvements" ON public.stock_movements;
DROP POLICY IF EXISTS "stock_movements_read_auth" ON public.stock_movements;

CREATE POLICY "Authenticated users can view stock movements" 
ON public.stock_movements 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 7. Restreindre l'accès aux inventaires (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les inventaires" ON public.inventaires;
DROP POLICY IF EXISTS "inventaires_read" ON public.inventaires;

CREATE POLICY "Authenticated users can view inventories" 
ON public.inventaires 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 8. Restreindre l'accès aux items d'inventaire (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les items d'inventaire" ON public.inventaire_items;
DROP POLICY IF EXISTS "inventaire_items_read" ON public.inventaire_items;

CREATE POLICY "Authenticated users can view inventory items" 
ON public.inventaire_items 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 9. Restreindre l'accès aux véhicules (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les véhicules" ON public.vehicules;

CREATE POLICY "Authenticated users can view vehicles" 
ON public.vehicules 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 10. Restreindre l'accès aux catégories (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir toutes les catégories actives" ON public.categories;
DROP POLICY IF EXISTS "categories_read" ON public.categories;

CREATE POLICY "Authenticated users can view categories" 
ON public.categories 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 11. Restreindre l'accès aux emplacements (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les emplacements actifs" ON public.emplacements;

CREATE POLICY "Authenticated users can view locations" 
ON public.emplacements 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 12. Restreindre l'accès aux associations article-fournisseur (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir toutes les associations article-f" ON public.article_fournisseurs;

CREATE POLICY "Authenticated users can view article suppliers" 
ON public.article_fournisseurs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 13. Restreindre l'accès aux compatibilités article-véhicule (authentification requise)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir toutes les compatibilités" ON public.article_vehicules;

CREATE POLICY "Authenticated users can view article vehicles" 
ON public.article_vehicules 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 14. Corriger le search_path des fonctions
ALTER FUNCTION public.update_article_stock(uuid, integer) SET search_path = public;
ALTER FUNCTION public.trigger_update_commande_totals() SET search_path = public;