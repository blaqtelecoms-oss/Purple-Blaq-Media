import { authorizeCrmRequest, createServiceClient } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["Admin", "Development", "Marketing", "Finance", "Support"];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const authorization = await authorizeCrmRequest(request, ["Admin"]);
    if (authorization instanceof Response) return authorization;

    const body = await request.json();
    const fullName = typeof body?.full_name === "string" ? body.full_name.trim().slice(0, 200) : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const jobTitle = typeof body?.job_title === "string" ? body.job_title.trim().slice(0, 200) : "";
    const role = typeof body?.role === "string" ? body.role : "Development";
    if (!fullName || !EMAIL_RE.test(email) || !ROLES.includes(role)) {
      return jsonResponse({ error: "A valid name, email, and team role are required." }, 400);
    }

    const siteUrl = Deno.env.get("APP_URL");
    if (!siteUrl) throw new Error("APP_URL must be configured for team invitations.");
    const supabase = createServiceClient();

    let existingUser = false;
    for (let page = 1; ; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      existingUser = data.users.some((user) => user.email?.toLowerCase() === email);
      if (existingUser || data.users.length < 1000) break;
    }

    if (!existingUser) {
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: `${siteUrl.replace(/\/$/, "")}/reset-password`,
      });
      if (error) throw error;
    }

    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .upsert(
        { full_name: fullName, email, job_title: jobTitle || null, role },
        { onConflict: "email" },
      )
      .select("*")
      .single();
    if (memberError) throw memberError;

    return jsonResponse({ member, invited: !existingUser });
  } catch (error) {
    console.error("Team invitation failed:", error);
    return jsonResponse({ error: error.message || "Could not invite the team member." }, 500);
  }
});
