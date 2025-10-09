import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    
    if (!code) {
      throw new Error("Code d'autorisation manquant");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Échanger le code d'autorisation contre des tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
        redirect_uri: "https://besoyrwozpzzhtxliyqz.supabase.co/functions/v1/gmail-oauth-callback",
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("❌ Token exchange failed:", error);
      throw new Error("Échec de l'authentification Google");
    }

    const tokens = await tokenResponse.json();
    
    // Calculer l'expiration du token (généralement 3600 secondes)
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + (tokens.expires_in || 3600));

    // Récupérer l'email de l'utilisateur via l'API Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    // Obtenir l'utilisateur courant via le header Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Non authentifié");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Créer le mail_setting
    const { error: dbError } = await supabase
      .from("mail_settings")
      .insert({
        user_id: user.id,
        name: `Gmail - ${userInfo.email}`,
        auth_type: "oauth",
        smtp_username: userInfo.email,
        smtp_host: "smtp.gmail.com",
        smtp_port: 587,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiryDate.toISOString(),
        is_active: true,
      });

    if (dbError) {
      console.error("❌ Database error:", dbError);
      throw new Error("Erreur lors de la sauvegarde des paramètres");
    }

    return new Response(
      JSON.stringify({ success: true, email: userInfo.email }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in gmail-oauth-init:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur d'authentification" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
