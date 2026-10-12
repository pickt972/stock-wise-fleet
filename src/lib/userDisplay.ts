export type ProfileLite = {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
} | null | undefined;

/** Nom affichable d'un utilisateur : "Prénom NOM", sinon identifiant, sinon fallback. */
export function userDisplayName(p: ProfileLite, fallback = "Utilisateur inconnu"): string {
  if (!p) return fallback;
  const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return full || p.username || fallback;
}

export const PROFILE_FIELDS = "first_name, last_name, username";
