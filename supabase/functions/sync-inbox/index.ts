import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

/**
 * Backfills recent received emails from Resend that are missing from the inbox.
 * A safety net for when the webhook was down. Called by the "Sync inbox" button.
 */

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;
  const { client: supabase } = auth;

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return jsonResponse({ error: "Resend is not configured. Set RESEND_API_KEY." }, 500);
    }

    // List recent received emails from Resend.
    const listRes = await fetch("https://api.resend.com/emails?limit=50", {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!listRes.ok) {
      const err = await listRes.text();
      console.error("Resend list failed:", listRes.status, err);
      return jsonResponse({ error: "Could not list emails from Resend." }, listRes.status);
    }

    const listData = await listRes.json();
    const emails = listData?.data || listData || [];
    let added = 0;

    for (const item of emails) {
      const emailId: string | undefined = item?.id || item?.email_id;
      if (!emailId) continue;

      // Skip if we already have it.
      const { data: existing } = await supabase
        .from("email_messages")
        .select("id")
        .eq("resend_id", emailId)
        .maybeSingle();
      if (existing) continue;

      const fromEmail = item?.from ? String(item.from).match(/<(.+)>/)?.[1] || item.from : "";
      const subject = item?.subject || "(no subject)";
      const receivedAt = item?.created_at || new Date().toISOString();

      let leadId: string | null = null;
      if (fromEmail) {
        const { data: lead } = await supabase
          .from("marketing_leads")
          .select("id")
          .eq("email", fromEmail.toLowerCase())
          .maybeSingle();
        if (lead) leadId = lead.id;
      }

      const { error } = await supabase
        .from("email_messages")
        .insert({
          direction: "inbound",
          resend_id: emailId,
          thread_id: crypto.randomUUID(),
          from_email: fromEmail,
          to_email: "sales@purpleblaq.co.za",
          subject,
          text: item?.text || null,
          received_or_sent_at: receivedAt,
          is_read: false,
          lead_id: leadId,
        });
      if (!error) added++;
    }

    // Update the last sync timestamp.
    const { data: conn } = await supabase
      .from("integration_connections")
      .select("id")
      .eq("key", "resend")
      .maybeSingle();
    if (conn) {
      await supabase
        .from("integration_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", conn.id);
    }

    return jsonResponse({ ok: true, message: `${added} new message(s) synced.`, added });
  } catch (error) {
    console.error("Inbox sync failed:", error);
    return jsonResponse({ error: "Could not sync the inbox." }, 500);
  }
});
