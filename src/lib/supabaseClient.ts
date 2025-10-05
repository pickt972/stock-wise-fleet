export { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquent (Render/.env)');
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
