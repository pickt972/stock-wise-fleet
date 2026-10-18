import { supabase } from "@/integrations/supabase/client";
import { validateReceptionQuantity } from "@/lib/stockEntryValidation";

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
  validateReceptionQuantity(opts.qty, line.quantite_commandee - line.quantite_recue);
  const result = await receiveOrderLines(line.commande_id, [{
    id: line.id, quantity: opts.qty, unit_price: opts.prix,
    article_id: opts.articleId || null, new_article: opts.newArticle || null,
  }]);
  return result.status;
}

export interface ReceptionInput {
  id: string; quantity: number; unit_price: number;
  article_id?: string | null;
  new_article?: (NewArticleInput & { emplacement_id?: string }) | null;
}

export async function receiveOrderLines(commandeId: string, lines: ReceptionInput[]) {
  const { data, error } = await supabase.rpc("receive_stock_order", {
    p_commande_id: commandeId, p_lines: lines as unknown as import("@/integrations/supabase/types").Json,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || !data.status) {
    throw new Error("La réception n’a pas été confirmée");
  }
  return { status: data.status as CommandeStatus };
}
