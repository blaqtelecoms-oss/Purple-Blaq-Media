import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getGoogleAccessToken } from "../_shared/google-oauth.ts";

/**
 * Sync scheduled content items to Google Calendar.
 * Creates a calendar event for each content item with status "Scheduled" that
 * doesn't yet have a calendar event ID. Removes events for items no longer scheduled.
 *
 * Uses Google OAuth — connect your account on the Integrations tab.
 * Required secrets: GOOGLE_CALENDAR_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;
  const { client: supabase } = auth;

  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
  if (!calendarId) {
    return jsonResponse({
      error: "Google Calendar is not configured. Set GOOGLE_CALENDAR_ID and connect your Google account on the Integrations tab.",
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
