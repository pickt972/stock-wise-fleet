import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PurchaseOrderRequest {
  commande: {
    id: string;
    numero_commande: string;
    fournisseur: string;
    email_fournisseur: string;
    date_creation: string;
    total_ht: number;
    total_ttc: number;
    tva_taux: number;
    notes?: string;
  };
  items: Array<{
    designation: string;
    reference?: string;
    quantite_commandee: number;
    prix_unitaire: number;
    total_ligne: number;
  }>;
  sender: {
    name: string;
    email: string;
  };
  companySettings?: {
    company_name: string;
    company_address: string;
    company_siret: string;
    company_phone: string;
    company_email: string;
    company_logo_url?: string;
  };
  mailSettingId: string;
}

const generatePurchaseOrderHTML = (data: PurchaseOrderRequest) => {
  const { commande, items, sender, companySettings } = data;
  
  const companyInfo = companySettings || {
    company_name: sender.name,
    company_address: "Adresse non configurée",
    company_siret: "SIRET non configuré",
    company_phone: "Téléphone non configuré",
    company_email: sender.email
  };
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bon de Commande ${commande.numero_commande}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .company-info { text-align: left; }
        .company-name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 5px; }
        .company-details { font-size: 12px; color: #666; line-height: 1.4; }
        .title { font-size: 24px; font-weight: bold; color: #333; text-align: right; }
        .info-section { margin-bottom: 20px; }
        .info-label { font-weight: bold; color: #555; }
        .supplier-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .total-row { background-color: #f9f9f9; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          ${companyInfo.company_logo_url ? `<img src="${companyInfo.company_logo_url}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
          <div class="company-name">${companyInfo.company_name}</div>
          <div class="company-details">
            ${companyInfo.company_address.replace(/\n/g, '<br>')}<br>
            SIRET: ${companyInfo.company_siret}<br>
            Tél: ${companyInfo.company_phone}<br>
            Email: ${companyInfo.company_email}
          </div>
        </div>
        <div>
          <div class="title">BON DE COMMANDE</div>
          <div style="margin-top: 10px; text-align: right;">
            <span class="info-label">N° :</span> ${commande.numero_commande}
          </div>
        </div>
      </div>
      
      <div class="supplier-info">
        <div class="info-label">Fournisseur :</div>
        <div style="margin-top: 5px;">${commande.fournisseur}</div>
      </div>
      
      <div class="info-section">
        <div><span class="info-label">Date de commande :</span> ${new Date(commande.date_creation).toLocaleDateString('fr-FR')}</div>
        <div><span class="info-label">Commandé par :</span> ${sender.name}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Référence</th>
            <th class="text-center">Quantité</th>
            <th class="text-right">Prix unitaire (€)</th>
            <th class="text-right">Total (€)</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.designation}</td>
              <td>${item.reference || '-'}</td>
              <td class="text-center">${item.quantite_commandee}</td>
              <td class="text-right">${item.prix_unitaire.toFixed(2)}</td>
              <td class="text-right">${item.total_ligne.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4" class="text-right">Total HT</td>
            <td class="text-right">${commande.total_ht.toFixed(2)} €</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" class="text-right">TVA (${commande.tva_taux}%)</td>
            <td class="text-right">${(commande.total_ttc - commande.total_ht).toFixed(2)} €</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" class="text-right">Total TTC</td>
            <td class="text-right">${commande.total_ttc.toFixed(2)} €</td>
          </tr>
        </tfoot>
      </table>
      
      ${commande.notes ? `
        <div class="info-section">
          <div class="info-label">Notes :</div>
          <div>${commande.notes}</div>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Merci de bien vouloir confirmer la réception de cette commande et nous indiquer le délai de livraison.</p>
        <p>Cordialement,<br>${companyInfo.company_name}</p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: PurchaseOrderRequest = await req.json();
    const { commande, items, sender, mailSettingId } = requestData;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (!commande.email_fournisseur) {
      throw new Error("Email du fournisseur manquant");
    }

    // Récupérer les paramètres de messagerie
    const { data: mailSetting, error: mailError } = await supabase
      .from("mail_settings")
      .select("*")
      .eq("id", mailSettingId)
      .eq("is_active", true)
      .maybeSingle();

    if (mailError || !mailSetting) {
      console.error("❌ Mail setting not found:", mailError);
      throw new Error("Configuration de messagerie non trouvée");
    }

    console.log("📧 Mail setting found:", mailSetting.name);

    const html = generatePurchaseOrderHTML(requestData);
    
    // Envoi via SMTP avec les paramètres utilisateur
    console.log("📧 Sending via SMTP...");
    const isImplicitTLS = mailSetting.smtp_port === 465;

    const sendWith = async (hostname: string, port: number, tls: boolean) => {
      const client = new SMTPClient({
        connection: {
          hostname,
          port,
          tls,
          auth: {
            username: mailSetting.smtp_username,
            password: mailSetting.smtp_password,
          },
        },
      });

      await client.send({
        from: mailSetting.smtp_username,
        to: commande.email_fournisseur,
        subject: `Bon de commande ${commande.numero_commande} - ${commande.fournisseur}`,
        html,
      });

      await client.close();
    };

    try {
      await sendWith(mailSetting.smtp_host, mailSetting.smtp_port, isImplicitTLS);
      console.log("✅ Email sent successfully via SMTP");
    } catch (e: any) {
      console.error("❌ SMTP send failed (first attempt):", e?.message || e);
      if (mailSetting.smtp_port === 587) {
        try {
          await sendWith(mailSetting.smtp_host, 465, true);
          console.log("✅ Email sent via SMTP (fallback 465/TLS)");
        } catch (e2: any) {
          console.error("❌ SMTP send failed (fallback):", e2?.message || e2);
          throw e2;
        }
      } else {
        throw e;
      }
    }

    // Mettre à jour le statut de la commande après envoi réussi
    if (commande?.id) {
      const { error: updateError } = await supabase
        .from("commandes")
        .update({ status: 'envoye', date_envoi: new Date().toISOString() })
        .eq("id", commande.id);
      if (updateError) {
        console.error("Erreur lors de la mise à jour du statut de la commande:", updateError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-purchase-order function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);