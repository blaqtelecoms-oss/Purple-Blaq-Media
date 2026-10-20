import { createServiceClient } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

/**
 * Resend inbound webhook for the `email.received` event.
 * Verifies the Svix-style webhook signature, fetches the full email content
 * from Resend, saves an inbound EmailMessage, and links the sender to a lead.
 * Idempotent: skips emails whose resend_id already exists.
 */

async function verifyWebhookSignature(
  rawBody: string,
  webhookId: string | null,
  timestamp: string | null,
  signatures: string | null,
  secret: string,
): Promise<boolean> {
  if (!webhookId || !timestamp || !signatures) return false;

  // Reject timestamps older than 5 minutes to prevent replay attacks.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - ts);
  if (ageSeconds > 300) return false;

  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
  const expected = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${secret}.${signedPayload}`),
  );
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(expected)));

  const passed = signatures.split(" ").map((s) => s.replace(/^v1,/, ""));
  return passed.includes(expectedBase64);
}

function extractEmail(headerValue: string | undefined): string {
  if (!headerValue) return "";
  const match = headerValue.match(/<(.+)>/);
  return (match ? match[1] : headerValue).trim().toLowerCase();
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("RESEND_WEBHOOK_SECRET is not configured.");
    return jsonResponse({ error: "Webhook secret not configured." }, 500);
  }

  const rawBody = await request.text();

  let verified: boolean;
  try {
    verified = await verifyWebhookSignature(
      rawBody,
      request.headers.get("svix-id") || request.headers.get("webhook-id"),
      request.headers.get("svix-timestamp") || request.headers.get("webhook-timestamp"),
      request.headers.get("svix-signature") || request.headers.get("webhook-signature"),
      webhookSecret,
    );
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return jsonResponse({ error: "Signature verification failed." }, 401);
  }

  if (!verified) {
    return jsonResponse({ error: "Invalid webhook signature." }, 401);
  }

  try {
    const event = JSON.parse(rawBody);
    // Only process received emails.
    const type = event?.type || event?.event_type;
    if (type && !type.includes("received")) {
      return jsonResponse({ ok: true, skipped: "Not an email.received event." });
    }

    const emailId: string | undefined = event?.data?.email_id || event?.data?.id || event?.data?.emailId || event?.email_id;
    if (!emailId) {
      return jsonResponse({ error: "No email id in payload." }, 400);
    }

    const supabase = createServiceClient();

    // Idempotency: skip if we already have this email.
    const { data: existing } = await supabase
      .from("email_messages")
      .select("id")
      .eq("resend_id", emailId)
      .maybeSingle();
    if (existing) {
      return jsonResponse({ ok: true, skipped: "Duplicate email." });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = extractEmail(event?.data?.from || event?.data?.sender);
    const toEmail = extractEmail(event?.data?.to || event?.data?.recipient);
    const subject = event?.data?.subject || event?.data?.headers?.subject || "(no subject)";
    const receivedAt = event?.data?.created_at || event?.data?.received_at || new Date().toISOString();

    let messageText = event?.data?.text || "";
    let messageHtml = event?.data?.html || null;
    let attachments: unknown[] = event?.data?.attachments || [];

    // Fetch the full email content from Resend if a key is available (payload
    // may contain only metadata). This is a best-effort enrichment.
    if (resendKey && (!messageText || attachments.length === 0)) {
      try {
        const detailRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
          headers: { Authorization: `Bearer ${resendKey}` },
        });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          messageText = messageText || detail?.text || detail?.text_body || "";
          messageHtml = messageHtml || detail?.html || detail?.html_body || null;
          if (!attachments.length && detail?.attachments) {
            attachments = detail.attachments;
          }
        }
      } catch (fetchError) {
        console.error("Could not fetch full email content from Resend:", fetchError);
      }
    }

    const threadId = crypto.randomUUID();

    // Link to a lead if the sender matches a lead's email.
    let leadId: string | null = null;
    if (fromEmail) {
      const { data: lead } = await supabase
        .from("marketing_leads")
        .select("id")
        .eq("email", fromEmail)
        .maybeSingle();
      if (lead) leadId = lead.id;
    }

    const { error: insertError } = await supabase
      .from("email_messages")
      .insert({
        direction: "inbound",
        resend_id: emailId,
        thread_id: threadId,
        from_email: fromEmail || null,
        to_email: toEmail || "sales@purpleblaq.co.za",
        subject,
        text: messageText || null,
        html: messageHtml,
        attachments: attachments,
        received_or_sent_at: receivedAt,
        is_read: false,
        lead_id: leadId,
      });
    if (insertError) throw insertError;

    return jsonResponse({ ok: true, emailId, leadId }, 201);
  } catch (error) {
    console.error("Resend inbound webhook failed:", error);
    return jsonResponse({ error: "Could not process the inbound email." }, 500);
  }
});
