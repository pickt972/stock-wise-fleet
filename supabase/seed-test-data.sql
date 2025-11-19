-- ============================================
-- SCRIPT DE DONNÉES DE TEST - Stock-Wise Fleet
-- ============================================
-- Ce script crée des données de test réalistes pour vérifier le fonctionnement de l'application
-- Les triggers automatiques mettront à jour les stocks lors des entrées/sorties

-- Variables pour stocker les IDs (utilisera des UUID générés)
DO $$
DECLARE
  v_user_id UUID;
  v_article_huile UUID;
  v_article_pneu UUID;
  v_article_gps UUID;
  v_article_siege UUID;
  v_article_nettoyant UUID;
  v_article_filtre UUID;
  v_entry_1 UUID;
  v_entry_2 UUID;
  v_entry_3 UUID;
  v_exit_1 UUID;
  v_exit_2 UUID;
  v_exit_3 UUID;
  v_exit_4 UUID;
  v_exit_5 UUID;
BEGIN
  -- Récupérer l'utilisateur connecté
  v_user_id := auth.uid();
  
  -- Si pas d'utilisateur connecté, utiliser le premier admin trouvé
  IF v_user_id IS NULL THEN
    SELECT ur.user_id INTO v_user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Utilisateur pour les données de test: %', v_user_id;

  -- ============================================
  -- 1. CRÉATION DES ARTICLES (stock initial = 0)
  -- ============================================
  
  INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max, user_id)
  VALUES 
    ('HU-5W40', 'Huile moteur 5W40', 'TOTAL', 'Consommables', 32.50, 0, 5, 50, v_user_id)
  RETURNING id INTO v_article_huile;

  INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max, user_id)
  VALUES 
    ('PN-MICH-205', 'Pneu Michelin 205/55R16', 'MICHELIN', 'Pièces', 95.00, 0, 4, 20, v_user_id)
  RETURNING id INTO v_article_pneu;

  INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max, user_id)
  VALUES 
    ('GPS-TOMTOM', 'GPS TomTom', 'TOMTOM', 'Accessoires', 150.00, 0, 2, 10, v_user_id)
  RETURNING id INTO v_article_gps;

  INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max, user_id)
  VALUES 
    ('SB-0-18', 'Siège bébé 0-18 mois', 'BEBE CONFORT', 'Accessoires', 45.00, 0, 3, 15, v_user_id)
  RETURNING id INTO v_article_siege;

  INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max, user_id)
  VALUES 
    ('NET-500ML', 'Produit nettoyant 500ml', 'KARCHER', 'Consommables', 12.00, 0, 5, 30, v_user_id)
  RETURNING id INTO v_article_nettoyant;

  INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max, user_id)
  VALUES 
    ('FH-BOSCH', 'Filtre à huile', 'BOSCH', 'Pièces', 8.00, 0, 10, 40, v_user_id)
  RETURNING id INTO v_article_filtre;

  RAISE NOTICE 'Articles créés avec succès';

  -- ============================================
  -- 2. ENTRÉE 1 - Livraison CARPARTS MARTINIQUE
  -- ============================================
  
  INSERT INTO public.stock_entries (entry_number, entry_type, entry_date, notes, created_by, total_amount)
  VALUES (
    'ENT-2025-001',
    'achat',
    NOW() - INTERVAL '10 days',
    'Livraison principale CARPARTS MARTINIQUE',
    v_user_id,
    1450.00
  )
  RETURNING id INTO v_entry_1;

  -- Items de l'entrée 1
  INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price, total_price)
  VALUES 
    (v_entry_1, v_article_huile, 12, 32.50, 390.00),
    (v_entry_1, v_article_pneu, 8, 95.00, 760.00),
    (v_entry_1, v_article_filtre, 20, 8.00, 160.00),
    (v_entry_1, v_article_nettoyant, 10, 12.00, 120.00),
    (v_entry_1, v_article_siege, 4, 45.00, 180.00);

  RAISE NOTICE 'Entrée 1 créée avec succès';

  -- ============================================
  -- 3. ENTRÉE 2 - GPS
  -- ============================================
  
  INSERT INTO public.stock_entries (entry_number, entry_type, entry_date, notes, created_by, total_amount)
  VALUES (
    'ENT-2025-002',
    'achat',
    NOW() - INTERVAL '8 days',
    'Commande GPS TomTom',
    v_user_id,
    750.00
  )
  RETURNING id INTO v_entry_2;

  INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price, total_price)
  VALUES (v_entry_2, v_article_gps, 5, 150.00, 750.00);

  RAISE NOTICE 'Entrée 2 créée avec succès';

  -- ============================================
  -- 4. ENTRÉE 3 - Réappro nettoyant
  -- ============================================
  
  INSERT INTO public.stock_entries (entry_number, entry_type, entry_date, notes, created_by, total_amount)
  VALUES (
    'ENT-2025-003',
    'achat',
    NOW() - INTERVAL '5 days',
    'Réapprovisionnement produit nettoyant',
    v_user_id,
    60.00
  )
  RETURNING id INTO v_entry_3;

  INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price, total_price)
  VALUES (v_entry_3, v_article_nettoyant, 5, 12.00, 60.00);

  RAISE NOTICE 'Entrée 3 créée avec succès';

  -- ============================================
  -- 5. SORTIE 1 - Vidange Clio
  -- ============================================
  
  INSERT INTO public.stock_exits (exit_number, exit_type, exit_date, notes, created_by, reason)
  VALUES (
    'SOR-2025-001',
    'utilisation_vehicule',
    NOW() - INTERVAL '4 days',
    'Vidange Clio AB-123-CD',
    v_user_id,
    'Entretien véhicule de flotte'
  )
  RETURNING id INTO v_exit_1;

  INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price, total_price)
  VALUES 
    (v_exit_1, v_article_huile, 1, 32.50, 32.50),
    (v_exit_1, v_article_filtre, 1, 8.00, 8.00);

  RAISE NOTICE 'Sortie 1 créée avec succès';

  -- ============================================
  -- 6. SORTIE 2 - Location GPS Jean MARTIN
  -- ============================================
  
  INSERT INTO public.stock_exits (
    exit_number, 
    exit_type, 
    exit_date, 
    notes, 
    created_by, 
    client_name,
    expected_return_date,
    caution_amount,
    return_status
  )
  VALUES (
    'SOR-2025-002',
    'location_accessoire',
    NOW() - INTERVAL '3 days',
    'Location GPS à Jean MARTIN',
    v_user_id,
    'Jean MARTIN',
    (NOW() + INTERVAL '1 day')::date,
    50.00,
    'not_returned'
  )
  RETURNING id INTO v_exit_2;

  INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price, total_price)
  VALUES (v_exit_2, v_article_gps, 1, 150.00, 150.00);

  RAISE NOTICE 'Sortie 2 créée avec succès';

  -- ============================================
  -- 7. SORTIE 3 - Location GPS Marie DUBOIS
  -- ============================================
  
  INSERT INTO public.stock_exits (
    exit_number, 
    exit_type, 
    exit_date, 
    notes, 
    created_by,
    client_name,
    expected_return_date,
    caution_amount,
    return_status
  )
  VALUES (
    'SOR-2025-003',
    'location_accessoire',
    NOW() - INTERVAL '2 days',
    'Location GPS à Marie DUBOIS',
    v_user_id,
    'Marie DUBOIS',
    NOW()::date,
    50.00,
    'not_returned'
  )
  RETURNING id INTO v_exit_3;

  INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price, total_price)
  VALUES (v_exit_3, v_article_gps, 1, 150.00, 150.00);

  RAISE NOTICE 'Sortie 3 créée avec succès';

  -- ============================================
  -- 8. SORTIE 4 - Nettoyage quotidien
  -- ============================================
  
  INSERT INTO public.stock_exits (exit_number, exit_type, exit_date, notes, created_by, reason)
  VALUES (
    'SOR-2025-004',
    'consommation',
    NOW() - INTERVAL '1 day',
    'Nettoyage quotidien des véhicules',
    v_user_id,
    'Nettoyage flotte'
  )
  RETURNING id INTO v_exit_4;

  INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price, total_price)
  VALUES (v_exit_4, v_article_nettoyant, 3, 12.00, 36.00);

  RAISE NOTICE 'Sortie 4 créée avec succès';

  -- ============================================
  -- 9. SORTIE 5 - Changement pneus 208
  -- ============================================
  
  INSERT INTO public.stock_exits (exit_number, exit_type, exit_date, notes, created_by, reason)
  VALUES (
    'SOR-2025-005',
    'utilisation_vehicule',
    NOW() - INTERVAL '6 hours',
    'Changement pneus 208 EF-456-GH',
    v_user_id,
    'Maintenance véhicule de flotte'
  )
  RETURNING id INTO v_exit_5;

  INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price, total_price)
  VALUES (v_exit_5, v_article_pneu, 4, 95.00, 380.00);

  RAISE NOTICE 'Sortie 5 créée avec succès';

  -- ============================================
  -- 10. VÉRIFICATION DES STOCKS FINAUX
  -- ============================================
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STOCKS FINAUX ATTENDUS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Huile moteur: % (attendu: 11)', (SELECT stock FROM public.articles WHERE id = v_article_huile);
  RAISE NOTICE 'Pneu Michelin: % (attendu: 4 - ALERTE SEUIL!)', (SELECT stock FROM public.articles WHERE id = v_article_pneu);
  RAISE NOTICE 'GPS TomTom: % (attendu: 3, dont 2 en location)', (SELECT stock FROM public.articles WHERE id = v_article_gps);
  RAISE NOTICE 'Siège bébé: % (attendu: 4)', (SELECT stock FROM public.articles WHERE id = v_article_siege);
  RAISE NOTICE 'Nettoyant: % (attendu: 12)', (SELECT stock FROM public.articles WHERE id = v_article_nettoyant);
  RAISE NOTICE 'Filtre à huile: % (attendu: 19)', (SELECT stock FROM public.articles WHERE id = v_article_filtre);
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Données de test créées avec succès!';
  
END $$;
