-- ============================================
-- SCRIPT DE DONNÉES DE TEST - Stock-Wise Fleet
-- Version SIMPLE sans bloc DO, juste des INSERT directs
-- ============================================

-- ============================================
-- 1. ARTICLES (stock initial = 0)
-- ============================================

INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max)
VALUES ('HU-5W40', 'Huile moteur 5W40', 'TOTAL', 'Consommables', 32.50, 0, 5, 50);

INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max)
VALUES ('PN-MICH-205', 'Pneu Michelin 205/55R16', 'MICHELIN', 'Pièces', 95.00, 0, 4, 20);

INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max)
VALUES ('GPS-TOMTOM', 'GPS TomTom', 'TOMTOM', 'Accessoires', 150.00, 0, 2, 10);

INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max)
VALUES ('SB-0-18', 'Siège bébé 0-18 mois', 'BEBE CONFORT', 'Accessoires', 45.00, 0, 3, 15);

INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max)
VALUES ('NET-500ML', 'Produit nettoyant 500ml', 'KARCHER', 'Consommables', 12.00, 0, 5, 30);

INSERT INTO public.articles (reference, designation, marque, categorie, prix_achat, stock, stock_min, stock_max)
VALUES ('FH-BOSCH', 'Filtre à huile', 'BOSCH', 'Pièces', 8.00, 0, 10, 40);

-- ============================================
-- 2. ENTRÉE 1 - Livraison CARPARTS MARTINIQUE
-- ============================================

INSERT INTO public.stock_entries (entry_number, entry_type, entry_date, notes, total_amount)
VALUES ('ENT-2025-001', 'achat', NOW() - INTERVAL '10 days', 'Livraison principale CARPARTS MARTINIQUE', 1450.00);

-- Items de l'entrée 1
INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_entries WHERE entry_number = 'ENT-2025-001'),
  (SELECT id FROM public.articles WHERE reference = 'HU-5W40'),
  12,
  32.50
);

INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_entries WHERE entry_number = 'ENT-2025-001'),
  (SELECT id FROM public.articles WHERE reference = 'PN-MICH-205'),
  8,
  95.00
);

INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_entries WHERE entry_number = 'ENT-2025-001'),
  (SELECT id FROM public.articles WHERE reference = 'FH-BOSCH'),
  20,
  8.00
);

INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_entries WHERE entry_number = 'ENT-2025-001'),
  (SELECT id FROM public.articles WHERE reference = 'NET-500ML'),
  10,
  12.00
);

INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_entries WHERE entry_number = 'ENT-2025-001'),
  (SELECT id FROM public.articles WHERE reference = 'SB-0-18'),
  4,
  45.00
);

-- ============================================
-- 3. ENTRÉE 2 - GPS
-- ============================================

INSERT INTO public.stock_entries (entry_number, entry_type, entry_date, notes, total_amount)
VALUES ('ENT-2025-002', 'achat', NOW() - INTERVAL '8 days', 'Commande GPS TomTom', 750.00);

INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_entries WHERE entry_number = 'ENT-2025-002'),
  (SELECT id FROM public.articles WHERE reference = 'GPS-TOMTOM'),
  5,
  150.00
);

-- ============================================
-- 4. ENTRÉE 3 - Réappro nettoyant
-- ============================================

INSERT INTO public.stock_entries (entry_number, entry_type, entry_date, notes, total_amount)
VALUES ('ENT-2025-003', 'achat', NOW() - INTERVAL '5 days', 'Réapprovisionnement produit nettoyant', 60.00);

INSERT INTO public.stock_entry_items (entry_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_entries WHERE entry_number = 'ENT-2025-003'),
  (SELECT id FROM public.articles WHERE reference = 'NET-500ML'),
  5,
  12.00
);

-- ============================================
-- 5. SORTIE 1 - Vidange Clio
-- ============================================

INSERT INTO public.stock_exits (exit_number, exit_type, exit_date, notes, reason)
VALUES ('SOR-2025-001', 'utilisation_vehicule', NOW() - INTERVAL '4 days', 'Vidange Clio AB-123-CD', 'Entretien véhicule de flotte');

INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_exits WHERE exit_number = 'SOR-2025-001'),
  (SELECT id FROM public.articles WHERE reference = 'HU-5W40'),
  1,
  32.50
);

INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_exits WHERE exit_number = 'SOR-2025-001'),
  (SELECT id FROM public.articles WHERE reference = 'FH-BOSCH'),
  1,
  8.00
);

-- ============================================
-- 6. SORTIE 2 - Location GPS Jean MARTIN
-- ============================================

INSERT INTO public.stock_exits (exit_number, exit_type, exit_date, notes, client_name, expected_return_date, caution_amount, return_status)
VALUES ('SOR-2025-002', 'location_accessoire', NOW() - INTERVAL '3 days', 'Location GPS à Jean MARTIN', 'Jean MARTIN', (NOW() + INTERVAL '1 day')::date, 50.00, 'not_returned');

INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_exits WHERE exit_number = 'SOR-2025-002'),
  (SELECT id FROM public.articles WHERE reference = 'GPS-TOMTOM'),
  1,
  150.00
);

-- ============================================
-- 7. SORTIE 3 - Location GPS Marie DUBOIS
-- ============================================

INSERT INTO public.stock_exits (exit_number, exit_type, exit_date, notes, client_name, expected_return_date, caution_amount, return_status)
VALUES ('SOR-2025-003', 'location_accessoire', NOW() - INTERVAL '2 days', 'Location GPS à Marie DUBOIS', 'Marie DUBOIS', NOW()::date, 50.00, 'not_returned');

INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_exits WHERE exit_number = 'SOR-2025-003'),
  (SELECT id FROM public.articles WHERE reference = 'GPS-TOMTOM'),
  1,
  150.00
);

-- ============================================
-- 8. SORTIE 4 - Nettoyage quotidien
-- ============================================

INSERT INTO public.stock_exits (exit_number, exit_type, exit_date, notes, reason)
VALUES ('SOR-2025-004', 'consommation', NOW() - INTERVAL '1 day', 'Nettoyage quotidien des véhicules', 'Nettoyage flotte');

INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_exits WHERE exit_number = 'SOR-2025-004'),
  (SELECT id FROM public.articles WHERE reference = 'NET-500ML'),
  3,
  12.00
);

-- ============================================
-- 9. SORTIE 5 - Changement pneus 208
-- ============================================

INSERT INTO public.stock_exits (exit_number, exit_type, exit_date, notes, reason)
VALUES ('SOR-2025-005', 'utilisation_vehicule', NOW() - INTERVAL '6 hours', 'Changement pneus 208 EF-456-GH', 'Maintenance véhicule de flotte');

INSERT INTO public.stock_exit_items (exit_id, article_id, quantity, unit_price)
VALUES (
  (SELECT id FROM public.stock_exits WHERE exit_number = 'SOR-2025-005'),
  (SELECT id FROM public.articles WHERE reference = 'PN-MICH-205'),
  4,
  95.00
);

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Stocks finaux attendus après exécution:
-- Huile moteur: 11
-- Pneu Michelin: 4 (ALERTE SEUIL!)
-- GPS TomTom: 3 (dont 2 en location)
-- Siège bébé: 4
-- Nettoyant: 12
-- Filtre à huile: 19
