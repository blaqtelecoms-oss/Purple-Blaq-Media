import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

/**
 * Phase 2: Fetch top keywords, impressions, and click data from Google Search Console.
 * Uses the same Google service account as GA4.
 *
 * Required secrets: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GSC_SITE_URL
 */

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat: now,
  };
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsigned = `${b64url(header)}.${b64url(payload)}`;
  const pemBody = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsigned}.${sigB64}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!tokenRes.ok) throw new Error("Google auth failed");
  return (await tokenRes.json()).access_token;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;

  const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
  const siteUrl = Deno.env.get("GSC_SITE_URL");

  if (!clientEmail || !privateKey || !siteUrl) {
    return jsonResponse({
      error: "Search Console is not configured. Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GSC_SITE_URL as Supabase secrets.",
      configured: false,
    }, 400);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const days = Math.min(Number(body?.days) || 28, 90);
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

    // Fetch top queries (keywords)
    const queriesRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 20,
        }),
      },
    );
    if (!queriesRes.ok) {
      const err = await queriesRes.text();
      console.error("GSC queries failed:", queriesRes.status, err);
      return jsonResponse({ error: "Search Console API request failed." }, queriesRes.status);
    }
    const queriesData = await queriesRes.json();
    const topKeywords = (queriesData?.rows || []).map((r: Record<string, unknown>) => ({
      keyword: r.keys as string[],
      clicks: r.clicks as number,
      impressions: r.impressions as number,
      ctr: Number((r.ctr as number) * 100).toFixed(1),
      position: Number(r.position as number).toFixed(1),
    }));

    // Fetch top pages
    const pagesRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["page"],
          rowLimit: 10,
        }),
      },
    );
    const pagesData = await pagesRes.json();
    const topPages = (pagesData?.rows || []).map((r: Record<string, unknown>) => ({
      page: r.keys as string[],
      clicks: r.clicks as number,
      impressions: r.impressions as number,
      position: Number(r.position as number).toFixed(1),
    }));

    // Totals
    const totalClicks = topKeywords.reduce((a, k) => a + k.clicks, 0);
    const totalImpressions = topKeywords.reduce((a, k) => a + k.impressions, 0);
    const avgPosition = topKeywords.length
      ? (topKeywords.reduce((a, k) => a + Number(k.position), 0) / topKeywords.length).toFixed(1)
      : "0";

    return jsonResponse({
      ok: true,
      topKeywords,
      topPages,
      totals: { clicks: totalClicks, impressions: totalImpressions, avgPosition },
      dateRange: { start: startDate, end: endDate },
    });
  } catch (error) {
    console.error("GSC keywords failed:", error);
    return jsonResponse({ error: "Could not fetch Search Console data." }, 500);
  }
});
