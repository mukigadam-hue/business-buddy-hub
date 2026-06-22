import { supabase } from "@/integrations/supabase/client";

const FN_URL =
  "https://evuswzfmrfkmlcdsphgu.supabase.co/functions/v1/phone-auth";

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dXN3emZtcmZrbWxjZHNwaGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTYzNjIsImV4cCI6MjA4NjczMjM2Mn0.mfuHVhSIxCMe68o7SPQtMJ4ELMIYQDTMTpoctrz1FO8";

async function callFn(action: string, payload: Record<string, unknown>, withAuth = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (withAuth) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers["Authorization"] = `Bearer ${data.session.access_token}`;
    }
  }
  const res = await fetch(FN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as { email?: string; password?: string };
}

/** Create a phone-first account and immediately sign the user in. */
export async function phoneSignUp(input: {
  phone: string;            // E.164 with leading "+"
  country_code: string;
  pin: string;              // 5 digits
  full_name?: string;
  email?: string;           // optional recovery email
}) {
  const { email, password } = await callFn("signup", input);
  if (!email || !password) throw new Error("Signup failed");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Sign in an existing phone-first account. */
export async function phoneSignIn(phone: string, pin: string) {
  const { email, password } = await callFn("signin", { phone, pin });
  if (!email || !password) throw new Error("Sign-in failed");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Reset PIN after the simulated SMS verification, then sign in. */
export async function phoneResetPin(phone: string, new_pin: string) {
  const { email, password } = await callFn("reset-pin", { phone, new_pin });
  if (!email || !password) throw new Error("Reset failed");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Change the registered phone number (requires being signed in + current PIN). */
export async function phoneChangeNumber(input: {
  new_phone: string;
  country_code: string;
  pin: string;
}) {
  const { email, password } = await callFn("change-phone", input, true);
  if (!email || !password) throw new Error("Phone change failed");
  // Re-establish session with the new synthetic credentials so future refreshes work.
  await supabase.auth.signInWithPassword({ email, password });
}

/** Mark the current signed-in account as verified and save a recovery email. */
export async function markVerified(recoveryEmail: string) {
  const { error } = await supabase.rpc("mark_account_verified", {
    _recovery_email: recoveryEmail || "",
  });
  if (error) throw error;
}
