import { authorizeCrmRequest, createServiceClient } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const authorization = await authorizeCrmRequest(request, ["Admin", "Support"]);
    if (authorization instanceof Response) return authorization;

    const supabase = createServiceClient();
    const [{ data: enquiries, error: enquiriesError }, { data: tickets, error: ticketsError }] =
      await Promise.all([
        supabase.from("enquiries").select("*"),
        supabase.from("support_tickets").select("sender_email, subject"),
      ]);
    if (enquiriesError) throw enquiriesError;
    if (ticketsError) throw ticketsError;

    const existing = new Set(tickets.map((ticket) =>
      `${ticket.sender_email.toLowerCase()}\u0000${ticket.subject}`
    ));
    let migrated = 0;
    for (const enquiry of enquiries) {
      const subject = enquiry.enquiry_type || "General enquiry";
      const key = `${enquiry.email.toLowerCase()}\u0000${subject}`;
      if (existing.has(key)) continue;

      const { error } = await supabase.from("support_tickets").insert({
        sender_name: enquiry.full_name,
        sender_email: enquiry.email,
        subject,
        status: enquiry.status === "Closed" ? "Resolved" : "Open",
        messages: [{
          from: "customer",
          text: enquiry.message || "",
          timestamp: enquiry.created_date || new Date().toISOString(),
        }],
      });
      if (error) throw error;
      existing.add(key);
      migrated++;
    }

    return jsonResponse({ ok: true, migrated, total: enquiries.length });
  } catch (error) {
    console.error("Enquiry migration failed:", error);
    return jsonResponse({ error: error.message || "Could not migrate enquiries." }, 500);
  }
});
