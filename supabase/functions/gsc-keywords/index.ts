import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getGoogleAccessToken } from "../_shared/google-oauth.ts";

/**
 * Fetch top keywords, impressions, and click data from Google Search Console.
 * Uses Google OAuth — connect your account on the Integrations tab.
 *
 * Required secrets: GSC_SITE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;
  const { client: supabase } = auth;

  const siteUrl = Deno.env.get("GSC_SITE_URL");
  if (!siteUrl) {
    return jsonResponse({
      error: "Search Console is not configured. Set GSC_SITE_URL and connect your Google account on the Integrations tab.",
      configured: false,
    }, 400);
  }

  try {
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(supabase);
    } catch {
      return jsonResponse({
        error: "Google account is not connected. Connect it on the Integrations tab.",
        configured: false,
      }, 400);
    }

    const body = await request.json().catch(() => ({}));
    const days = Math.min(Number(body?.days) || 28, 90);
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

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
