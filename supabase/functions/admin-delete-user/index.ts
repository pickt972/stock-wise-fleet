// Supabase Edge Function: admin-delete-user
// Deletes a user using the service role
// Only callable by admins

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Create admin client with service role
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

    const body = await req.json();
    const { userId } = body || {};

    if (!userId) {
      return new Response(JSON.stringify({ error: 'missing_user_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Prevent deleting yourself
    if (userId === userData.user.id) {
      return new Response(JSON.stringify({ error: 'cannot_delete_self' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Delete user roles first
    const { error: deleteRolesErr } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteRolesErr) {
      console.error('delete roles error', deleteRolesErr);
    }

    // Delete profile
    const { error: deleteProfileErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileErr) {
      console.error('delete profile error', deleteProfileErr);
    }

    // Delete auth user
    const { error: deleteUserErr } = await supabase.auth.admin.deleteUser(userId);

    if (deleteUserErr) {
      console.error('delete user error', deleteUserErr);
      return new Response(
        JSON.stringify({ error: deleteUserErr.message || 'delete_user_failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
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
