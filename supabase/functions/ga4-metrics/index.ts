import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

/**
 * Phase 2: Fetch visitor, page, and traffic-source metrics from Google Analytics 4.
 * Uses a Google service account (client email + private key) to call the
 * Google Analytics Data API v1beta.
 *
 * Required secrets: GA4_PROPERTY_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY
 */

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat: now,
  };

  // Minimal base64url encode
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsigned = `${b64url(header)}.${b64url(payload)}`;

  // Import the private key
  const pemBody = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsigned}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) throw new Error("Google auth failed");
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;

  const propertyId = Deno.env.get("GA4_PROPERTY_ID");
  const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");

  if (!propertyId || !clientEmail || !privateKey) {
    return jsonResponse({
      error: "GA4 is not configured. Set GA4_PROPERTY_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY as Supabase secrets.",
      configured: false,
    }, 400);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const days = Math.min(Number(body?.days) || 30, 90);
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

    // Fetch total visitors and sessions
    const metricsRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          metrics: [
            { name: "totalUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
          ],
        }),
      },
    );
    if (!metricsRes.ok) {
      const err = await metricsRes.text();
      console.error("GA4 metrics failed:", metricsRes.status, err);
      return jsonResponse({ error: "GA4 API request failed." }, metricsRes.status);
    }
    const metricsData = await metricsRes.json();
    const row = metricsData?.rows?.[0]?.metricValues || [];
    const totals = {
      visitors: Number(row[0]?.value || 0),
      sessions: Number(row[1]?.value || 0),
      pageViews: Number(row[2]?.value || 0),
      avgSessionDuration: Number(row[3]?.value || 0),
    };

    // Fetch top pages
    const pagesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 10,
        }),
      },
    );
    const pagesData = await pagesRes.json();
    const topPages = (pagesData?.rows || []).map((r: Record<string, unknown>) => ({
      path: (r.dimensionValues as Record<string, string>[])?.[0]?.value || "",
      views: Number((r.metricValues as Record<string, string>[])?.[0]?.value || 0),
      visitors: Number((r.metricValues as Record<string, string>[])?.[1]?.value || 0),
    }));

    // Fetch traffic sources
    const sourcesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "sessionMedium" }],
          metrics: [{ name: "totalUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: 10,
        }),
      },
    );
    const sourcesData = await sourcesRes.json();
    const topSources = (sourcesData?.rows || []).map((r: Record<string, unknown>) => ({
      medium: (r.dimensionValues as Record<string, string>[])?.[0]?.value || "",
      visitors: Number((r.metricValues as Record<string, string>[])?.[0]?.value || 0),
      sessions: Number((r.metricValues as Record<string, string>[])?.[1]?.value || 0),
    }));

    return jsonResponse({
      ok: true,
      totals,
      topPages,
      topSources,
      dateRange: { start: startDate, end: new Date().toISOString().slice(0, 10) },
    });
  } catch (error) {
    console.error("GA4 metrics failed:", error);
    return jsonResponse({ error: "Could not fetch GA4 metrics." }, 500);
  }
});
