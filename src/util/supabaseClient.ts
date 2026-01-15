import { createClient } from "@refinedev/supabase";

const SUPABASE_URL = "https://zzbdgdeaxqclhfpagauj.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_rOkXWhIWmBwceSI5p247ug_VrIrPHT-";

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: "public",
  },
  auth: {
    persistSession: true,
  },
});
