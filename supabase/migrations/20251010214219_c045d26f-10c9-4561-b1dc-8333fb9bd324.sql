-- ============================================
-- OPTIMISATION DES PERFORMANCES
-- ============================================

-- Index sur les colonnes fréquemment utilisées
CREATE INDEX IF NOT EXISTS idx_articles_reference ON public.articles(reference);
CREATE INDEX IF NOT EXISTS idx_articles_code_barre ON public.articles(code_barre);
CREATE INDEX IF NOT EXISTS idx_articles_categorie ON public.articles(categorie);
CREATE INDEX IF NOT EXISTS idx_articles_stock ON public.articles(stock);
CREATE INDEX IF NOT EXISTS idx_articles_emplacement_id ON public.articles(emplacement_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_article_id ON public.stock_movements(article_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_commandes_numero ON public.commandes(numero_commande);
CREATE INDEX IF NOT EXISTS idx_commandes_status ON public.commandes(status);
CREATE INDEX IF NOT EXISTS idx_commandes_date_creation ON public.commandes(date_creation DESC);

CREATE INDEX IF NOT EXISTS idx_commande_items_commande_id ON public.commande_items(commande_id);
CREATE INDEX IF NOT EXISTS idx_commande_items_article_id ON public.commande_items(article_id);

CREATE INDEX IF NOT EXISTS idx_inventaires_location ON public.inventaires(location);
CREATE INDEX IF NOT EXISTS idx_inventaires_status ON public.inventaires(status);
CREATE INDEX IF NOT EXISTS idx_inventaires_started_at ON public.inventaires(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventaire_items_inventaire_id ON public.inventaire_items(inventaire_id);
CREATE INDEX IF NOT EXISTS idx_inventaire_items_article_id ON public.inventaire_items(article_id);
CREATE INDEX IF NOT EXISTS idx_inventaire_items_barcode ON public.inventaire_items(barcode);

CREATE INDEX IF NOT EXISTS idx_fournisseurs_nom ON public.fournisseurs(nom);
CREATE INDEX IF NOT EXISTS idx_vehicules_immatriculation ON public.vehicules(immatriculation);