import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { full_name, email, phone, company, enquiry_type, message } = body || {};

    const lines = [
      `New enquiry received via the Purple Blaq Media website.`,
      ``,
      `Name: ${full_name || "—"}`,
      `Email: ${email || "—"}`,
      `Phone: ${phone || "—"}`,
      `Company: ${company || "—"}`,
      `What they need: ${enquiry_type || "—"}`,
      ``,
      `Message:`,
      message || "—",
    ];

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: "deon@blaqmedia.co.za",
      subject: "New website enquiry — Purple Blaq Media",
      text: lines.join("\n"),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}