// Supabase Edge Function: list-available-users
// Public endpoint that returns sanitized list of users (username + role)
// Uses service role to bypass RLS safely and only returns non-sensitive fields

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type UserRole = 'admin' | 'chef_agence' | 'magasinier';

type PublicUser = {
  username: string;
  role: UserRole | 'magasinier';
  roleDisplay: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const getRoleDisplay = (role: UserRole | 'magasinier') => {
  switch (role) {
    case 'admin':
      return 'Administrateur';
    case 'chef_agence':
      return "Chef d'agence";
    case 'magasinier':
    default:
      return 'Magasinier';
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Fetch profiles with username only
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, username')
      .not('username', 'is', null);

    if (profilesError) {
      console.error('profiles error', profilesError);
      return new Response(JSON.stringify({ error: 'profiles_fetch_failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ users: [] as PublicUser[] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const userIds = profiles.map((p) => p.id);

    const { data: roles, error: rolesError } = await admin
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    if (rolesError) {
      console.error('roles error', rolesError);
      return new Response(JSON.stringify({ error: 'roles_fetch_failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const users: PublicUser[] = profiles
      .map((p) => {
        const r = roles?.find((x) => x.user_id === p.id)?.role as UserRole | undefined;
        const role = r || 'magasinier';
        return {
          username: p.username as string,
          role,
          roleDisplay: getRoleDisplay(role),
        };
      })
      .filter((u) => !!u.username);

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    console.error('unexpected', e);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
