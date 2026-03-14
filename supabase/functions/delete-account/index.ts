import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user from their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Clean up user data
    const userId = user.id;

    // Delete owned businesses and their cascading data
    const { data: ownedBusinesses } = await adminClient
      .from("businesses")
      .select("id")
      .eq("owner_id", userId);

    if (ownedBusinesses) {
      for (const biz of ownedBusinesses) {
        const bizId = biz.id;
        // Delete all business-related data
        await Promise.all([
          adminClient.from("sale_items").delete().in("sale_id",
            (await adminClient.from("sales").select("id").eq("business_id", bizId)).data?.map(s => s.id) || []),
          adminClient.from("purchase_items").delete().in("purchase_id",
            (await adminClient.from("purchases").select("id").eq("business_id", bizId)).data?.map(p => p.id) || []),
          adminClient.from("order_items").delete().in("order_id",
            (await adminClient.from("orders").select("id").eq("business_id", bizId)).data?.map(o => o.id) || []),
          adminClient.from("service_items").delete().in("service_id",
            (await adminClient.from("services").select("id").eq("business_id", bizId)).data?.map(s => s.id) || []),
        ]);
        await Promise.all([
          adminClient.from("sales").delete().eq("business_id", bizId),
          adminClient.from("purchases").delete().eq("business_id", bizId),
          adminClient.from("orders").delete().eq("business_id", bizId),
          adminClient.from("services").delete().eq("business_id", bizId),
          adminClient.from("stock_items").delete().eq("business_id", bizId),
          adminClient.from("business_expenses").delete().eq("business_id", bizId),
          adminClient.from("factory_expenses").delete().eq("business_id", bizId),
          adminClient.from("factory_raw_materials").delete().eq("business_id", bizId),
          adminClient.from("factory_production").delete().eq("business_id", bizId),
          adminClient.from("factory_team_members").delete().eq("business_id", bizId),
          adminClient.from("factory_worker_payments").delete().eq("business_id", bizId),
          adminClient.from("factory_worker_advances").delete().eq("business_id", bizId),
          adminClient.from("business_team_members").delete().eq("business_id", bizId),
          adminClient.from("business_worker_payments").delete().eq("business_id", bizId),
          adminClient.from("business_worker_advances").delete().eq("business_id", bizId),
          adminClient.from("business_contacts").delete().eq("business_id", bizId),
          adminClient.from("business_blocks").delete().eq("business_id", bizId),
          adminClient.from("business_payment_methods").delete().eq("business_id", bizId),
          adminClient.from("receipts").delete().eq("business_id", bizId),
          adminClient.from("notifications").delete().eq("business_id", bizId),
          adminClient.from("subscriptions").delete().eq("business_id", bizId),
          adminClient.from("invite_codes").delete().eq("business_id", bizId),
          adminClient.from("shared_orders").delete().eq("from_business_id", bizId),
          adminClient.from("video_requests").delete().eq("business_id", bizId),
          adminClient.from("property_check_ins").delete().eq("business_id", bizId),
          adminClient.from("property_complaints").delete().eq("business_id", bizId),
          adminClient.from("property_bookings").delete().eq("business_id", bizId),
          adminClient.from("property_assets").delete().eq("business_id", bizId),
          adminClient.from("property_conversations").delete().eq("business_id", bizId),
        ]);
        await adminClient.from("business_memberships").delete().eq("business_id", bizId);
        await adminClient.from("businesses").delete().eq("id", bizId);
      }
    }

    // Remove memberships where user is not owner
    await adminClient.from("business_memberships").delete().eq("user_id", userId);
    // Remove reviews/likes
    await adminClient.from("review_likes").delete().eq("user_id", userId);
    await adminClient.from("business_reviews").delete().eq("reviewer_id", userId);
    // Remove profile
    await adminClient.from("profiles").delete().eq("id", userId);
    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
