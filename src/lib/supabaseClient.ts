export { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://besoyrwovpzpzxtxliyqz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // ta clé anonyme (anon)
)
