import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { full_name, email, subject, message } = body || {};

    if (!full_name || !email || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ticket = await base44.asServiceRole.entities.SupportTicket.create({
      sender_name: full_name,
      sender_email: email,
      subject: subject || "General enquiry",
      status: "Open",
      messages: [
        { from: "customer", text: message, timestamp: new Date().toISOString() },
      ],
    });

    // Best-effort email alert
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: "deon@blaqmedia.co.za",
        subject: "New support ticket — " + (subject || "General enquiry"),
        text: [
          "New support ticket from the website contact form.",
          "",
          "Name: " + full_name,
          "Email: " + email,
          "Subject: " + (subject || "General enquiry"),
          "",
          "Message:",
          message,
        ].join("\n"),
      });
    } catch {
      /* best-effort */
    }

    return Response.json({ ok: true, id: ticket.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}