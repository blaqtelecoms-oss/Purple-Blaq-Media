import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

/**
 * Phase 3: Sync scheduled content items to Google Calendar.
 * Creates a calendar event for each content item with status "Scheduled" that
 * doesn't yet have a calendar event ID. Removes events for items no longer scheduled.
 *
 * Required secrets: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID
 */

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/calendar",
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
  const { client: supabase } = auth;

  const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");

  if (!clientEmail || !privateKey || !calendarId) {
    return jsonResponse({
      error: "Google Calendar is not configured. Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_CALENDAR_ID as Supabase secrets.",
      configured: false,
    }, 400);
  }

  try {
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

    // Fetch all content items that are scheduled or published with a publish date
    const { data: items, error } = await supabase
      .from("content_items")
      .select("id, title, platform, status, publish_date, caption, source_data")
      .not("publish_date", "is", null);
    if (error) throw error;

    let created = 0;
    let updated = 0;

    for (const item of items || []) {
      const sourceData = item.source_data || {};
      const eventId = sourceData.google_event_id;

      if (item.status === "Scheduled" && !eventId && item.publish_date) {
        // Create a new calendar event
        const eventDate = item.publish_date;
        const startIso = new Date(`${eventDate}T09:00:00`).toISOString();
        const endIso = new Date(`${eventDate}T10:00:00`).toISOString();

        const eventRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              summary: `${item.platform}: ${item.title}`,
              description: item.caption || "",
              start: { dateTime: startIso },
              end: { dateTime: endIso },
            }),
          },
        );

        if (eventRes.ok) {
          const event = await eventRes.json();
          await supabase
            .from("content_items")
            .update({
              source_data: { ...sourceData, google_event_id: event.id },
            })
            .eq("id", item.id);
          created++;
        }
      } else if ((item.status === "Published" || item.status === "Idea" || item.status === "Drafting") && eventId) {
        // Remove the calendar event if the item is no longer scheduled
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        if (delRes.ok || delRes.status === 410) {
          const { google_event_id, ...rest } = sourceData;
          await supabase
            .from("content_items")
            .update({ source_data: rest })
            .eq("id", item.id);
          updated++;
        }
      } else if (item.status === "Scheduled" && eventId && item.title) {
        // Update existing event if title changed
        const eventRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              summary: `${item.platform}: ${item.title}`,
              description: item.caption || "",
            }),
          },
        );
        if (eventRes.ok) updated++;
      }
    }

    // Update last sync timestamp
    const { data: conn } = await supabase
      .from("integration_connections")
      .select("id")
      .eq("key", "gcal")
      .maybeSingle();
    if (conn) {
      await supabase.from("integration_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);
    }

    return jsonResponse({
      ok: true,
      message: `Calendar synced: ${created} event(s) created, ${updated} updated/removed.`,
      created,
      updated,
    });
  } catch (error) {
    console.error("Calendar sync failed:", error);
    return jsonResponse({ error: "Could not sync to Google Calendar." }, 500);
  }
});
