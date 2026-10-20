import { createServiceClient } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const body = await request.json();
    const name = text(body?.name, 200);
    const email = text(body?.email, 320).toLowerCase();
    const phone = text(body?.phone, 80);
    const company = text(body?.company, 200);
    const message = text(body?.message, 10000);
    const utmSource = text(body?.utm_source, 200);
    const utmCampaign = text(body?.utm_campaign, 200);

    if (!name || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: "A valid name and email are required." }, 400);
    }

    const supabase = createServiceClient();
    const { data: lead, error: leadError } = await supabase
      .from("marketing_leads")
      .insert({
        name,
        company: company || message ? company : null,
        email,
        phone,
        source: "Website form",
        stage: "New",
        notes: message || null,
        utm_source: utmSource || null,
        utm_campaign: utmCampaign || null,
      })
      .select("id")
      .single();
    if (leadError) throw leadError;

    return jsonResponse({ ok: true, leadId: lead.id }, 201);
  } catch (error) {
    console.error("Marketing form webhook failed:", error);
    return jsonResponse({ error: "The lead could not be saved. Please try again." }, 500);
  }
});
