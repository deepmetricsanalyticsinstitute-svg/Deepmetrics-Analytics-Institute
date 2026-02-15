import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------------
// CONFIGURATION: ENV VARIABLES OR FALLBACK
// ------------------------------------------------------------------

// Prioritize environment variables (from Netlify/Vite), fallback to hardcoded strings for development
const SUPABASE_URL = process.env.SUPABASE_URL || "https://wbexhtizujxnyvxzycpy.supabase.co";
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_KEY || " sb_publishable_Bj4-SZUvdXHvk4iCYp_KjQ_a4AUihPs";

// ------------------------------------------------------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);