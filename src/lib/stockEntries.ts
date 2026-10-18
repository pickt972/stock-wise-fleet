import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { validateEntryItems } from "./stockEntryValidation";

export async function createStockEntry(
  header: { entry_type: string; entry_date?: string; supplier_id?: string | null; invoice_number?: string | null; location?: string | null; notes?: string | null },
  items: { article_id: string; quantity: number; unit_price: number }[],
) {
  validateEntryItems(items);
  if (header.entry_type === "achat" && !header.supplier_id) throw new Error("Le fournisseur est obligatoire pour un achat");
  const { data, error } = await supabase.rpc("create_stock_entry", {
    p_header: header, p_items: items as unknown as Json,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.id !== "string") {
    throw new Error("L’entrée n’a pas été confirmée");
  }
  return { id: data.id, entry_number: typeof data.entry_number === "string" ? data.entry_number : "" };
}