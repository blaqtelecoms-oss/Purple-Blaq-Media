import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getGoogleAccessToken } from "../_shared/google-oauth.ts";

/**
 * Fetch visitor, page, and traffic-source metrics from Google Analytics 4.
 * Uses Google OAuth — connect your account on the Integrations tab.
 *
 * Required secrets: GA4_PROPERTY_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;
  const { client: supabase } = auth;

  const propertyId = Deno.env.get("GA4_PROPERTY_ID");
  if (!propertyId) {
    return jsonResponse({
      error: "GA4 is not configured. Set GA4_PROPERTY_ID and connect your Google account on the Integrations tab.",
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
    const days = Math.min(Number(body?.days) || 30, 90);
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

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
