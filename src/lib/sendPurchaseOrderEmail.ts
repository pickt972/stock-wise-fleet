import { supabase } from "@/integrations/supabase/client";

export interface PurchaseOrderEmailLine {
  designation: string;
  reference?: string;
  quantite_commandee: number;
  prix_unitaire: number;
  total_ligne: number;
}

export interface PurchaseOrderEmailOrder {
  id: string;
  numero_commande: string;
  fournisseur: string;
  email_fournisseur?: string | null;
  telephone_fournisseur?: string | null;
  adresse_fournisseur?: string | null;
  date_creation: string;
  total_ht: number;
  total_ttc: number;
  tva_taux: number;
  notes?: string | null;
}

/**
 * Envoie le bon de commande au fournisseur sans ouvrir de fenêtre :
 * réutilise la fonction Edge `send-purchase-order` et les comptes email
 * déjà configurés par l'utilisateur dans les paramètres.
 */
export async function autoSendPurchaseOrder(
  commande: PurchaseOrderEmailOrder,
  items: PurchaseOrderEmailLine[],
) {
  const email = commande.email_fournisseur?.trim();
  if (!email) throw new Error("Aucun email fournisseur");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expirée");

  const [{ data: mailSetting }, { data: companySettings }, { data: profile }] = await Promise.all([
    supabase
      .from("mail_settings")
      .select("id, smtp_username")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("company_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name, username")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!mailSetting?.id) throw new Error("Aucun compte email configuré dans Paramètres");

  const senderEmail = mailSetting.smtp_username || "";
  const senderName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username || "";

  if (!senderEmail) throw new Error("Aucun email expéditeur configuré dans Paramètres");

  const { data, error } = await supabase.functions.invoke("send-purchase-order", {
    body: {
      commande: { ...commande, email_fournisseur: email },
      items,
      sender: { name: senderName, email: senderEmail },
      companySettings,
      mailSettingId: mailSetting.id,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));

  const { error: updateError } = await supabase
    .from("commandes")
    .update({ status: "envoye", date_envoi: new Date().toISOString() })
    .eq("id", commande.id);

  if (updateError) console.error("Statut de commande non mis à jour:", updateError);
}
