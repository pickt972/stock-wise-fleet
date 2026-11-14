export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

// Newest first.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-11-14",
    changes: [
      "Numérotation des versions et page « À propos »",
      "Compteurs de catégories basés sur le nombre total de pièces",
      "Création d'article depuis un scan d'inventaire",
      "Sélecteur de quantité −/+ pour les entrées et sorties",
      "Saisie manuelle de véhicule hors flotte dans les sorties",
    ],
  },
];
