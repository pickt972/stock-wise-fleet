# Roadmap

- [x] Véhicules : masque et validation SIV partagés, affichage uniforme sans migration des données ; 72 tests réussis, libellé Sorties et saisie de création vérifiés sur données de test.
- [ ] Vérifier création/modification de véhicule sur la base réelle — session Supabase externe indisponible pour l’essai connecté automatique.

- [x] Nouvelle sortie : recherche et champs de création partagés avec les entrées, filtres en cascade, création toujours visible et véhicule obligatoire ; 19 tests réussis et parcours visuel sur données de test vérifié sans erreur.
- [ ] Vérifier Nouvelle sortie et création rapide sur données réelles — session Supabase externe indisponible pour l’essai connecté automatique.

- [x] Nouvelle entrée : filtres progressifs, badges de stock, création rapide avec marque puis sélection immédiate ; 12 tests réussis et parcours visuel sur données de test vérifié. L’enregistrement réel reste à vérifier sur Supabase externe.

- [x] Noms de tables Realtime vérifiés contre le schéma Supabase ; collisions de canaux corrigées, erreur reproduite puis testée, 61 tests réussis et compilation OK.
- [ ] Vérifier les événements Realtime entre deux appareils connectés — session Supabase externe indisponible pour l’essai automatique.

- [x] Articles : tableau triable, filtres conservés et cartes sous 768px ; 7 tests réussis, six cycles de tri et clic de ligne vérifiés sur articles de test, affichage sans erreur.
- [ ] Vérifier tableau, filtres et retour aux cartes avec les articles réels — session Supabase externe indisponible pour les essais connectés.

- [x] Nouvelle entrée : création d’article inconnu et complétion d’un brouillon avec entrée atomique et erreurs exactes ; 8 tests réussis, affichage compilé sans erreur.
- [ ] Vérifier création rapide et complétion en session réelle — Supabase externe ne permet pas d’essai connecté automatique.

- [x] Sécuriser le formulaire d’entrée simple : erreurs de chargement visibles, prix validé, double soumission bloquée ; 5 tests réussis et affichage sans erreur. Test connecté externe restant à faire par l’utilisateur.

- [x] Corriger les sauvegardes manuelles et réceptions, erreurs exactes et statistiques ; droits existants vérifiés et 24 tests réussis.
- [ ] Vérifier une réception et une entrée manuelle de bout en bout — connexion Supabase externe indisponible dans les essais.

- [ ] Vérifier visuellement les auteurs sur Entrées, Sorties, Transferts et Historique — accès connecté externe indisponible
- [x] Uniformiser les auteurs inconnus et vérifier l’attribution des nouvelles opérations (formulaires audités et défaut auth.uid() vérifié en migration)

- [x] Migration SQL : articles categorie 'battery' -> 'Batteries'
- [x] Migration SQL : regrouper 'Huile moteur' (Consommables & Entretien) -> 'Huiles & Liquides'
- [x] Migration SQL : regrouper 'Essuie-glace' / 'Essuie-glaces' / 'Balai essuie glace' -> 'Essuie-glaces' / 'Balai avant'
- [x] Migration SQL : regrouper les ampoules et bougies -> 'Éclairage' / 'Ampoule' et 'Bougie d'allumage'
- [x] Migration SQL : corriger 'Enjoliveurs' (pluriel) -> 'Enjoliveur' (singulier) sous Accessoires / Équipements
- [x] Migration SQL : 'Distribution' (Kit de distribution / Courroie accessoire) -> 0 article concerné, rien à déplacer
- [x] Migration SQL : regrouper 'Produits de lavage auto' (Consommables) -> 'Produits atelier' / 'Produit de lavage'
- [x] Migration SQL : 'Siege bébé' (Accessoires / Équipements) -> 'Accessoires' / 'Siège bébé'
- [x] Créer les catégories et sous-catégories demandées (réalisé précédemment)
- [x] Désactiver les catégories remplacées, dont Électricité (réalisé précédemment)
- [x] Clarifier les zones 30/40/30, les dépôts interdits et le fantôme à taille réelle
- [x] Ajouter les flèches mobiles, le défilement à 80px et la confirmation visuelle
- [x] Vérifier les règles et l'affichage avec des catégories de test (10 tests réussis, essais ordinateur/téléphone)
- [ ] Vérifier l'enregistrement avec un compte connecté — accès Supabase externe indisponible dans les essais
