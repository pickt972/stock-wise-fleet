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
      .single();

    if (mailError || !mailSetting) {
      console.error("❌ Mail setting not found:", mailError);
      throw new Error("Configuration de messagerie non trouvée");
    }

    console.log("📧 Mail setting found:", mailSetting.name);

    // Créer le client SMTP avec les paramètres configurés
    const client = new SMTPClient({
      connection: {
        hostname: mailSetting.smtp_host,
        port: mailSetting.smtp_port,
        tls: mailSetting.use_tls,
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

    // Envoi via SMTP
    await client.send({
      from: mailSetting.smtp_username,
      to: to,
      subject: subject,
      content: "auto",
      html: htmlContent,
    });

    await client.close();
    console.log("✅ Email sent successfully via SMTP");

    
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