/**
 * Utilitaires pour la gestion des plaques d'immatriculation françaises
 * Format SIV (Système d'Immatriculation des Véhicules): AA-123-AA
 */

// Mapping des codes départements vers les régions (basé sur les 2 derniers chiffres)
const DEPARTEMENT_REGIONS: Record<string, string> = {
  "01": "Ain (Auvergne-Rhône-Alpes)",
  "02": "Aisne (Hauts-de-France)",
  "03": "Allier (Auvergne-Rhône-Alpes)",
  "04": "Alpes-de-Haute-Provence (PACA)",
  "05": "Hautes-Alpes (PACA)",
  "06": "Alpes-Maritimes (PACA)",
  "07": "Ardèche (Auvergne-Rhône-Alpes)",
  "08": "Ardennes (Grand Est)",
  "09": "Ariège (Occitanie)",
  "10": "Aube (Grand Est)",
  "11": "Aude (Occitanie)",
  "12": "Aveyron (Occitanie)",
  "13": "Bouches-du-Rhône (PACA)",
  "14": "Calvados (Normandie)",
  "15": "Cantal (Auvergne-Rhône-Alpes)",
  "16": "Charente (Nouvelle-Aquitaine)",
  "17": "Charente-Maritime (Nouvelle-Aquitaine)",
  "18": "Cher (Centre-Val de Loire)",
  "19": "Corrèze (Nouvelle-Aquitaine)",
  "21": "Côte-d'Or (Bourgogne-Franche-Comté)",
  "22": "Côtes-d'Armor (Bretagne)",
  "23": "Creuse (Nouvelle-Aquitaine)",
  "24": "Dordogne (Nouvelle-Aquitaine)",
  "25": "Doubs (Bourgogne-Franche-Comté)",
  "26": "Drôme (Auvergne-Rhône-Alpes)",
  "27": "Eure (Normandie)",
  "28": "Eure-et-Loir (Centre-Val de Loire)",
  "29": "Finistère (Bretagne)",
  "30": "Gard (Occitanie)",
  "31": "Haute-Garonne (Occitanie)",
  "32": "Gers (Occitanie)",
  "33": "Gironde (Nouvelle-Aquitaine)",
  "34": "Hérault (Occitanie)",
  "35": "Ille-et-Vilaine (Bretagne)",
  "36": "Indre (Centre-Val de Loire)",
  "37": "Indre-et-Loire (Centre-Val de Loire)",
  "38": "Isère (Auvergne-Rhône-Alpes)",
  "39": "Jura (Bourgogne-Franche-Comté)",
  "40": "Landes (Nouvelle-Aquitaine)",
  "41": "Loir-et-Cher (Centre-Val de Loire)",
  "42": "Loire (Auvergne-Rhône-Alpes)",
  "43": "Haute-Loire (Auvergne-Rhône-Alpes)",
  "44": "Loire-Atlantique (Pays de la Loire)",
  "45": "Loiret (Centre-Val de Loire)",
  "46": "Lot (Occitanie)",
  "47": "Lot-et-Garonne (Nouvelle-Aquitaine)",
  "48": "Lozère (Occitanie)",
  "49": "Maine-et-Loire (Pays de la Loire)",
  "50": "Manche (Normandie)",
  "51": "Marne (Grand Est)",
  "52": "Haute-Marne (Grand Est)",
  "53": "Mayenne (Pays de la Loire)",
  "54": "Meurthe-et-Moselle (Grand Est)",
  "55": "Meuse (Grand Est)",
  "56": "Morbihan (Bretagne)",
  "57": "Moselle (Grand Est)",
  "58": "Nièvre (Bourgogne-Franche-Comté)",
  "59": "Nord (Hauts-de-France)",
  "60": "Oise (Hauts-de-France)",
  "61": "Orne (Normandie)",
  "62": "Pas-de-Calais (Hauts-de-France)",
  "63": "Puy-de-Dôme (Auvergne-Rhône-Alpes)",
  "64": "Pyrénées-Atlantiques (Nouvelle-Aquitaine)",
  "65": "Hautes-Pyrénées (Occitanie)",
  "66": "Pyrénées-Orientales (Occitanie)",
  "67": "Bas-Rhin (Grand Est)",
  "68": "Haut-Rhin (Grand Est)",
  "69": "Rhône (Auvergne-Rhône-Alpes)",
  "70": "Haute-Saône (Bourgogne-Franche-Comté)",
  "71": "Saône-et-Loire (Bourgogne-Franche-Comté)",
  "72": "Sarthe (Pays de la Loire)",
  "73": "Savoie (Auvergne-Rhône-Alpes)",
  "74": "Haute-Savoie (Auvergne-Rhône-Alpes)",
  "75": "Paris (Île-de-France)",
  "76": "Seine-Maritime (Normandie)",
  "77": "Seine-et-Marne (Île-de-France)",
  "78": "Yvelines (Île-de-France)",
  "79": "Deux-Sèvres (Nouvelle-Aquitaine)",
  "80": "Somme (Hauts-de-France)",
  "81": "Tarn (Occitanie)",
  "82": "Tarn-et-Garonne (Occitanie)",
  "83": "Var (PACA)",
  "84": "Vaucluse (PACA)",
  "85": "Vendée (Pays de la Loire)",
  "86": "Vienne (Nouvelle-Aquitaine)",
  "87": "Haute-Vienne (Nouvelle-Aquitaine)",
  "88": "Vosges (Grand Est)",
  "89": "Yonne (Bourgogne-Franche-Comté)",
  "90": "Territoire de Belfort (Bourgogne-Franche-Comté)",
  "91": "Essonne (Île-de-France)",
  "92": "Hauts-de-Seine (Île-de-France)",
  "93": "Seine-Saint-Denis (Île-de-France)",
  "94": "Val-de-Marne (Île-de-France)",
  "95": "Val-d'Oise (Île-de-France)",
  "971": "Guadeloupe",
  "972": "Martinique",
  "973": "Guyane",
  "974": "La Réunion",
  "976": "Mayotte",
};

