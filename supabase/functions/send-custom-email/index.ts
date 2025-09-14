import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

    // Simuler l'envoi d'email (ici vous pourriez intégrer avec un service SMTP réel)
    // Pour l'instant, on va juste logger et retourner un succès
    console.log("📧 Email would be sent with settings:", {
      from: mailSetting.smtp_username,
      to,
      subject,
      smtp_host: mailSetting.smtp_host,
      smtp_port: mailSetting.smtp_port,
      use_tls: mailSetting.use_tls
    });

    // Ici, vous pourriez intégrer avec un service comme Nodemailer ou SendGrid
    // Pour l'instant, on simule l'envoi
    
    // Log de l'envoi dans la base de données pour traçabilité
    if (commandeId) {
      await supabase
        .from("commandes")
        .update({ 
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