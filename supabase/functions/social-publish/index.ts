import { authorizeCrmRequest } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

/**
 * Phase 3: Publish a content item to a social platform.
 * Supports Meta (Facebook/Instagram), LinkedIn, and TikTok.
 * Updates the content item with the external post ID and sets status to Published.
 *
 * Required secrets depend on the platform:
 *   Meta: META_ACCESS_TOKEN, META_PAGE_ID (and META_IG_USER_ID for Instagram)
 *   LinkedIn: LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN
 *   TikTok: TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID
 */

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const auth = await authorizeCrmRequest(request, ["Admin", "Marketing"]);
  if (auth instanceof Response) return auth;
  const { client: supabase } = auth;

  try {
    const body = await request.json();
    const contentId = body?.content_id;
    if (!contentId) return jsonResponse({ error: "content_id is required." }, 400);

    const { data: content, error: fetchError } = await supabase
      .from("content_items")
      .select("*")
      .eq("id", contentId)
      .maybeSingle();
    if (fetchError || !content) return jsonResponse({ error: "Content item not found." }, 404);

    const platform = content.platform;
    const message = content.caption || content.title;
    let externalPostId: string | null = null;

    if (platform === "Facebook" || platform === "Instagram") {
      const token = Deno.env.get("META_ACCESS_TOKEN");
      const pageId = Deno.env.get("META_PAGE_ID");
      if (!token || !pageId) {
        return jsonResponse({ error: "Meta is not configured. Set META_ACCESS_TOKEN and META_PAGE_ID." }, 400);
      }

      if (platform === "Instagram") {
        const igUserId = Deno.env.get("META_IG_USER_ID") || pageId;
        // Create container
        const containerRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caption: message,
              access_token: token,
            }),
          },
        );
        if (!containerRes.ok) {
          const err = await containerRes.text();
          console.error("IG container failed:", err);
          return jsonResponse({ error: "Instagram publish failed." }, containerRes.status);
        }
        const container = await containerRes.json();
        const creationId = container.id;

        // Publish container
        const publishRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creation_id: creationId, access_token: token }),
          },
        );
        if (!publishRes.ok) {
          const err = await publishRes.text();
          console.error("IG publish failed:", err);
          return jsonResponse({ error: "Instagram publish failed." }, publishRes.status);
        }
        const published = await publishRes.json();
        externalPostId = published.id;
      } else {
        // Facebook page post
        const postRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, access_token: token }),
          },
        );
        if (!postRes.ok) {
          const err = await postRes.text();
          console.error("FB post failed:", err);
          return jsonResponse({ error: "Facebook publish failed." }, postRes.status);
        }
        const posted = await postRes.json();
        externalPostId = posted.id;
      }
    } else if (platform === "LinkedIn") {
      const token = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
      const personUrn = Deno.env.get("LINKEDIN_PERSON_URN");
      if (!token || !personUrn) {
        return jsonResponse({ error: "LinkedIn is not configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN." }, 400);
      }

      const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: personUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: message },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      if (!postRes.ok) {
        const err = await postRes.text();
        console.error("LinkedIn post failed:", err);
        return jsonResponse({ error: "LinkedIn publish failed." }, postRes.status);
      }
      const posted = await postRes.json();
      externalPostId = posted.id || posted.activity;
    } else if (platform === "TikTok") {
      const token = Deno.env.get("TIKTOK_ACCESS_TOKEN");
      const openId = Deno.env.get("TIKTOK_OPEN_ID");
      if (!token || !openId) {
        return jsonResponse({ error: "TikTok is not configured. Set TIKTOK_ACCESS_TOKEN and TIKTOK_OPEN_ID." }, 400);
      }
      // TikTok Content Posting API (requires video upload — this is a simplified text stub)
      return jsonResponse({
        error: "TikTok publishing requires a video file. Upload the video to the Assets tab first, then link it to the content item.",
      }, 400);
    } else if (platform === "X") {
      return jsonResponse({ error: "X (Twitter) publishing is not yet supported. Use the platform directly." }, 400);
    } else {
      return jsonResponse({ error: `Publishing to ${platform} is not supported.` }, 400);
    }

    // Update the content item with the external post ID and mark as Published
    await supabase
      .from("content_items")
      .update({
        external_post_id: externalPostId,
        status: "Published",
        publish_date: content.publish_date || new Date().toISOString().slice(0, 10),
      })
      .eq("id", contentId);

    return jsonResponse({ ok: true, externalPostId, platform });
  } catch (error) {
    console.error("Social publish failed:", error);
    return jsonResponse({ error: "Could not publish the content." }, 500);
  }
});
