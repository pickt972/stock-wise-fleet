import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
}

const generatePurchaseOrderHTML = (data: PurchaseOrderRequest) => {
  const { commande, items, sender } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bon de Commande ${commande.numero_commande}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #333; }
        .info-section { margin-bottom: 20px; }
        .info-label { font-weight: bold; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .total-row { background-color: #f9f9f9; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">BON DE COMMANDE</div>
        <div style="margin-top: 10px;">
          <span class="info-label">N° :</span> ${commande.numero_commande}
        </div>
      </div>
      
      <div class="info-section">
        <div><span class="info-label">Fournisseur :</span> ${commande.fournisseur}</div>
        <div><span class="info-label">Date :</span> ${new Date(commande.date_creation).toLocaleDateString('fr-FR')}</div>
        <div><span class="info-label">Expéditeur :</span> ${sender.name} (${sender.email})</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Référence</th>
            <th>Quantité</th>
            <th>Prix unitaire (€)</th>
            <th>Total (€)</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.designation}</td>
              <td>${item.reference || '-'}</td>
              <td>${item.quantite_commandee}</td>
              <td>${item.prix_unitaire.toFixed(2)}</td>
              <td>${item.total_ligne.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4">Total HT</td>
            <td>${commande.total_ht.toFixed(2)} €</td>
          </tr>
          <tr class="total-row">
            <td colspan="4">TVA (${commande.tva_taux}%)</td>
            <td>${(commande.total_ttc - commande.total_ht).toFixed(2)} €</td>
          </tr>
          <tr class="total-row">
            <td colspan="4">Total TTC</td>
            <td>${commande.total_ttc.toFixed(2)} €</td>
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
        <p>Merci de bien vouloir confirmer la réception de cette commande.</p>
        <p>Cordialement,<br>${sender.name}</p>
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
    const { commande, items, sender } = requestData;

    if (!commande.email_fournisseur) {
      throw new Error("Email du fournisseur manquant");
    }

    const html = generatePurchaseOrderHTML(requestData);

    const emailResponse = await resend.emails.send({
      from: `${sender.name} <onboarding@resend.dev>`,
      to: [commande.email_fournisseur],
      subject: `Bon de commande ${commande.numero_commande} - ${commande.fournisseur}`,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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