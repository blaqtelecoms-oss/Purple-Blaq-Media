import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ member: null, authenticated: false }, { status: 401 });
    }
    if (!user) {
      return Response.json({ member: null, authenticated: false }, { status: 401 });
    }

    const members = await base44.asServiceRole.entities.TeamMember.list();

    if (members.length === 0) {
      const member = await base44.asServiceRole.entities.TeamMember.create({
        full_name: user.full_name || user.email,
        email: user.email,
        job_title: "Administrator",
        role: "Admin",
      });
      return Response.json({ member, claimed: true, authenticated: true });
    }

    const member = members.find(
      (m) => m.email.toLowerCase() === user.email.toLowerCase()
    );
    return Response.json({ member: member || null, claimed: false, authenticated: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}