import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  // Rediriger vers l'application avec le code ou l'erreur
  const redirectUrl = new URL("/parametres", Deno.env.get("SUPABASE_URL") ?? "");
  
  if (error) {
    redirectUrl.searchParams.set("gmail_error", error);
  } else if (code) {
    redirectUrl.searchParams.set("gmail_code", code);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
    },
  });
};

serve(handler);
