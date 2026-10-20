import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getGoogleAccessToken } from "../_shared/google-oauth.ts";

/**
 * Bidirectional Google Calendar sync.
 *
 * POST (authenticated CRM user):
 *   - Imports events from the user's primary Google Calendar into content_items
 *     (platform "Google Calendar", status "Scheduled").
 *   - Pushes scheduled content_items that don't yet have a Google event to the calendar.
 *   - Updates existing events when content items change.
 *
 * Uses the "primary" calendar — no GOOGLE_CALENDAR_ID needed.
 */

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;
  const { client: supabase } = auth;

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

    const calendarId = "primary";
    let imported = 0;
    let created = 0;
    let updated = 0;

    // --- 1. Import events FROM Google Calendar ---
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (eventsRes.ok) {
      const eventsData = await eventsRes.json();
      for (const event of (eventsData.items || []) as Record<string, unknown>[]) {
        const eventId = event.id as string;
        const title = event.summary as string || "(untitled)";
        const startRaw = event.start?.dateTime || event.start?.date;
        if (!startRaw) continue;
        const publishDate = new Date(startRaw as string).toISOString().split("T")[0];

        // Check if we already have this event tracked
        const { data: existing } = await supabase
          .from("content_items")
          .select("id, title, source_data")
          .eq("platform", "Google Calendar")
          .eq("source_data->>google_event_id", eventId)
          .maybeSingle();

        if (existing) {
          // Update title/date if changed
          if (existing.title !== title) {
            await supabase
              .from("content_items")
              .update({ title, publish_date: publishDate })
              .eq("id", existing.id);
            updated++;
          }
        } else {
          // Create new content item from Google Calendar event
          await supabase
            .from("content_items")
            .insert({
              title,
              platform: "Google Calendar",
              status: "Scheduled",
              publish_date: publishDate,
              caption: event.description as string || "",
              source_data: { google_event_id: eventId, synced_from: "google_calendar" },
            });
          imported++;
        }
      }
    }

    // --- 2. Push scheduled content items TO Google Calendar ---
    const { data: items, error } = await supabase
      .from("content_items")
      .select("id, title, platform, status, publish_date, caption, source_data")
      .not("publish_date", "is", null);
    if (error) throw error;

    for (const item of (items || []) as Record<string, unknown>[]) {
      const sourceData = (item.source_data || {}) as Record<string, unknown>;
      const eventId = sourceData.google_event_id as string | undefined;
      const isGcalItem = item.platform === "Google Calendar";

      // Skip items already imported from Google Calendar
      if (isGcalItem && sourceData.synced_from === "google_calendar") continue;

      const status = item.status as string;
      const publishDate = item.publish_date as string;

      if (status === "Scheduled" && !eventId && publishDate) {
        // Create a new calendar event
        const startIso = new Date(`${publishDate}T09:00:00`).toISOString();
        const endIso = new Date(`${publishDate}T10:00:00`).toISOString();

        const eventRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: `${item.platform}: ${item.title}`,
              description: item.caption as string || "",
              start: { dateTime: startIso },
              end: { dateTime: endIso },
            }),
          },
        );

        if (eventRes.ok) {
          const event = await eventRes.json();
          await supabase
            .from("content_items")
            .update({ source_data: { ...sourceData, google_event_id: event.id } })
            .eq("id", item.id);
          created++;
        }
      } else if ((status === "Published" || status === "Idea" || status === "Drafting") && eventId && !isGcalItem) {
        // Remove the calendar event if the item is no longer scheduled
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (delRes.ok || delRes.status === 410) {
          const { google_event_id: _drop, ...rest } = sourceData;
          await supabase
            .from("content_items")
            .update({ source_data: rest })
            .eq("id", item.id);
          updated++;
        }
      } else if (status === "Scheduled" && eventId && !isGcalItem) {
        // Update existing event if title changed
        const eventRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: `${item.platform}: ${item.title}`,
              description: item.caption as string || "",
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
      message: `Calendar synced: ${imported} imported, ${created} created, ${updated} updated.`,
      imported,
      created,
      updated,
    });
  } catch (error) {
    console.error("Calendar sync failed:", error);
    return jsonResponse({ error: "Could not sync Google Calendar." }, 500);
  }
});
