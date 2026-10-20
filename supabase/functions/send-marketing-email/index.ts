import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

const SALES_FROM = "Purple Blaq Sales <sales@purpleblaq.co.za>";
const SALES_REPLY_TO = "sales@purpleblaq.co.za";

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;
  const { client: supabase } = auth;

  try {
    const body = await request.json();
    const to = text(body?.to, 320);
    const cc = text(body?.cc, 1000);
    const subject = text(body?.subject, 500);
    const messageText = text(body?.text, 100000);
    const html = text(body?.html, 200000) || null;
    const inReplyTo = text(body?.in_reply_to, 200) || null;

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return jsonResponse({ error: "A valid recipient is required." }, 400);
    }
    if (!subject) return jsonResponse({ error: "A subject is required." }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return jsonResponse({ error: "Resend is not configured. Set RESEND_API_KEY." }, 500);
    }

    // Resolve thread id from the replied message, if any.
    let threadId = crypto.randomUUID();
    if (inReplyTo) {
      const { data: parent } = await supabase
        .from("email_messages")
        .select("thread_id")
        .eq("id", inReplyTo)
        .maybeSingle();
      if (parent?.thread_id) threadId = parent.thread_id;
    }

    const sendBody: Record<string, unknown> = {
      from: SALES_FROM,
      to,
      reply_to: SALES_REPLY_TO,
      subject,
      text: messageText,
    };
    if (cc) sendBody.cc = cc;
    if (html) sendBody.html = html;
    if (inReplyTo) {
      const { data: parent } = await supabase
        .from("email_messages")
        .select("resend_id")
        .eq("id", inReplyTo)
        .maybeSingle();
      if (parent?.resend_id) sendBody.headers = { "In-Reply-To": parent.resend_id };
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendBody),
    });

    const result = await emailResponse.json();
    if (!emailResponse.ok) {
      console.error("Resend send failed:", emailResponse.status, JSON.stringify(result));
      return jsonResponse({ error: result?.message || "Resend rejected the email." }, emailResponse.status);
    }

    const resendId = result?.id || null;
    const { data: saved, error: saveError } = await supabase
      .from("email_messages")
      .insert({
        direction: "outbound",
        resend_id: resendId,
        thread_id: threadId,
        in_reply_to: inReplyTo || null,
        from_email: SALES_REPLY_TO,
        to_email: to,
        cc: cc || null,
        subject,
        text: messageText,
        html: html || null,
        received_or_sent_at: new Date().toISOString(),
        is_read: true,
      })
      .select("*")
      .single();
    if (saveError) throw saveError;

    return jsonResponse({ ok: true, message: saved }, 201);
  } catch (error) {
    console.error("Send marketing email failed:", error);
    return jsonResponse({ error: "The email could not be sent." }, 500);
  }
});
