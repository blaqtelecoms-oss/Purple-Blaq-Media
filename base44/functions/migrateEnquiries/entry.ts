import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const enquiries = await base44.asServiceRole.entities.Enquiry.list();
    const tickets = await base44.asServiceRole.entities.SupportTicket.list();

    let migrated = 0;
    for (const e of enquiries) {
      const subject = e.enquiry_type || "General enquiry";
      const exists = tickets.some(
        (t) => t.sender_email === e.email && t.subject === subject
      );
      if (exists) continue;

      await base44.asServiceRole.entities.SupportTicket.create({
        sender_name: e.full_name,
        sender_email: e.email,
        subject,
        status: e.status === "Closed" ? "Resolved" : "Open",
        messages: [
          {
            from: "customer",
            text: e.message || "",
            timestamp: e.created_date || new Date().toISOString(),
          },
        ],
      });
      migrated++;
    }

    return Response.json({ ok: true, migrated, total: enquiries.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}