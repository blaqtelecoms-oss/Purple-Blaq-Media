import { createServiceClient } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

/**
 * Phase 2: WhatsApp Business Cloud API webhook.
 * Handles GET for webhook verification and POST for incoming messages.
 * Creates a marketing lead from each incoming WhatsApp message.
 *
 * Required secrets: WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN (for sending replies)
 */

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();

  // Webhook verification (GET)
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const body = await request.json();

    // Verify the webhook came from Meta
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (!verifyToken) {
      return jsonResponse({ error: "WhatsApp webhook not configured." }, 500);
    }

    const entries = body?.entry || [];
    const supabase = createServiceClient();
    let created = 0;

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const messages = change?.value?.messages || [];
        const contacts = change?.value?.contacts || [];

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          const contact = contacts[i] || {};
          const fromName = contact?.profile?.name || msg?.from || "Unknown";
          const fromPhone = msg?.from || "";
          const msgType = msg?.type || "text";
          const textBody = msg?.text?.body || msg?.button?.text || "";

          // Check if a lead with this phone already exists
          const { data: existing } = await supabase
            .from("marketing_leads")
            .select("id, stage")
            .eq("phone", fromPhone)
            .maybeSingle();

          if (existing) continue; // Skip if lead already exists

          const { error } = await supabase.from("marketing_leads").insert({
            name: fromName,
            phone: fromPhone,
            source: "WhatsApp",
            stage: "New",
            notes: textBody ? `WhatsApp message: ${textBody}` : `WhatsApp ${msgType}`,
          });
          if (!error) created++;
        }
      }
    }

    return jsonResponse({ ok: true, created }, 200);
  } catch (error) {
    console.error("WhatsApp webhook failed:", error);
    return jsonResponse({ error: "Could not process the WhatsApp message." }, 500);
  }
});
