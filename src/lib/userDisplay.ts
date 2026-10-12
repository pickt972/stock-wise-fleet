export type ProfileLite = {
  full_name?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
} | null | undefined;

/** Nom affichable d'un utilisateur : "Prénom NOM", sinon identifiant, sinon fallback. */
export function userDisplayName(p: ProfileLite, fallback = "Utilisateur inconnu"): string {
  if (!p) return fallback;
  const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return p.full_name?.trim() || full || p.email?.trim() || p.username?.trim() || fallback;
}

export const PROFILE_FIELDS = "first_name, last_name, username";
