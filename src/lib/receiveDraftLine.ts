import { supabase } from "@/integrations/supabase/client";
import type { DraftCompletion } from "@/components/commandes/DraftArticleCompletionDialog";

export type CommandeStatus = "brouillon" | "envoye" | "confirme" | "recu_partiel" | "recu_complet" | "annule";

/** Status after reception: all lines fully received → Reçue, any reception → Partiellement reçue. */
export function receptionStatus(lines: { quantite_commandee: number; quantite_recue: number }[]): CommandeStatus {
  if (lines.length > 0 && lines.every((l) => l.quantite_recue >= l.quantite_commandee)) return "recu_complet";
  if (lines.some((l) => l.quantite_recue > 0)) return "recu_partiel";
  return "confirme";
}

export interface PendingDraftLine {
  id: string;
  commande_id: string;
  designation: string;
  quantite_commandee: number;
  quantite_recue: number;
  prix_unitaire: number;
  code_barre: string | null;
  numero_commande: string;
  categorie?: string | null;
  sous_categorie?: string | null;
  precision_note?: string | null;
  vehicule_id?: string | null;
  vehicule_label?: string | null;
}

/** Creates the article from a draft order line, receives the remaining quantity into stock and updates the order status. */
export async function receiveDraftLine(line: PendingDraftLine, c: DraftCompletion) {
  const { data: u } = await supabase.auth.getUser();
  const qty = line.quantite_commandee - line.quantite_recue;
  const { data: art, error } = await supabase.from("articles").insert([{
    designation: c.designation.trim() || line.designation,
    reference: c.reference.trim() || c.code_barre.trim() || line.designation,
    marque: c.marque.trim(),
    categorie: c.categorie,
    sous_categorie: c.sous_categorie || null,
    code_barre: c.code_barre.trim() || null,
    prix_achat: c.prix_achat,
    emplacement_id: c.emplacement_id || null,
    stock: 0, stock_min: 0, stock_max: 0,
    is_draft: false,
    user_id: u.user?.id,
  }]).select("id").single();
  if (error) throw error;
  if (line.vehicule_id) {
    await supabase.from("article_vehicules").insert([{ article_id: art.id, vehicule_id: line.vehicule_id, user_id: u.user?.id }]);
  }

  const { error: ciErr } = await supabase.from("commande_items").update({
    article_id: art.id, is_draft: false, quantite_recue: line.quantite_commandee,
    designation: c.designation.trim() || line.designation, reference: c.reference.trim() || null,
    prix_unitaire: c.prix_achat, code_barre: c.code_barre.trim() || null,
  }).eq("id", line.id);
  if (ciErr) throw ciErr;

  if (qty > 0) {
    const { data: entry, error: eErr } = await supabase.from("stock_entries").insert([{
      entry_number: "", entry_type: "commande", notes: `Réception commande ${line.numero_commande}`, created_by: u.user?.id,
    }]).select("id").single();
    if (eErr) throw eErr;
    const { error: iErr } = await supabase.from("stock_entry_items").insert([{
      entry_id: entry.id, article_id: art.id, quantity: qty, unit_price: c.prix_achat,
    }]);
    if (iErr) throw iErr;
  }

  const { data: lines } = await supabase.from("commande_items")
    .select("quantite_commandee, quantite_recue").eq("commande_id", line.commande_id);
  const status = receptionStatus(lines || []);
  await supabase.from("commandes").update({
    status, ...(status === "recu_complet" ? { date_reception_reelle: new Date().toISOString() } : {}),
  }).eq("id", line.commande_id);
  return status;
}
