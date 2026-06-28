// Supabase Edge Function: admin-create-user
// Crée un utilisateur avec son VRAI email pour permettre reset password et notifications

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type UserRole = 'admin' | 'chef_agence' | 'magasinier';

type Payload = {
  email: string;         // vrai email de l'utilisateur
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  username?: string;     // identifiant court optionnel (affiché dans l'UI)
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'missing_supabase_env' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const clientForUser = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await clientForUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'not_admin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body: Payload = await req.json();
    const { email, password, firstName, lastName, role, username } = body || {};

    if (!email || !password || !firstName || !lastName || !role) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validation email basique
    if (!email.includes('@') || !email.includes('.')) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const finalEmail = email.trim().toLowerCase();
    // username affiché dans l'UI = partie avant le @ si non fourni
    const finalUsername = username?.trim() || finalEmail.split('@')[0];

    // Créer l'utilisateur Supabase Auth avec son VRAI email
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: finalEmail,
      password,
      email_confirm: true, // pas besoin de confirmation — l'admin crée directement
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (createErr || !created?.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message || 'create_user_failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const newUserId = created.user.id;

    // Créer/mettre à jour le profil
    const { error: upsertProfileErr } = await supabase.from('profiles').upsert({
      id: newUserId,
      username: finalUsername,
      first_name: firstName,
      last_name: lastName,
    });

    if (upsertProfileErr) {
      console.error('upsert profile error', upsertProfileErr);
    }

    // Assigner le rôle
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', newUserId)
      .maybeSingle();

    if (existingRole?.id) {
      await supabase.from('user_roles').update({ role }).eq('id', existingRole.id);
    } else {
      await supabase.from('user_roles').insert({ user_id: newUserId, role });
    }

    return new Response(JSON.stringify({ id: newUserId, email: finalEmail }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    console.error('unexpected error', e);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
