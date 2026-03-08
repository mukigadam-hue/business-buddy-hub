import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { senderBusinessId, recipientBusinessId, senderBusinessName } = await req.json();
    if (!senderBusinessId || !recipientBusinessId || !senderBusinessName) {
      throw new Error("Missing required fields");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify sender is member
    const { data: isMember } = await admin.rpc("is_business_member", {
      _user_id: user.id,
      _business_id: senderBusinessId,
    });
    if (!isMember) throw new Error("Not a member of sender business");

    // Send poke notification to recipient
    await admin.from("notifications").insert({
      business_id: recipientBusinessId,
      type: "poke",
      title: "👋 Poke from " + senderBusinessName,
      message: `${senderBusinessName} wants to reconnect! It's been a while since your last interaction.`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
