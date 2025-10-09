import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function refreshGoogleToken(refreshToken: string): Promise<{
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mailSettingId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Récupérer le mail_setting
    const { data: mailSetting, error: fetchError } = await supabase
      .from("mail_settings")
      .select("*")
      .eq("id", mailSettingId)
      .single();

    if (fetchError || !mailSetting) {
      throw new Error("Configuration mail introuvable");
    }

    if (mailSetting.auth_type !== "oauth" || !mailSetting.refresh_token) {
      throw new Error("Configuration OAuth invalide");
    }

    // Rafraîchir le token
    const newTokens = await refreshGoogleToken(mailSetting.refresh_token);

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + newTokens.expires_in);

    // Mettre à jour la DB
    const { error: updateError } = await supabase
      .from("mail_settings")
      .update({
        access_token: newTokens.access_token,
        token_expiry: expiryDate.toISOString(),
      })
      .eq("id", mailSettingId);

    if (updateError) {
      throw new Error("Erreur lors de la mise à jour du token");
    }

    return new Response(
      JSON.stringify({ success: true, access_token: newTokens.access_token }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error refreshing token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
