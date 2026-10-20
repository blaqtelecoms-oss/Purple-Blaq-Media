import { authorizeCrmRequest, createServiceClient } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { buildGoogleAuthUrl, exchangeGoogleCode, signState, verifyState } from "../_shared/google-oauth.ts";

/**
 * Google OAuth handler.
 *
 * POST  (authenticated CRM user): returns { authUrl } for the browser to redirect to.
 * GET   (Google callback redirect): exchanges the auth code for tokens, stores them
 *       in integration_connections (key "google"), and redirects back to the app.
 *
 * Required secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

const GOOGLE_INTEGRATION_KEYS = ["google", "ga4", "gsc", "gcal", "gads", "drive"];

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") return optionsResponse();

  // POST: start OAuth flow (authenticated CRM user)
  if (request.method === "POST") {
    const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
    if (auth instanceof Response) return auth;
    const { userEmail } = auth;

    try {
      const origin = request.headers.get("Origin") || new URL(request.url).origin;
      const state = await signState({ email: userEmail, ts: Date.now(), origin });
      const authUrl = buildGoogleAuthUrl(state);
      return jsonResponse({ authUrl });
    } catch (error) {
      return jsonResponse({ error: (error as Error).message }, 500);
    }
  }

  // GET: OAuth callback from Google (unauthenticated browser redirect)
  if (request.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Determine redirect origin from signed state
    let redirectOrigin: string | null = null;
    if (state) {
      const stateData = await verifyState(state);
      if (stateData?.origin) redirectOrigin = stateData.origin as string;
    }
    if (!redirectOrigin) {
      return new Response(
        `<html><body style="font-family:system-ui;padding:40px"><h2>Session expired</h2><p>Please try connecting Google again from the Integrations tab in your CRM.</p></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const tabUrl = `${redirectOrigin}/admin/marketing?tab=integrations`;

    if (error || !code || !state) {
      return Response.redirect(`${tabUrl}&google=error`, 302);
    }

    const stateData = await verifyState(state);
    if (!stateData) {
      return Response.redirect(`${tabUrl}&google=error`, 302);
    }

    try {
      const tokens = await exchangeGoogleCode(code);
      const supabase = createServiceClient();
      const now = new Date().toISOString();
      const tokenData = {
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
        connected_email: stateData.email,
      };

      // Upsert the master "google" connection (stores tokens) and each
      // Google integration connection (so existing UI checks keep working).
      for (const key of GOOGLE_INTEGRATION_KEYS) {
        const { data: existing } = await supabase
          .from("integration_connections")
          .select("id")
          .eq("key", key)
          .maybeSingle();

        const record = {
          status: "connected",
          connected_at: now,
          last_sync_at: now,
          account_label: key === "google" ? "Google Workspace" : null,
          source_data: key === "google" ? tokenData : { connected_via: "google" },
        };

        if (existing) {
          await supabase.from("integration_connections").update(record).eq("id", existing.id);
        } else {
          await supabase.from("integration_connections").insert({ key, ...record });
        }
      }

      return Response.redirect(`${tabUrl}&google=connected`, 302);
    } catch (error) {
      console.error("Google OAuth callback failed:", error);
      return Response.redirect(`${tabUrl}&google=error`, 302);
    }
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
});
