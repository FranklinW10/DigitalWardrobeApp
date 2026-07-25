// supabase/functions/send-push/index.ts
// Triggered by a Database Webhook on INSERT into public.notifications.
// Looks up the recipient's push token and sends via Expo's push API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const notification = payload.record;

    if (!notification) {
      return new Response("No record in payload", { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up recipient's push token and the actor's username for the message
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from("profiles")
      .select("push_token")
      .eq("id", notification.recipient_id)
      .single();

    if (recipientError || !recipient?.push_token) {
      // No token saved (denied permission, not logged in on a device, etc) — skip silently
      return new Response("No push token for recipient", { status: 200 });
    }

    const { data: actor } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", notification.actor_id)
      .single();

    const actorName = actor?.username ?? "Someone";
    const messages: Record<string, string> = {
      like: `${actorName} liked your post`,
      comment: `${actorName} commented on your post`,
      follow: `${actorName} started following you`,
    };
    const body = messages[notification.type] ?? "You have a new notification";

    const pushMessage = {
      to: recipient.push_token,
      sound: "default",
      title: "Fit Check",
      body,
      data: {
        type: notification.type,
        post_id: notification.post_id,
        comment_id: notification.comment_id,
        actor_id: notification.actor_id,
      },
    };

    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(pushMessage),
    });

    const result = await expoResponse.json();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error sending push:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
