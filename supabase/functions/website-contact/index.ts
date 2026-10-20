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
    const fullName = text(body?.full_name, 200);
    const email = text(body?.email, 320).toLowerCase();
    const phone = text(body?.phone, 80);
    const company = text(body?.company, 200);
    const enquiryType = text(body?.enquiry_type, 100);
    const message = text(body?.message, 10000);

    if (!fullName || !EMAIL_RE.test(email) || !message) {
      return jsonResponse({ error: "A valid name, email, and message are required." }, 400);
    }

    const supabase = createServiceClient();
    const { data: enquiry, error: enquiryError } = await supabase
      .from("enquiries")
      .insert({
        full_name: fullName,
        email,
        phone,
        company,
        enquiry_type: enquiryType,
        message,
        status: "New",
      })
      .select("id")
      .single();
    if (enquiryError) throw enquiryError;

    let ticketId: string | null = null;
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        sender_name: fullName,
        sender_email: email,
        subject: enquiryType || "General enquiry",
        status: "Open",
        messages: [{ from: "customer", text: message, timestamp: new Date().toISOString() }],
        source_data: { phone, company, enquiry_type: enquiryType },
      })
      .select("id")
      .single();
    if (ticketError) {
      console.error("Could not create the support ticket for an enquiry:", ticketError);
    } else {
      ticketId = ticket.id;
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("CONTACT_FROM_EMAIL");
    const to = Deno.env.get("CONTACT_NOTIFICATION_EMAIL") || "sales@purpleblaq.co.za";
    if (resendKey && from) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to,
            subject: "New website enquiry — Purple Blaq Media",
            text: [
              `Name: ${fullName}`,
              `Email: ${email}`,
              `Phone: ${phone || "—"}`,
              `Company: ${company || "—"}`,
              `What they need: ${enquiryType || "—"}`,
              "",
              "Message:",
              message,
            ].join("\n"),
          }),
        });
        if (!emailResponse.ok) {
          console.error("Email notification request failed:", emailResponse.status, await emailResponse.text());
        }
      } catch (error) {
        console.error("Email notification could not be sent:", error);
      }
    } else {
      console.warn("Contact email notifications are disabled; configure RESEND_API_KEY and CONTACT_FROM_EMAIL.");
    }

    return jsonResponse({ ok: true, enquiryId: enquiry.id, ticketId }, 201);
  } catch (error) {
    console.error("Website contact submission failed:", error);
    return jsonResponse({ error: "The enquiry could not be saved. Please try again." }, 500);
  }
});
