import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface PurchaseOrderRequest {
  commande: {
    id: string;
    numero_commande: string;
    fournisseur: string;
    email_fournisseur: string;
    telephone_fournisseur?: string;
    adresse_fournisseur?: string;
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
      <title>Bon de Commande ${escapeHtml(commande.numero_commande)}</title>
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
          ${companyInfo.company_logo_url ? `<img src="${escapeHtml(companyInfo.company_logo_url)}" alt="Logo" style="max-height: 60px; max-width: 200px; height: auto; width: auto; object-fit: contain; margin-bottom: 10px;">` : ''}
          <div class="company-name">${escapeHtml(companyInfo.company_name)}</div>
          <div class="company-details">
            ${escapeHtml(companyInfo.company_address).replace(/\n/g, '<br>')}<br>
            SIRET: ${escapeHtml(companyInfo.company_siret)}<br>
            Tél: ${escapeHtml(companyInfo.company_phone)}<br>
            Email: ${escapeHtml(companyInfo.company_email)}
          </div>
        </div>
        <div>
          <div class="title">BON DE COMMANDE</div>
          <div style="margin-top: 10px; text-align: right;">
            <span class="info-label">N° :</span> ${escapeHtml(commande.numero_commande)}
          </div>
        </div>
      </div>
      
      <div class="supplier-info">
        <div class="info-label">Fournisseur</div>
        <div style="margin-top: 5px;">
          <div>${escapeHtml(commande.fournisseur)}</div>
          ${commande.email_fournisseur ? `<div>Email: ${escapeHtml(commande.email_fournisseur)}</div>` : ``}
          ${commande.telephone_fournisseur ? `<div>Tél: ${escapeHtml(commande.telephone_fournisseur)}</div>` : ``}
          ${commande.adresse_fournisseur ? `<div>${escapeHtml(commande.adresse_fournisseur).replace(/\n/g, '<br>')}</div>` : ``}
        </div>
      </div>
      
      <div class="info-section">
        <div><span class="info-label">Date de commande :</span> ${new Date(commande.date_creation).toLocaleDateString('fr-FR')}</div>
        <div><span class="info-label">Commandé par :</span> ${escapeHtml(sender.name)}</div>
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
              <td>${escapeHtml(item.designation)}</td>
              <td>${escapeHtml(item.reference || '-')}</td>
              <td class="text-center">${Number(item.quantite_commandee)}</td>
              <td class="text-right">${Number(item.prix_unitaire).toFixed(2)}</td>
              <td class="text-right">${Number(item.total_ligne).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4" class="text-right">Total HT</td>
            <td class="text-right">${Number(commande.total_ht).toFixed(2)} €</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" class="text-right">TVA (${Number(commande.tva_taux)}%)</td>
            <td class="text-right">${(Number(commande.total_ttc) - Number(commande.total_ht)).toFixed(2)} €</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" class="text-right">Total TTC</td>
            <td class="text-right">${Number(commande.total_ttc).toFixed(2)} €</td>
          </tr>
        </tfoot>
      </table>
      
      ${commande.notes ? `
        <div class="info-section">
          <div class="info-label">Notes :</div>
          <div>${escapeHtml(commande.notes)}</div>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Merci de bien vouloir confirmer la réception de cette commande et nous indiquer le délai de livraison.</p>
        <p>Cordialement,<br>${escapeHtml(companyInfo.company_name)}</p>
      </div>
    </body>
    </html>
  `;
};

// Sanitize HTML to avoid quoted-printable artefacts like "=20"
const sanitizeHtml = (html: string) => {
  return html
    .replace(/\r\n/g, "\n") // normalize EOL
    .replace(/[ \t]+$/gm, "") // remove trailing spaces at EOL
    .replace(/\u00A0/g, " ") // replace NBSP with regular space
    .replace(/\n{3,}/g, "\n\n"); // collapse excessive blank lines
};

// Plain-text fallback version of the purchase order
const generatePurchaseOrderText = (data: PurchaseOrderRequest) => {
  const { commande, items, sender, companySettings } = data;
  const company = companySettings || {
    company_name: sender.name,
    company_address: "Adresse non configurée",
    company_siret: "SIRET non configuré",
    company_phone: "Téléphone non configuré",
    company_email: sender.email,
  };

  const lines: string[] = [];
  lines.push(
    `BON DE COMMANDE`,
    `N°: ${commande.numero_commande}`,
    "",
    `Entreprise: ${company.company_name}`,
    company.company_address,
    `SIRET: ${company.company_siret}`,
    `Tél: ${company.company_phone}`,
    `Email: ${company.company_email}`,
    "",
    `Fournisseur: ${commande.fournisseur}`,
    `Date de commande: ${new Date(commande.date_creation).toLocaleDateString('fr-FR')}`,
    `Commandé par: ${sender.name}`,
    "",
    "Articles:",
  );

  items.forEach((it, idx) => {
    lines.push(
      `${idx + 1}. ${it.designation} | Ref: ${it.reference || '-'} | Qté: ${it.quantite_commandee} | PU: ${it.prix_unitaire.toFixed(2)} € | Total: ${it.total_ligne.toFixed(2)} €`
    );
  });

  lines.push(
    "",
    `Total HT: ${commande.total_ht.toFixed(2)} €`,
    `TVA (${commande.tva_taux}%): ${(commande.total_ttc - commande.total_ht).toFixed(2)} €`,
    `Total TTC: ${commande.total_ttc.toFixed(2)} €`,
  );

  if (commande.notes) {
    lines.push("", "Notes:", commande.notes);
  }

  lines.push(
    "",
    "Merci de confirmer la réception et le délai de livraison.",
    `Cordialement, ${company.company_name}`
  );

  return lines.join("\n");
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === Authentication check ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;

    const requestData: PurchaseOrderRequest = await req.json();
    const { commande, items, sender, mailSettingId } = requestData;

    // Use service role for DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (!commande.email_fournisseur) {
      throw new Error("Email du fournisseur manquant");
    }

    // Verify the mail setting belongs to the authenticated user
    const { data: mailSetting, error: mailError } = await supabase
      .from("mail_settings")
      .select("*")
      .eq("id", mailSettingId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (mailError || !mailSetting) {
      console.error("❌ Mail setting not found:", mailError);
      throw new Error("Configuration de messagerie non trouvée");
    }

    // Verify the commande belongs to the authenticated user
    const { data: commandeCheck, error: commandeError } = await supabase
      .from("commandes")
      .select("id, user_id")
      .eq("id", commande.id)
      .maybeSingle();

    if (commandeError || !commandeCheck || commandeCheck.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Accès refusé à cette commande' }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("📧 Mail setting found:", mailSetting.name);

    const rawHtml = generatePurchaseOrderHTML(requestData);
    const cleanedHtml = sanitizeHtml(rawHtml);
    const textAlt = generatePurchaseOrderText(requestData);
    
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
        html: cleanedHtml,
        text: textAlt,
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
      JSON.stringify({ error: "Une erreur est survenue lors de l'envoi" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
