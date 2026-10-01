import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"] ?? "";

/** Shared Supabase client. Returns null if env vars are not configured yet. */
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const isSupabaseConfigured = !!supabase;

// ─── SIWE-derived wallet auth ─────────────────────────────────────────────────

/**
 * Sign-In with Ethereum using a SIWE-derived password.
 *
 * Flow:
 *  1. User signs `"Sign in to NexDrop: {address}"` with their wallet.
 *  2. We use the first 32 bytes of the signature hex as a deterministic password.
 *  3. We call signInWithPassword (or signUp on first use).
 *
 * The Supabase "email" is formatted as `{wallet}@wallet.zenkaihood` so it is
 * unique per wallet without storing a real email.
 */
export async function signInWithWallet(
  address: string,
  signMessage: (args: { message: string }) => Promise<`0x${string}`>,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

  const addr = address.toLowerCase();
  const email = `${addr}@wallet.zenkaihood`;
  const siweMessage = `Sign in to NexDrop: ${addr}`;

  const sig = await signMessage({ message: siweMessage });
  // Deterministic password: first 32 bytes of signature (64 hex chars after 0x prefix)
  const password = sig.slice(2, 66);

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    if (signInError.message.includes("Invalid login credentials")) {
      // First-time user — create account then sign in
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw new Error(signUpError.message);
      const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
      if (retryError) throw new Error(retryError.message);
    } else {
      throw new Error(signInError.message);
    }
  }
}

// ─── Session hook ─────────────────────────────────────────────────────────────

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setIsLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  async function signOut() { await supabase?.auth.signOut(); }

  return { session, isLoading, signOut };
}

// ─── Image upload helper ──────────────────────────────────────────────────────

/**
 * Uploads a file to the `collection-images` Supabase Storage bucket.
 * Returns the public CDN URL.
 */
export async function uploadCollectionImage(
  contractAddress: string,
  slot: "logo" | "banner",
  file: File,
): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured.");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${contractAddress.toLowerCase()}/${slot}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("collection-images")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("collection-images").getPublicUrl(path);
  return data.publicUrl;
}
