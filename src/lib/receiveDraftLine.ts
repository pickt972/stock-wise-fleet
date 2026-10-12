import { supabase } from "@/integrations/supabase/client";
import { isArticleComplete } from "@/lib/draftReference";

export type CommandeStatus = "brouillon" | "envoye" | "confirme" | "recu_partiel" | "recu_complet" | "annule";

/** Status after reception: all lines fully received → Reçue, any reception → Partiellement reçue. */
export function receptionStatus(lines: { quantite_commandee: number; quantite_recue: number }[]): CommandeStatus {
  if (lines.length > 0 && lines.every((l) => l.quantite_recue >= l.quantite_commandee)) return "recu_complet";
  if (lines.some((l) => l.quantite_recue > 0)) return "recu_partiel";
  return "confirme";
}

export type LineStatus = "attente" | "partiel" | "recue";
export function lineStatus(l: { quantite_commandee: number; quantite_recue: number }): LineStatus {
  if (l.quantite_recue >= l.quantite_commandee) return "recue";
  if (l.quantite_recue > 0) return "partiel";
  return "attente";
}
export const LINE_STATUS_LABEL: Record<LineStatus, string> = {
  attente: "⏳ En attente", partiel: "⚠️ Partiellement reçue", recue: "✅ Reçue",
};

export interface OrderLine {
  id: string;
  commande_id: string;
  numero_commande: string;
  designation: string;
  article_id: string | null;
  quantite_commandee: number;
  quantite_recue: number;
  prix_unitaire: number;
  code_barre: string | null;
  categorie: string | null;
  sous_categorie: string | null;
  precision_note: string | null;
  vehicule_id: string | null;
  vehicule_label: string | null;
}
/** @deprecated kept for older imports */
export type PendingDraftLine = OrderLine;

export interface NewArticleInput {
  designation: string; reference: string; marque: string; categorie: string;
  sous_categorie: string; code_barre: string;
}

/**
 * Receives `qty` units of an order line, either into an existing article or a new fiche
 * (is_draft while incomplete). Each line can be received several times.
 */
export async function receiveOrderLine(line: OrderLine, opts: {
  qty: number; prix: number; articleId?: string | null; newArticle?: NewArticleInput | null;
}) {
  if (opts.qty < 1) throw new Error("Quantité reçue minimum : 1");
  const { data: u } = await supabase.auth.getUser();
  let articleId = opts.articleId || null;

  if (!articleId && opts.newArticle) {
    const n = opts.newArticle;
    if (!n.categorie) throw new Error("La catégorie est obligatoire");
    const fiche = {
      designation: n.designation.trim() || line.designation,
      reference: n.reference.trim() || n.code_barre.trim() || n.designation.trim() || line.designation,
      marque: n.marque.trim(), categorie: n.categorie, sous_categorie: n.sous_categorie || null,
      code_barre: n.code_barre.trim() || null,
    };
    const { data: art, error } = await supabase.from("articles").insert([{
      ...fiche, prix_achat: opts.prix, stock: 0, stock_min: 0, stock_max: 0,
      is_draft: !isArticleComplete({ ...fiche, reference: n.reference.trim() }), user_id: u.user?.id,
    }]).select("id").single();
    if (error) throw error;
    articleId = art.id;
  }
  if (!articleId) throw new Error("Choisissez un article existant ou créez une fiche");

  if (line.vehicule_id) {
    const { data: link } = await supabase.from("article_vehicules").select("id")
      .eq("article_id", articleId).eq("vehicule_id", line.vehicule_id).maybeSingle();
    if (!link) await supabase.from("article_vehicules").insert([{ article_id: articleId, vehicule_id: line.vehicule_id, user_id: u.user?.id }]);
  }

  const { error: ciErr } = await supabase.from("commande_items").update({
    article_id: articleId, is_draft: false, prix_unitaire: opts.prix,
    quantite_recue: line.quantite_recue + opts.qty,
  }).eq("id", line.id);
  if (ciErr) throw ciErr;

  const { data: entry, error: eErr } = await supabase.from("stock_entries").insert([{
    entry_number: "", entry_type: "commande", notes: `Réception commande ${line.numero_commande}`, created_by: u.user?.id,
  }]).select("id").single();
  if (eErr) throw eErr;
  const { error: iErr } = await supabase.from("stock_entry_items").insert([{
    entry_id: entry.id, article_id: articleId, quantity: opts.qty, unit_price: opts.prix,
  }]);
  if (iErr) throw iErr;

  const { data: lines } = await supabase.from("commande_items")
    .select("quantite_commandee, quantite_recue").eq("commande_id", line.commande_id);
  const status = receptionStatus(lines || []);
  await supabase.from("commandes").update({
    status, ...(status === "recu_complet" ? { date_reception_reelle: new Date().toISOString() } : {}),
  }).eq("id", line.commande_id);
  return status;
}