/**
 * Formate une plaque d'immatriculation au format SIV français
 * @param value - Valeur saisie par l'utilisateur
 * @returns Plaque formatée (AA-123-AA)
 */
export function formatImmatriculation(value: string): string {
  // Supprimer tous les caractères non alphanumériques et convertir en majuscules
  const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Format français standard: AA-000-AA (2 lettres, 3 chiffres, 2 lettres)
  let formatted = '';
  
  for (let i = 0; i < cleaned.length && i < 7; i++) {
    // Ajouter les tirets aux bonnes positions
    if (i === 2 || i === 5) {
      formatted += '-';
    }
    formatted += cleaned[i];
  }
  
  return formatted;
}

/**
 * Valide le format d'une plaque d'immatriculation française
 * @param value - Plaque à valider
 * @returns true si le format est valide
 */
export function validateImmatriculation(value: string): boolean {
  // Regex pour valider le format français AA-000-AA
  const regex = /^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$/;
  return regex.test(value);
}

/**
 * Extrait le code département des 2 derniers chiffres de la plaque
 * @param plate - Plaque d'immatriculation formatée (AA-123-AA)
 * @returns Code département ou null si non trouvé
 */
export function extractDepartementCode(plate: string): string | null {
  if (!validateImmatriculation(plate)) {
    return null;
  }
  
  // Extraire les 2 derniers chiffres (format: AA-123-AA, on prend "23")
  const lastTwoDigits = plate.slice(-2);
  
  // Vérifier si ce sont bien des chiffres
  if (!/^\d{2}$/.test(lastTwoDigits)) {
    return null;
  }
  
  return lastTwoDigits;
}

/**
 * Obtient les informations de région à partir d'une plaque
 * @param plate - Plaque d'immatriculation formatée (AA-123-AA)
 * @returns Informations de région ou null si non trouvé
 */
export function getRegionInfo(plate: string): string | null {
  const deptCode = extractDepartementCode(plate);
  
  if (!deptCode) {
    return null;
  }
  
  return DEPARTEMENT_REGIONS[deptCode] || null;
}

/**
 * Analyse complète d'une plaque d'immatriculation
 * @param plate - Plaque d'immatriculation
 * @returns Objet avec toutes les informations extraites
 */
export function analyzePlate(plate: string) {
  const formatted = formatImmatriculation(plate);
  const isValid = validateImmatriculation(formatted);
  const deptCode = extractDepartementCode(formatted);
  const regionInfo = getRegionInfo(formatted);
  
  return {
    formatted,
    isValid,
    departementCode: deptCode,
    regionInfo,
  };
}
