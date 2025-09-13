// supabase/functions/seed-users/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface SeedAccount {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  username: string;
  role: "admin" | "chef_agence" | "magasinier";
}

const accounts: SeedAccount[] = [
  { email: "admin@stock-wise.local", password: "administrateur", first_name: "Rychar", last_name: "Admin", username: "admin", role: "admin" },
  { email: "alvin@stock-wise.local", password: "alvin123", first_name: "Alvin", last_name: "Magasinier", username: "alvin", role: "magasinier" },
  { email: "julie@stock-wise.local", password: "julie123", first_name: "Julie", last_name: "Magasinier", username: "julie", role: "magasinier" },
  { email: "sherman@stock-wise.local", password: "sherman123", first_name: "Sherman", last_name: "Magasinier", username: "sherman", role: "magasinier" },
];

async function findUserIdByEmail(email: string): Promise<string | null> {
  // listUsers doesn't filter by email; fetch first 1000 and filter
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000, page: 1 });
  if (error) return null;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user?.id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const results: any[] = [];

    for (const acc of accounts) {
      let userId: string | null = await findUserIdByEmail(acc.email);

      if (!userId) {
        const { data, error } = await admin.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: { first_name: acc.first_name, last_name: acc.last_name },
        });
        if (error) throw error;
        userId = data.user?.id ?? null;
      } else {
        // Update password and metadata to ensure consistency
        const { error } = await admin.auth.admin.updateUserById(userId, {
          password: acc.password,
          user_metadata: { first_name: acc.first_name, last_name: acc.last_name },
        });
        if (error) throw error;
      }

      if (!userId) throw new Error("User ID not available after creation/update");

      // Ensure profile exists and set username
      const { error: upsertProfileError } = await admin
        .from("profiles")
        .upsert({ id: userId, first_name: acc.first_name, last_name: acc.last_name, username: acc.username }, { onConflict: "id" });
      if (upsertProfileError) throw upsertProfileError;

      // Ensure single role
      const { error: delRolesError } = await admin.from("user_roles").delete().eq("user_id", userId);
      if (delRolesError) throw delRolesError;
      const { error: insertRoleError } = await admin.from("user_roles").insert({ user_id: userId, role: acc.role });
      if (insertRoleError) throw insertRoleError;

      results.push({ email: acc.email, userId, status: "ok" });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e: any) {
    console.error("seed-users error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 500,
    });
  }
});
