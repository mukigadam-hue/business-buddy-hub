import { supabase } from "@/integrations/supabase/client";

const FN_URL =
  "https://evuswzfmrfkmlcdsphgu.supabase.co/functions/v1/phone-auth";

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dXN3emZtcmZrbWxjZHNwaGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTYzNjIsImV4cCI6MjA4NjczMjM2Mn0.mfuHVhSIxCMe68o7SPQtMJ4ELMIYQDTMTpoctrz1FO8";

type FnResponse = {
  email?: string;
  password?: string;
  mode?: "otp" | "session";
  token_hash?: string;
  ok?: boolean;
};

async function callFn(action: string, payload: Record<string, unknown>, withAuth = false): Promise<FnResponse> {
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
  return json as FnResponse;
}

/** Open a session from a one-time token issued by the phone-auth function. */
async function signInWithTokenHash(tokenHash: string) {
  // token_hash from a magiclink generateLink verifies with type 'magiclink';
  // fall back to 'email' for older GoTrue builds.
  let { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) {
    const retry = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    error = retry.error;
  }
  if (error) throw error;
}

/** Establish a client session from whatever payload the function returned. */
async function establishSession(res: FnResponse) {
  if (res.mode === "session") return; // current session stays valid
  if (res.mode === "otp" && res.token_hash) {
    await signInWithTokenHash(res.token_hash);
    return;
  }
  if (res.email && res.password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: res.email,
      password: res.password,
    });
    if (error) throw error;
    return;
  }
  throw new Error("Sign-in failed");
}

/** Create a phone-first account and immediately sign the user in. */
export async function phoneSignUp(input: {
  phone: string;            // E.164 with leading "+"
  country_code: string;
  pin: string;              // 5 digits
  full_name?: string;
  email?: string;           // optional recovery email
}) {
  const res = await callFn("signup", input);
  await establishSession(res);
}

/** Sign in an existing account by phone + PIN (works for phone-first AND email-first accounts). */
export async function phoneSignIn(phone: string, pin: string) {
  const res = await callFn("signin", { phone, pin });
  await establishSession(res);
}

/** Reset PIN after the simulated SMS verification, then sign in. */
export async function phoneResetPin(phone: string, new_pin: string) {
  const res = await callFn("reset-pin", { phone, new_pin });
  await establishSession(res);
}

/** Change the registered phone number (requires being signed in + current PIN). */
export async function phoneChangeNumber(input: {
  new_phone: string;
  country_code: string;
  pin: string;
}) {
  const res = await callFn("change-phone", input, true);
  await establishSession(res);
}

/**
 * Register a REAL email on an account that started with phone only (or demo).
 * Keeps the current session alive — no sign-out needed. Optionally sets a
 * password so email+password sign-in also works.
 */
export async function attachEmail(input: { email: string; password?: string }) {
  const res = await callFn("attach-email", input, true);
  if (!res.ok) throw new Error("Could not register email");
  return res;
}

/**
 * Register a phone number + 5-digit PIN on an account that started with
 * email only (or demo). Never touches the existing email/password sign-in.
 */
export async function attachPhone(input: { phone: string; country_code: string; pin: string }) {
  const res = await callFn("attach-phone", input, true);
  if (!res.ok) throw new Error("Could not register phone");
  return res;
}

/** Mark the current signed-in account as verified and save a recovery email. */
export async function markVerified(recoveryEmail: string) {
  const { error } = await supabase.rpc("mark_account_verified", {
    _recovery_email: recoveryEmail || "",
  });
  if (error) throw error;
}

/** True when the account still uses the internal phone-only synthetic email. */
export function isSyntheticEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@phone.ndamwesigaapp.local");
}
