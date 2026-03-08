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

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { inboxOrderId, action, items, grandTotal, comment, paymentMethod, proofUrl } = await req.json();
    // action: "send_prices" (supplier sends priced order back to requester)
    //         "confirm_prices" (requester confirms the prices)
    //         "reject_prices" (requester rejects, sends back to supplier)

    if (!inboxOrderId || !action) throw new Error("Missing required fields");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the inbox/request order
    const { data: order } = await admin.from("orders").select("*").eq("id", inboxOrderId).single();
    if (!order) throw new Error("Order not found");

    // Verify caller is member of the order's business
    const { data: isMember } = await admin.rpc("is_business_member", {
      _user_id: user.id,
      _business_id: order.business_id,
    });
    if (!isMember) throw new Error("Not a member of this business");

    // Find the linked order via shared_orders
    // If this is an inbox order, find the request order (and vice versa)
    let linkedOrder: any = null;
    
    if (order.type === "inbox") {
      // Find shared_orders where to_business_id = this business and code matches
      const { data: sharedLinks } = await admin
        .from("shared_orders")
        .select("*")
        .eq("to_business_id", order.business_id);
      
      if (sharedLinks && sharedLinks.length > 0) {
        // Find the request order from the sender that has the same code
        for (const link of sharedLinks) {
          const { data: reqOrder } = await admin
            .from("orders")
            .select("*")
            .eq("id", link.order_id)
            .eq("code", order.code)
            .eq("type", "request")
            .single();
          if (reqOrder) {
            linkedOrder = reqOrder;
            break;
          }
        }
      }
    } else if (order.type === "request") {
      // Find shared_orders where order_id = this order
      const { data: sharedLink } = await admin
        .from("shared_orders")
        .select("*")
        .eq("order_id", inboxOrderId)
        .maybeSingle();
      
      if (sharedLink) {
        // Find the inbox order in the recipient business with same code
        const { data: inbOrder } = await admin
          .from("orders")
          .select("*")
          .eq("business_id", sharedLink.to_business_id)
          .eq("code", order.code)
          .eq("type", "inbox")
          .maybeSingle();
        linkedOrder = inbOrder;
      }
    }

    if (!linkedOrder) throw new Error("Linked order not found");

    if (action === "send_prices") {
      // Supplier tagged prices on inbox order → update request order with prices
      if (!items || !grandTotal) throw new Error("Items and total required");

      // Update the inbox order status to 'priced'
      await admin.from("orders").update({ status: "priced", grand_total: grandTotal }).eq("id", inboxOrderId);
      
      // Update inbox order items
      await admin.from("order_items").delete().eq("order_id", inboxOrderId);
      const inboxItems = items.map((item: any) => ({
        order_id: inboxOrderId,
        item_name: item.item_name,
        category: item.category || "",
        quality: item.quality || "",
        quantity: item.quantity || 1,
        price_type: item.price_type || "retail",
        unit_price: item.unit_price || 0,
        subtotal: item.subtotal || 0,
      }));
      await admin.from("order_items").insert(inboxItems);

      // Sync prices to the linked request order
      await admin.from("orders").update({ status: "priced", grand_total: grandTotal }).eq("id", linkedOrder.id);
      await admin.from("order_items").delete().eq("order_id", linkedOrder.id);
      const reqItems = items.map((item: any) => ({
        order_id: linkedOrder.id,
        item_name: item.item_name,
        category: item.category || "",
        quality: item.quality || "",
        quantity: item.quantity || 1,
        price_type: item.price_type || "retail",
        unit_price: item.unit_price || 0,
        subtotal: item.subtotal || 0,
      }));
      await admin.from("order_items").insert(reqItems);

      // Notify the requester
      const commentMsg = comment ? ` — Note: "${comment}"` : "";
      await admin.from("notifications").insert({
        business_id: linkedOrder.business_id,
        type: "order_priced",
        title: "💰 Order Priced by Supplier",
        message: `Order ${order.code} has been priced at ${grandTotal}${commentMsg}. Review and confirm or negotiate.`,
      });

      return new Response(JSON.stringify({ success: true, action: "prices_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm_prices") {
      // Requester confirms the prices → both orders go to 'confirmed'
      await admin.from("orders").update({ status: "confirmed" }).eq("id", inboxOrderId);
      await admin.from("orders").update({ status: "confirmed" }).eq("id", linkedOrder.id);

      // Notify the supplier
      await admin.from("notifications").insert({
        business_id: linkedOrder.business_id,
        type: "order_confirmed",
        title: "✅ Order Prices Confirmed",
        message: `Order ${order.code} prices have been confirmed by the buyer. Awaiting payment.`,
      });

      return new Response(JSON.stringify({ success: true, action: "confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject_prices") {
      // Requester rejects → both go back to 'pending' for re-pricing
      await admin.from("orders").update({ status: "pending" }).eq("id", inboxOrderId);
      await admin.from("orders").update({ status: "pending" }).eq("id", linkedOrder.id);

      const commentMsg = comment ? ` — Reason: "${comment}"` : "";
      await admin.from("notifications").insert({
        business_id: linkedOrder.business_id,
        type: "order_rejected",
        title: "🔄 Prices Rejected — Re-price Needed",
        message: `Order ${order.code} prices were rejected by the buyer${commentMsg}. Please adjust and resend.`,
      });

      return new Response(JSON.stringify({ success: true, action: "rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit_payment") {
      // Buyer submits payment proof → update request order + notify supplier
      await admin.from("orders").update({ 
        payment_method: paymentMethod || "mobile_money",
        proof_url: proofUrl || null,
        status: "payment_submitted" 
      }).eq("id", inboxOrderId);

      // Also update linked order status
      await admin.from("orders").update({ status: "payment_submitted" }).eq("id", linkedOrder.id);

      await admin.from("notifications").insert({
        business_id: linkedOrder.business_id,
        type: "payment_submitted",
        title: "💳 Payment Submitted",
        message: `Payment for order ${order.code} has been submitted. Please verify and confirm.`,
      });

      return new Response(JSON.stringify({ success: true, action: "payment_submitted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm_payment") {
      // Supplier confirms payment received → both orders completed
      await admin.from("orders").update({ status: "paid" }).eq("id", inboxOrderId);
      await admin.from("orders").update({ status: "paid" }).eq("id", linkedOrder.id);

      await admin.from("notifications").insert({
        business_id: linkedOrder.business_id,
        type: "payment_confirmed",
        title: "✅ Payment Confirmed",
        message: `Payment for order ${order.code} has been confirmed by the supplier.`,
      });

      return new Response(JSON.stringify({ success: true, action: "payment_confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action: " + action);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
