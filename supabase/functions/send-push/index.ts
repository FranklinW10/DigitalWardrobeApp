// supabase/functions/send-push/index.ts
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

    // Look up recipient's notification preferences
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", notification.recipient_id)
      .single();

    // Map notification types to preference keys
    const prefMap: Record<string, string> = {
      like: "likes",
      comment: "comments",
      comment_reply: "replies",
      comment_like: "comments",
      follow: "follows",
      follow_request: "follow_requests",
    };

    const prefKey = prefMap[notification.type];

    // Check if user has this notification type enabled
    if (prefs && prefKey && !prefs[prefKey]) {
      return new Response("Notification type disabled by user", {
        status: 200,
      });
    }

    // Look up recipient's push token
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from("profiles")
      .select("push_token")
      .eq("id", notification.recipient_id)
      .single();

    if (recipientError || !recipient?.push_token) {
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
      comment_reply: `${actorName} replied to your comment`,
      comment_like: `${actorName} liked your comment`,
    };
    const body = messages[notification.type] ?? "You have a new notification";

    const pushMessage = {
      to: recipient.push_token,
      sound: "default",
      title: "Posted",
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
