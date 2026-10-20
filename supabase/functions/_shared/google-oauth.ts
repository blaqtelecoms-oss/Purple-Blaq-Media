import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Shared Google OAuth helpers for all Google integrations (GA4, GSC,
 * Calendar, Ads, Drive). Replaces the former service-account JWT flow.
 *
 * Required secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 * Tokens are stored in integration_connections (key "google") source_data.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/drive.readonly",
  "openid",
  "email",
].join(" ");

export function getGoogleRedirectUri(): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL is not set.");
  return `${supabaseUrl}/functions/v1/google-oauth`;
}

export function buildGoogleAuthUrl(state: string): string {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set.");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials are not set.");
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return await res.json();
}

export async function refreshGoogleToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials are not set.");
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return await res.json();
}

/**
 * Get a valid Google access token for the org's connected Google account.
 * Refreshes the token automatically if it has expired.
 * Throws "GOOGLE_NOT_CONNECTED" if no Google account is connected.
 */
export async function getGoogleAccessToken(supabase: SupabaseClient): Promise<string> {
  const { data: conn, error } = await supabase
    .from("integration_connections")
    .select("id, source_data")
    .eq("key", "google")
    .maybeSingle();
  if (error) throw error;
  if (!conn || !conn.source_data?.refresh_token) {
    throw new Error("GOOGLE_NOT_CONNECTED");
  }

  const { refresh_token, access_token, expires_at } = conn.source_data as Record<string, unknown>;
  const now = Date.now();

  // Reuse cached access token if still valid (5-min buffer)
  if (access_token && expires_at && now < (expires_at as number) - 300_000) {
    return access_token as string;
  }

  const refreshed = await refreshGoogleToken(refresh_token as string);
  const newExpiresAt = now + (refreshed.expires_in || 3600) * 1000;

  await supabase
    .from("integration_connections")
    .update({
      source_data: { ...conn.source_data, access_token: refreshed.access_token, expires_at: newExpiresAt },
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", conn.id);

  return refreshed.access_token;
}

// --- State signing (CSRF protection) ---

async function getHmacKey() {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret";
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const b64url = (str: string) =>
  btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const b64urlDecode = (str: string) =>
  atob(str.replace(/-/g, "+").replace(/_/g, "/"));

export async function signState(payload: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(payload);
  const payloadB64 = b64url(json);
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payloadB64}.${sigB64}`;
}

export async function verifyState(state: string): Promise<Record<string, unknown> | null> {
  const [payloadB64, sigB64] = state.split(".");
  if (!payloadB64 || !sigB64) return null;
  const key = await getHmacKey();
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64)),
  ))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (sigB64 !== expectedSig) return null;
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64));
    if (typeof payload.ts !== "number" || Date.now() - payload.ts > 600_000) return null;
    return payload;
  } catch {
    return null;
  }
}
