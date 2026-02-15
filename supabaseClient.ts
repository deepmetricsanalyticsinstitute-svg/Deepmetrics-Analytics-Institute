import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------------
// CONFIGURATION: PASTE YOUR URL AND KEY BELOW
// ------------------------------------------------------------------

const SUPABASE_URL = "https://wbexhtizujxnyvxzycpy.supabase.co";
const SUPABASE_PUBLIC_KEY = " sb_publishable_Bj4-SZUvdXHvk4iCYp_KjQ_a4AUihPs";

// ------------------------------------------------------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);