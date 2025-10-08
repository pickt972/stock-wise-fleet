import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  mailSettingId: string;
  to: string;
  subject: string;
  body: string;
  commandeId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("📧 Send custom email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { mailSettingId, to, subject, body, commandeId }: EmailRequest = await req.json();

    console.log("📧 Email request:", { mailSettingId, to, subject, commandeId });

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

    // Créer le client SMTP avec les paramètres configurés
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

      // Préparer le contenu HTML
      const htmlContent = body && body.trim().length > 0 && body.includes('<')
        ? body
        : `<pre style="font-family: ui-sans-serif, system-ui; white-space: pre-wrap;">${body || ''}</pre>`;

      await client.send({
        from: mailSetting.smtp_username,
        to,
        subject,
        html: htmlContent,
      });

      await client.close();
    };

    try {
      // Première tentative avec les réglages fournis
      await sendWith(mailSetting.smtp_host, mailSetting.smtp_port, isImplicitTLS);
      console.log("✅ Email sent successfully via SMTP (first attempt)");
    } catch (e: any) {
      console.error("❌ SMTP send failed (first attempt):", e?.message || e);
      // Fallback connu: certains serveurs refusent 587/STARTTLS avec denomailer
      // On retente en TLS implicite sur 465 si possible
      if (mailSetting.smtp_port === 587) {
        try {
          await sendWith(mailSetting.smtp_host, 465, true);
          console.log("✅ Email sent successfully via SMTP (fallback 465/TLS)");
        } catch (e2: any) {
          console.error("❌ SMTP send failed (fallback):", e2?.message || e2);
          throw e2;
        }
      } else {
        throw e;
      }
    }

    
    // Log de l'envoi dans la base de données pour traçabilité
    if (commandeId) {
      await supabase
        .from("commandes")
        .update({ 
          status: 'envoye',
          date_envoi: new Date().toISOString(),
          notes: `Email envoyé à ${to} le ${new Date().toLocaleString('fr-FR')}`
        })
        .eq("id", commandeId);
    }

    console.log("✅ Email sent successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email envoyé avec succès" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Error in send-custom-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur lors de l'envoi de l'email" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);