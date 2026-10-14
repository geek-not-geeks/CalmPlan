import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. These are inlined at BUILD time; set them in the Cloudflare build environment.",
  );
}

// createClient throws on an empty URL, which blanks the whole app at import time.
// Fall back to inert placeholders so the UI can still render and show an error.
export const supabase = createClient<Database>(url || "http://localhost:54321", anonKey || "missing-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
