import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------------
// CONFIGURATION: ENV VARIABLES OR FALLBACK
// ------------------------------------------------------------------

// Prioritize environment variables (from Netlify/Vite), fallback to hardcoded strings for development
const SUPABASE_URL = process.env.SUPABASE_URL || "https://wbexhtizujxnyvxzycpy.supabase.co";
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_KEY || " sb_publishable_Bj4-SZUvdXHvk4iCYp_KjQ_a4AUihPs";

// ------------------------------------------------------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

// --- Storage Helpers ---

export const uploadToStorage = async (file: File, folder: string, subId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const path = `${user.id}/${folder}/${subId}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('app-files')
        .upload(path, file, { upsert: true });

    if (error) throw error;
    return path;
};

export const getSignedUrl = async (path: string | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path; // Already a URL

    const { data, error } = await supabase.storage
        .from('app-files')
        .createSignedUrl(path, 3600 * 24); // Valid for 24 hours

    if (error) {
        console.error("Error signing URL:", error);
        return undefined;
    }
    return data.signedUrl;
};

export const deleteFromStorage = async (path: string) => {
    if (!path) return;
    const { error } = await supabase.storage
        .from('app-files')
        .remove([path]);
    
    if (error) console.error("Error deleting file:", error);
};