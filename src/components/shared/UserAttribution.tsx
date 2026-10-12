import { userDisplayName, type ProfileLite } from "@/lib/userDisplay";

export function UserAttribution({ profile, alternate }: { profile: ProfileLite; alternate?: ProfileLite }) {
  const name = userDisplayName(profile, "") || userDisplayName(alternate, "");
  return <span className={name ? undefined : "italic text-muted-foreground"}>{name || "Utilisateur inconnu"}</span>;
}