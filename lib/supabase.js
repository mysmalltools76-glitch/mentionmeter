import { createClient } from "@supabase/supabase-js";

let client = null;

// Sirf server par use hota hai. Secret key kabhi browser tak nahi jati.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null; // local testing bina database ke bhi chal sake
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
