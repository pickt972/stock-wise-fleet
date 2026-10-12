import { supabase } from "@/integrations/supabase/client";
import { PROFILE_FIELDS, userDisplayName } from "@/lib/userDisplay";

export type InventoryRow = {
  id: string; reference: string | null; label: string | null; statut: string;
  scope_type: string; scope_id: string | null;
  created_by: string | null; opened_at: string; closed_by: string | null; closed_at: string | null;
  abandoned_at: string | null; abandoned_by: string | null; abandon_reason: string | null;
  stock_applied: boolean; total_articles: number; articles_counted: number;
};

export type InventoryItemRow = {
  id: string; article_id: string; stock_theorique: number; stock_compte: number | null; ecart: number | null;
  date_comptage: string | null;
  articles: { reference: string; designation: string; code_barre: string | null; marque: string } | null;
  reference?: string;
};

/** Noms affichables pour une liste d'utilisateurs, en une seule requête. */
export async function fetchNames(ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))] as string[];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select(`id, ${PROFILE_FIELDS}`).in("id", unique);
  return Object.fromEntries((data ?? []).map((p: any) => [p.id, userDisplayName(p)]));
}

export async function fetchItems(inventaireId: string): Promise<InventoryItemRow[]> {
  const { data, error } = await supabase
    .from("inventaire_items")
    .select("id, article_id, stock_theorique, stock_compte, ecart, date_comptage, articles(reference, designation, code_barre, marque)")
    .eq("inventaire_id", inventaireId);
  if (error) throw error;
  return (data as any[]).map((i) => ({ ...i, reference: i.articles?.reference ?? "" }));
}

export const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
