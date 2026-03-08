import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    // Verify the caller
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { senderBusinessId, recipientBusinessId, customerName, items, code, sharingCode, comment } = await req.json();

    if (!senderBusinessId || !recipientBusinessId || !items?.length || !code) {
      throw new Error("Missing required fields");
    }

    // Use service role to bypass RLS
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify sender is member of their business
    const { data: isMember } = await admin.rpc("is_business_member", {
      _user_id: user.id,
      _business_id: senderBusinessId,
    });
    if (!isMember) throw new Error("Not a member of sender business");

    // Verify recipient business exists
    const { data: recipientBiz } = await admin
      .from("businesses")
      .select("id, name")
      .eq("id", recipientBusinessId)
      .single();
    if (!recipientBiz) throw new Error("Recipient business not found");

    // 1. Create sender's request order
    const { data: senderOrder, error: sErr } = await admin.from("orders").insert({
      business_id: senderBusinessId,
      type: "request",
      customer_name: customerName || "Walk-in",
      grand_total: 0,
      status: "pending",
      code,
      sharing_code: sharingCode,
    }).select().single();
    if (sErr || !senderOrder) throw new Error(sErr?.message || "Failed to create sender order");

    // 2. Insert sender order items
    const senderItems = items.map((item: any) => ({
      order_id: senderOrder.id,
      item_name: item.item_name,
      category: item.category || "",
      quality: item.quality || "",
      quantity: item.quantity || 1,
      price_type: item.price_type || "pending",
      unit_price: item.unit_price || 0,
      subtotal: item.subtotal || 0,
    }));
    await admin.from("order_items").insert(senderItems);

    // 3. Create recipient's inbox order
    const { data: inboxOrder, error: iErr } = await admin.from("orders").insert({
      business_id: recipientBusinessId,
      type: "inbox",
      customer_name: customerName || "Walk-in",
      grand_total: 0,
      status: "pending",
      code,
      sharing_code: sharingCode,
    }).select().single();
    if (iErr || !inboxOrder) throw new Error(iErr?.message || "Failed to create inbox order");

    // 4. Insert inbox order items
    const inboxItems = items.map((item: any) => ({
      order_id: inboxOrder.id,
      item_name: item.item_name,
      category: item.category || "",
      quality: item.quality || "",
      quantity: item.quantity || 1,
      price_type: item.price_type || "pending",
      unit_price: item.unit_price || 0,
      subtotal: item.subtotal || 0,
    }));
    await admin.from("order_items").insert(inboxItems);

    // 5. Create shared_orders link
    await admin.from("shared_orders").insert({
      order_id: senderOrder.id,
      from_business_id: senderBusinessId,
      to_business_id: recipientBusinessId,
      sharing_code: sharingCode,
    });

    // 6. Send notification to recipient
    const commentMsg = comment ? ` — Note: "${comment}"` : "";
    await admin.from("notifications").insert({
      business_id: recipientBusinessId,
      type: "new_order",
      title: "📥 New Order Request Received",
      message: `Order ${code} from ${customerName} — ${items.length} item(s)${commentMsg}`,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      senderOrderId: senderOrder.id, 
      inboxOrderId: inboxOrder.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
