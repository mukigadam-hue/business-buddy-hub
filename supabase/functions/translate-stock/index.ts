// Translate stock item text fields (name, category, quality, unit_type) into the
// user's currently selected app language via Lovable AI Gateway.

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

    const { items, language, languageName } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = (languageName || language || "English").toString();

    const payload = items.slice(0, 200).map((it: any) => ({
      id: String(it.id ?? ""),
      name: String(it.name ?? ""),
      category: String(it.category ?? ""),
      quality: String(it.quality ?? ""),
      unit_type: String(it.unit_type ?? ""),
    }));

    const prompt = `Translate the following inventory items into ${lang} (language code: ${language || "en"}).

Rules:
- Translate the values of "name", "category", "quality" and "unit_type" into natural, everyday ${lang} used by shopkeepers.
- Keep brand names, model numbers and serial-like codes unchanged; translate only the generic words around them.
- Use the natural script/alphabet of ${lang}.
- Keep the SAME "id" for every item and return every item, in the same order.
- If a field is empty, return it empty.
- Output ONLY a valid JSON array, no markdown fences, no commentary, with objects: {"id":"...","name":"...","category":"...","quality":"...","unit_type":"..."}

Items:
${JSON.stringify(payload)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
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

    let translated: any[] = [];
    try {
      translated = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned unparseable JSON", raw }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(translated)) translated = [];

    return new Response(JSON.stringify({ items: translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
