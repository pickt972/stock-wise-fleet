import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to refresh Google token");
  }

  return await tokenResponse.json();
}

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

    // Vérifier si c'est OAuth et si le token doit être rafraîchi
    let accessToken = mailSetting.access_token;
    if (mailSetting.auth_type === "oauth") {
      const tokenExpiry = new Date(mailSetting.token_expiry);
      const now = new Date();
      
      // Rafraîchir si le token expire dans moins de 5 minutes
      if (tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
        console.log("🔄 Refreshing Google OAuth token...");
        const newTokens = await refreshGoogleToken(mailSetting.refresh_token);
        accessToken = newTokens.access_token;
        
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + newTokens.expires_in);
        
        await supabase
          .from("mail_settings")
          .update({
            access_token: newTokens.access_token,
            token_expiry: expiryDate.toISOString(),
          })
          .eq("id", mailSettingId);
      }
    }

    // Préparer le contenu HTML
    const htmlContent = body && body.trim().length > 0 && body.includes('<')
      ? body
      : `<pre style="font-family: ui-sans-serif, system-ui; white-space: pre-wrap;">${body || ''}</pre>`;

    // Envoi via OAuth Gmail ou SMTP
    if (mailSetting.auth_type === "oauth") {
      console.log("📧 Sending via Gmail API with OAuth...");
      
      // Créer le message au format RFC 2822
      const message = [
        `From: ${mailSetting.smtp_username}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlContent,
      ].join("\r\n");

      const encodedMessage = btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmailResponse = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedMessage }),
        }
      );

      if (!gmailResponse.ok) {
        const errorText = await gmailResponse.text();
        console.error("❌ Gmail API error:", errorText);
        throw new Error(`Gmail API error: ${gmailResponse.status}`);
      }

      console.log("✅ Email sent via Gmail API");
    } else {
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
          to,
          subject,
          html: htmlContent,
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