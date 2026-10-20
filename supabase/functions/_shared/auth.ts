import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse } from "./cors.ts";

export async function authorizeCrmRequest(
  request: Request,
  allowedRoles: string[],
): Promise<{ client: SupabaseClient; userEmail: string } | Response> {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization");
  if (!url || !anonKey) {
    throw new Error("Supabase authentication configuration is missing.");
  }
  if (!authorization) return jsonResponse({ error: "Authentication required." }, 401);

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user?.email) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  const { data: member, error: memberError } = await client
    .from("team_members")
    .select("role")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member || !allowedRoles.includes(member.role)) {
    return jsonResponse({ error: "You do not have permission to perform this action." }, 403);
  }
  return { client, userEmail: user.email.toLowerCase() };
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service configuration is missing.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
