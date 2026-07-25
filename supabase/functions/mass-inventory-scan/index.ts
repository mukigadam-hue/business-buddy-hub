// Mass AI Inventory Scan: takes a photo (base64 data URL) of shelves/displays and
// returns a JSON array of detected items with bounding boxes via Lovable AI Gateway.

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

    const systemPrompt = `You are an expert retail inventory assistant analyzing a photograph of shelves, walls or displays for a ${businessType || "general retail"} business named "${businessName || "the shop"}".

For EACH distinct product visible in the image, return one JSON object. Group identical duplicates together (e.g. 6 identical boxes = one entry with quantity 6) and pick the tightest bounding box that contains ALL those duplicates as one region. For a unique item, box just that item tightly.

CRITICAL — bounding boxes:
- Use Gemini's normalized coordinate system: integers 0–1000.
- Format: [ymin, xmin, ymax, xmax] (top, left, bottom, right).
- Box each item tightly — no big empty margins, no covering the whole shelf.

Output ONLY a valid JSON array, no markdown fences, no commentary. Exact structure:
[
  {
    "item_name": "Brand and full product name",
    "category": "Broad category",
    "quality": "e.g. Original, Grade A, Generic",
    "unit_type": "Pieces",
    "cost_per_unit": 0,
    "wholesale": 0,
    "retail": 0,
    "serial_number": "",
    "bulk_packaging": false,
    "quantity": 1,
    "bbox": [ymin, xmin, ymax, xmax]
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
