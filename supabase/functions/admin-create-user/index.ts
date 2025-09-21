// Supabase Edge Function: admin-create-user
// Creates a new user using the service role and ensures profile + role are set
// Only callable by admins

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'chef_agence' | 'magasinier';
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

    // Create client for verifying the calling user
    const clientForUser = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller user
    const { data: userData, error: userError } = await clientForUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Create admin client with service role (no auth header)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Check admin role
    const { data: isAdmin, error: roleErr } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });

    if (roleErr) {
      console.error('role check error', roleErr);
      return new Response(JSON.stringify({ error: 'role_check_failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'not_admin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body: Payload = await req.json();
    const { username, password, firstName, lastName, role } = body || {};

    if (!username || !password || !firstName || !lastName || !role) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const email = `${username}@stock-wise.local`.toLowerCase();

    // Create auth user
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (createErr || !created?.user) {
      console.error('create user error', createErr);
      return new Response(
        JSON.stringify({ error: createErr?.message || 'create_user_failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const newUserId = created.user.id;

    // Ensure profile exists and is up to date
    const { error: upsertProfileErr } = await supabase.from('profiles').upsert({
      id: newUserId,
      username,
      first_name: firstName,
      last_name: lastName,
    });

    if (upsertProfileErr) {
      console.error('upsert profile error', upsertProfileErr);
      // continue but report in response
    }

    // Ensure role is set
    const { data: existingRole, error: fetchRoleErr } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', newUserId)
      .maybeSingle();

    if (fetchRoleErr) {
      console.error('fetch role error', fetchRoleErr);
    }

    if (existingRole?.id) {
      const { error: updateRoleErr } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('id', existingRole.id);
      if (updateRoleErr) console.error('update role error', updateRoleErr);
    } else {
      const { error: insertRoleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role });
      if (insertRoleErr) console.error('insert role error', insertRoleErr);
    }

    return new Response(JSON.stringify({ id: newUserId, email }), {
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
