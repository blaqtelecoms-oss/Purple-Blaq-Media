import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getGoogleAccessToken } from "../_shared/google-oauth.ts";

/**
 * Phase 3: Sync real ad spend from Google Ads and Meta Ads into campaign records.
 * Matches campaigns by external_id or name, then updates the spend field.
 *
 * Required secrets:
 *   Google Ads: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID,
 *               GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY
 *   Meta Ads:   META_ADS_ACCESS_TOKEN, META_AD_ACCOUNT_ID
 */

async function syncMetaAds(supabase: ReturnType<typeof Object>, since: string): Promise<number> {
  const token = Deno.env.get("META_ADS_ACCESS_TOKEN");
  const accountId = Deno.env.get("META_AD_ACCOUNT_ID");
  if (!token || !accountId) return 0;

  const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${actId}/insights?fields=campaign_name,spend&time_start=${since}&time_end=${new Date().toISOString().slice(0, 10)}&level=campaign&access_token=${token}`,
  );
  if (!res.ok) {
    console.error("Meta Ads sync failed:", res.status, await res.text());
    return 0;
  }
  const data = await res.json();
  let updated = 0;
  for (const insight of data?.data || []) {
    const spend = Number(insight.spend || 0);
    if (spend <= 0) continue;

    // Match by external_id first, then by name
    let matchQuery = supabase.from("campaigns").select("id, spend").eq("external_account", "Meta Ads");
    if (insight.campaign_id) {
      const { data: byExt } = await supabase
        .from("campaigns")
        .select("id, spend")
        .eq("external_account", "Meta Ads")
        .eq("external_id", insight.campaign_id)
        .maybeSingle();
      if (byExt) {
        await supabase.from("campaigns").update({ spend }).eq("id", byExt.id);
        updated++;
        continue;
      }
    }
    // Try name match
    const { data: byName } = await supabase
      .from("campaigns")
      .select("id, spend")
      .ilike("name", `%${insight.campaign_name}%`)
      .maybeSingle();
    if (byName) {
      await supabase.from("campaigns").update({ spend, external_account: "Meta Ads", external_id: insight.campaign_id || null }).eq("id", byName.id);
      updated++;
    }
  }
  return updated;
}

async function syncGoogleAds(supabase: ReturnType<typeof Object>, since: string): Promise<number> {
  const devToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
  const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID");
  if (!devToken || !customerId) return 0;

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(supabase as never);
  } catch {
    return 0;
  }

  const gaqlQuery = `SELECT campaign.name, campaign.id, metrics.cost FROM campaign WHERE segments.date >= '${since}' AND segments.date <= '${new Date().toISOString().slice(0, 10)}'`;
  const res = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": devToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: gaqlQuery }),
    },
  );
  if (!res.ok) {
    console.error("Google Ads sync failed:", res.status, await res.text());
    return 0;
  }
  const data = await res.json();
  let updated = 0;
  const results = data?.[0]?.results || [];
  for (const row of results) {
    const campaignName = row?.campaign?.name;
    const campaignId = String(row?.campaign?.id || "");
    const costMicros = Number(row?.metrics?.costMicros || 0);
    const spend = costMicros / 1_000_000;
    if (spend <= 0) continue;

    // Match by external_id first, then by name
    if (campaignId) {
      const { data: byExt } = await supabase
        .from("campaigns")
        .select("id, spend")
        .eq("external_account", "Google Ads")
        .eq("external_id", campaignId)
        .maybeSingle();
      if (byExt) {
        await supabase.from("campaigns").update({ spend }).eq("id", byExt.id);
        updated++;
        continue;
      }
    }
    if (campaignName) {
      const { data: byName } = await supabase
        .from("campaigns")
        .select("id, spend")
        .ilike("name", `%${campaignName}%`)
        .maybeSingle();
      if (byName) {
        await supabase.from("campaigns").update({ spend, external_account: "Google Ads", external_id: campaignId || null }).eq("id", byName.id);
        updated++;
      }
    }
  }
  return updated;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;
  const { client: supabase } = auth;

  try {
    const body = await request.json().catch(() => ({}));
    const days = Math.min(Number(body?.days) || 30, 90);
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const metaUpdated = await syncMetaAds(supabase, since);
    const googleUpdated = await syncGoogleAds(supabase, since);

    // Update last sync timestamp for both ad integrations
    for (const key of ["gads", "mads"]) {
      const { data: conn } = await supabase
        .from("integration_connections")
        .select("id")
        .eq("key", key)
        .maybeSingle();
      if (conn) {
        await supabase.from("integration_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);
      }
    }

    return jsonResponse({
      ok: true,
      message: `Synced ${metaUpdated + googleUpdated} campaign(s).`,
      metaUpdated,
      googleUpdated,
    });
  } catch (error) {
    console.error("Ads spend sync failed:", error);
    return jsonResponse({ error: "Could not sync ad spend." }, 500);
  }
});
