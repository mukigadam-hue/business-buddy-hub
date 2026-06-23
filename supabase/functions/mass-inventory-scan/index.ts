// Mass AI Inventory Scan: takes a photo (base64 data URL) of shelves/displays and
// returns a JSON array of detected items via Lovable AI Gateway (google/gemini-2.5-flash).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image, businessName, businessType } = await req.json();
    if (!image || typeof image !== "string") {
      return new Response(JSON.stringify({ error: "image (data URL) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert retail inventory assistant. Look at the uploaded image of multiple store stock items on shelves, displays, or hangers. The current business profile is a ${businessType || "general retail business"} named "${businessName || "the shop"}". Use this context to identify items correctly.

For each distinct item you see, generate a data object. Output ONLY a clean JSON array of objects with no markdown blocks or chat text.

Use this exact structure:
[
  {
    "item_name": "Brand and full product name here",
    "category": "Broad category name based on the item type",
    "quality": "Estimate based on packaging look, e.g., Grade A, Original, Generic",
    "unit_type": "Pieces",
    "cost_per_unit": 0.00,
    "wholesale": 0.00,
    "retail": 0.00,
    "serial_number": "",
    "bulk_packaging": false,
    "quantity": 1
  }
]`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${aiRes.status} ${txt}` }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw: string = aiJson?.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if present and locate JSON array
    let cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const first = cleaned.indexOf("[");
    const last = cleaned.lastIndexOf("]");
    if (first !== -1 && last !== -1) cleaned = cleaned.slice(first, last + 1);

    let items: any[] = [];
    try {
      items = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned unparseable JSON", raw }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!Array.isArray(items)) items = [];

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
