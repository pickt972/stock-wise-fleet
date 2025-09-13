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
    let anySuccess = false;

    for (const acc of accounts) {
      const entry: any = { email: acc.email, status: "pending" };
      try {
        let userId: string | null = await findUserIdByEmail(acc.email);

        if (!userId) {
          console.log("[seed-users] Creating user:", acc.email);
          const { data, error } = await admin.auth.admin.createUser({
            email: acc.email,
            password: acc.password,
            email_confirm: true,
            user_metadata: { first_name: acc.first_name, last_name: acc.last_name },
          });

          if (error) {
            console.error("[seed-users] createUser error:", acc.email, error);
            // Re-check in case the user was created despite the reported error
            userId = await findUserIdByEmail(acc.email);
            if (!userId) {
              entry.status = "error";
              entry.error = (error as any)?.message ?? String(error);
              results.push(entry);
              continue;
            }
          } else {
            userId = data.user?.id ?? null;
          }
        } else {
          const { error } = await admin.auth.admin.updateUserById(userId, {
            password: acc.password,
            user_metadata: { first_name: acc.first_name, last_name: acc.last_name },
          });
          if (error) console.warn("[seed-users] updateUserById warning:", acc.email, error);
        }

        if (!userId) {
          entry.status = "error";
          entry.error = "User ID not available after creation/update";
          results.push(entry);
          continue;
        }

        // Ensure profile exists and set username
        const { error: upsertProfileError } = await admin
          .from("profiles")
          .upsert(
            { id: userId, first_name: acc.first_name, last_name: acc.last_name, username: acc.username },
            { onConflict: "id" }
          );
        if (upsertProfileError) console.error("[seed-users] upsert profile error:", acc.email, upsertProfileError);

        // Ensure single role
        const { error: delRolesError } = await admin.from("user_roles").delete().eq("user_id", userId);
        if (delRolesError) console.error("[seed-users] delete roles error:", acc.email, delRolesError);
        const { error: insertRoleError } = await admin.from("user_roles").insert({ user_id: userId, role: acc.role });
        if (insertRoleError) console.error("[seed-users] insert role error:", acc.email, insertRoleError);

        entry.status = "ok";
        entry.userId = userId;
        anySuccess = true;
        results.push(entry);
      } catch (err: any) {
        console.error("[seed-users] account processing error:", acc.email, err);
        results.push({ email: acc.email, status: "error", error: err?.message ?? String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: anySuccess, results }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e: any) {
    console.error("[seed-users] fatal error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  }
});
