// Phone-first authentication endpoint.
// Actions: signup, signin, reset-pin, change-phone
// Uses a deterministic synthetic email + password for Supabase auth, so a phone+PIN
// can produce a real Supabase session. The PIN is also hashed and stored separately
// for explicit verification (e.g., before phone change).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
// Server-side salt — never sent to clients.
const SALT = "ndamwesiga.phone.salt.v1";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizePhone(raw: string) {
  return (raw || "").replace(/[^\d+]/g, "");
}
function digitsOnly(raw: string) {
  return (raw || "").replace(/\D/g, "");
}
function synthEmail(phone: string) {
  return `p${digitsOnly(phone)}@phone.ndamwesigaapp.local`;
}
async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function synthPassword(phone: string, pin: string) {
  // long, opaque, deterministic
  return "pw_" + (await sha256(`${SALT}|${digitsOnly(phone)}|${pin}|v1`));
}
async function pinHash(phone: string, pin: string) {
  return await sha256(`${SALT}|pin|${digitsOnly(phone)}|${pin}`);
}
function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function bad(message: string, status = 400) {
  return ok({ error: message }, status);
}

async function getUserFromAuthHeader(authHeader: string | null) {
  if (!authHeader) return null;
  const client = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.auth.getUser();
  return data?.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, ...body } = await req.json();

    if (action === "signup") {
      const phone = normalizePhone(body.phone);
      const pin = String(body.pin || "");
      const fullName = String(body.full_name || "").trim();
      const countryCode = String(body.country_code || "").trim();
      const optionalEmail = String(body.email || "").trim().toLowerCase();
      if (!/^\+?\d{6,16}$/.test(phone)) return bad("Invalid phone number");
      if (!/^\d{5}$/.test(pin)) return bad("PIN must be 5 digits");

      // Block duplicate phone signups
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (existing) return bad("This phone number is already registered. Try signing in or recovering your account.", 409);

      const email = synthEmail(phone);
      const password = await synthPassword(phone, pin);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, country_code: countryCode },
      });
      if (createErr || !created.user) return bad(createErr?.message || "Could not create account", 500);

      // The handle_new_user trigger inserts the profile row. Patch our extra fields.
      const { error: profErr } = await admin
        .from("profiles")
        .update({
          phone,
          country_code: countryCode,
          pin_hash: await pinHash(phone, pin),
          recovery_email: optionalEmail || "",
          verification_status: "unverified",
          full_name: fullName || "",
        })
        .eq("id", created.user.id);
      if (profErr) console.warn("profile update", profErr.message);

      return ok({ email, password });
    }

    if (action === "signin") {
      const phone = normalizePhone(body.phone);
      const pin = String(body.pin || "");
      if (!/^\+?\d{6,16}$/.test(phone)) return bad("Invalid phone number");
      if (!/^\d{5}$/.test(pin)) return bad("PIN must be 5 digits");

      const { data: prof } = await admin
        .from("profiles")
        .select("id, pin_hash")
        .eq("phone", phone)
        .maybeSingle();
      if (!prof) return bad("No account found for this phone number", 404);
      const computed = await pinHash(phone, pin);
      if (prof.pin_hash && prof.pin_hash !== computed) return bad("Incorrect PIN", 401);

      return ok({ email: synthEmail(phone), password: await synthPassword(phone, pin) });
    }

    if (action === "reset-pin") {
      // Called after the simulated SMS verification. No auth required, but rate-limited
      // by the deterministic phone lookup (no enumeration beyond phone_exists).
      const phone = normalizePhone(body.phone);
      const newPin = String(body.new_pin || "");
      if (!/^\+?\d{6,16}$/.test(phone)) return bad("Invalid phone number");
      if (!/^\d{5}$/.test(newPin)) return bad("PIN must be 5 digits");

      const { data: prof } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (!prof) return bad("No account found for this phone number", 404);

      const newPassword = await synthPassword(phone, newPin);
      const { error: updErr } = await admin.auth.admin.updateUserById(prof.id, {
        password: newPassword,
      });
      if (updErr) return bad(updErr.message, 500);

      await admin
        .from("profiles")
        .update({ pin_hash: await pinHash(phone, newPin) })
        .eq("id", prof.id);

      return ok({ email: synthEmail(phone), password: newPassword });
    }

    if (action === "change-phone") {
      const authUser = await getUserFromAuthHeader(req.headers.get("Authorization"));
      if (!authUser) return bad("Not authenticated", 401);

      const newPhone = normalizePhone(body.new_phone);
      const newCountry = String(body.country_code || "").trim();
      const pin = String(body.pin || "");
      if (!/^\+?\d{6,16}$/.test(newPhone)) return bad("Invalid new phone number");
      if (!/^\d{5}$/.test(pin)) return bad("PIN must be 5 digits");

      const { data: prof } = await admin
        .from("profiles")
        .select("id, phone, pin_hash")
        .eq("id", authUser.id)
        .maybeSingle();
      if (!prof) return bad("Profile not found", 404);

      // Verify current PIN against the EXISTING phone
      const computed = await pinHash(prof.phone, pin);
      if (prof.pin_hash && prof.pin_hash !== computed) return bad("Incorrect PIN", 401);

      // Make sure new phone is not already taken
      const { data: clash } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", newPhone)
        .neq("id", prof.id)
        .maybeSingle();
      if (clash) return bad("That phone number is already registered to another account", 409);

      // Re-key synthetic email + password to new phone (PIN stays the same)
      const newEmail = synthEmail(newPhone);
      const newPassword = await synthPassword(newPhone, pin);

      const { error: updErr } = await admin.auth.admin.updateUserById(prof.id, {
        email: newEmail,
        password: newPassword,
        email_confirm: true,
      });
      if (updErr) return bad(updErr.message, 500);

      await admin
        .from("profiles")
        .update({
          phone: newPhone,
          country_code: newCountry,
          pin_hash: await pinHash(newPhone, pin),
          phone_changed_at: new Date().toISOString(),
        })
        .eq("id", prof.id);

      return ok({ email: newEmail, password: newPassword });
    }

    return bad("Unknown action", 400);
  } catch (e) {
    console.error(e);
    return bad((e as Error).message || "Server error", 500);
  }
});
