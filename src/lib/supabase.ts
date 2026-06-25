import { createClient } from "@supabase/supabase-js";

// Retrieve variables from import.meta.env
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = 
  Boolean(supabaseUrl) && 
  Boolean(supabaseAnonKey) && 
  supabaseUrl !== "YOUR_SUPABASE_PROJECT_URL" && 
  supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY" &&
  (typeof window === "undefined" || localStorage.getItem("lifesaver_force_local_mode") !== "true");

// Initialize client if configured, otherwise provide null
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Debug log to help users set up their workspace
if (!isSupabaseConfigured) {
  console.warn(
    "Supabase credentials are not configured. The app will run in offline demo mode using LocalStorage."
  );
} else {
  console.log("Supabase successfully integrated!");
}
