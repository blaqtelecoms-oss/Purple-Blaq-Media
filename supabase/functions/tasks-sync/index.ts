import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { getGoogleAccessToken } from "../_shared/google-oauth.ts";

/**
 * Bidirectional Google Tasks sync.
 *
 * POST (authenticated CRM user):
 *   - Imports tasks from the user's default Google Task list into marketing_tasks.
 *   - Pushes new marketing_tasks (without a google_task_id) to Google Tasks.
 *   - Updates task status: completed tasks become "Done", new tasks become "To do".
 *
 * Uses the default task list (@default).
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

    const taskListId = "@default";
    let imported = 0;
    let created = 0;
    let updated = 0;

    // --- 1. Import tasks FROM Google Tasks ---
    const tasksRes = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&maxResults=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (tasksRes.ok) {
      const tasksData = await tasksRes.json();
      for (const gTask of (tasksData.items || []) as Record<string, unknown>[]) {
        const gTaskId = gTask.id as string;
        const title = gTask.title as string || "(untitled)";
        const isCompleted = gTask.completed === true;
        const dueDate = gTask.due ? new Date(gTask.due as string).toISOString().split("T")[0] : null;
        const status = isCompleted ? "Done" : "To do";

        // Check if we already have this task tracked
        const { data: existing } = await supabase
          .from("marketing_tasks")
          .select("id, title, status, source_data")
          .eq("source_data->>google_task_id", gTaskId)
          .maybeSingle();

        if (existing) {
          // Update status if changed
          if (existing.status !== status) {
            await supabase
              .from("marketing_tasks")
              .update({ status })
              .eq("id", existing.id);
            updated++;
          }
        } else {
          // Create new marketing task from Google Task
          await supabase
            .from("marketing_tasks")
            .insert({
              title,
              status,
              due_date: dueDate,
              source_data: { google_task_id: gTaskId, synced_from: "google_tasks" },
            });
          imported++;
        }
      }
    }

    // --- 2. Push new marketing tasks TO Google Tasks ---
    const { data: localTasks, error } = await supabase
      .from("marketing_tasks")
      .select("id, title, status, due_date, assignee, source_data");
    if (error) throw error;

    for (const task of (localTasks || []) as Record<string, unknown>[]) {
      const sourceData = (task.source_data || {}) as Record<string, unknown>;
      if (sourceData.google_task_id || sourceData.synced_from === "google_tasks") continue;

      // Push to Google Tasks
      const createRes = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.title,
            due: task.due_date ? new Date(task.due_date as string).toISOString() : null,
            status: task.status === "Done" ? "completed" : "needsAction",
          }),
        },
      );

      if (createRes.ok) {
        const createdTask = await createRes.json();
        await supabase
          .from("marketing_tasks")
          .update({ source_data: { ...sourceData, google_task_id: createdTask.id } })
          .eq("id", task.id);
        created++;
      }
    }

    // Update last sync timestamp for gcal-style tracking
    const { data: conn } = await supabase
      .from("integration_connections")
      .select("id")
      .eq("key", "gcal")
      .maybeSingle();

    return jsonResponse({
      ok: true,
      message: `Tasks synced: ${imported} imported, ${created} pushed, ${updated} updated.`,
      imported,
      created,
      updated,
    });
  } catch (error) {
    console.error("Tasks sync failed:", error);
    return jsonResponse({ error: "Could not sync Google Tasks." }, 500);
  }
});
