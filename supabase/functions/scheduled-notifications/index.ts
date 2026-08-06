// supabase/functions/scheduled-notifications/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

interface Profile {
  id: string;
  push_token: string;
  timezone: string;
  last_active_at: string | null;
  last_morning_reminder_date: string | null;
  last_evening_reminder_date: string | null;
  last_inactive_3day_sent_at: string | null;
  last_inactive_7day_sent_at: string | null;
  streak: number | null;
}

interface NotificationPrefs {
  reminders: boolean;
}

function getLocalTimeParts(timezone: string) {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
  }).format(now);
  return { hour, dateStr };
}

async function sendPushBatch(
  messages: {
    to: string;
    sound: string;
    title: string;
    body: string;
    data: any;
  }[],
) {
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const chunk = messages.slice(i, i + EXPO_BATCH_SIZE);
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(chunk),
    });
  }
}

Deno.serve(async () => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, push_token, timezone, last_active_at, last_morning_reminder_date, last_evening_reminder_date, last_inactive_3day_sent_at, last_inactive_7day_sent_at, streak",
      )
      .not("push_token", "is", null);

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response("No profiles with push tokens", { status: 200 });
    }

    // Fetch all notification preferences in one query
    const { data: allPrefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("user_id, reminders");

    const prefsMap = new Map(
      (allPrefs ?? []).map((p) => [p.user_id, p.reminders ?? true]),
    );

    const now = new Date();
    const messages: any[] = [];
    const fitCheckUpdates: { id: string; field: string; value: string }[] = [];
    const inactivityUpdates: { id: string; field: string; value: string }[] =
      [];

    const { data: activePosts } = await supabaseAdmin
      .from("posts")
      .select("user_id")
      .eq("isoutfit_post", true)
      .eq("is_post_today", true)
      .eq("is_active", true);

    const postedTodayUserIds = new Set(
      (activePosts ?? []).map((p) => p.user_id),
    );

    for (const profile of profiles as Profile[]) {
      const { hour, dateStr } = getLocalTimeParts(profile.timezone);
      const hasPostedToday = postedTodayUserIds.has(profile.id);
      const hasRemindersEnabled = prefsMap.get(profile.id) !== false;

      // --- Morning reminder (10am local) ---
      if (
        hour === 9 &&
        !hasPostedToday &&
        hasRemindersEnabled &&
        profile.last_morning_reminder_date !== dateStr
      ) {
        messages.push({
          to: profile.push_token,
          sound: "default",
          title: "Fit Check",
          body: "Wake Up! Its time to post your fit for today",
          data: { type: "fit_reminder_morning" },
        });
        fitCheckUpdates.push({
          id: profile.id,
          field: "last_morning_reminder_date",
          value: dateStr,
        });
      }

      // --- Evening reminder (8pm local) ---
      if (
        hour === 20 &&
        !hasPostedToday &&
        hasRemindersEnabled &&
        profile.last_evening_reminder_date !== dateStr
      ) {
        messages.push({
          to: profile.push_token,
          sound: "default",
          title: "Fit Check",
          body:
            (profile.streak ?? 0) >= 3
              ? `Your ${profile.streak} day streak is in danger! Post your fit before the day ends`
              : "You still haven't posted your fit today, last chance!",
          data: { type: "fit_reminder_evening" },
        });
        fitCheckUpdates.push({
          id: profile.id,
          field: "last_evening_reminder_date",
          value: dateStr,
        });
      }

      // --- Inactivity notifications (also check reminders preference) ---
      if (profile.last_active_at && hasRemindersEnabled) {
        const daysSinceActive =
          (now.getTime() - new Date(profile.last_active_at).getTime()) /
          (1000 * 60 * 60 * 24);

        const already3DaySent =
          profile.last_inactive_3day_sent_at &&
          new Date(profile.last_inactive_3day_sent_at) >
            new Date(profile.last_active_at);

        if (daysSinceActive >= 3 && daysSinceActive < 7 && !already3DaySent) {
          messages.push({
            to: profile.push_token,
            sound: "default",
            title: "Fit Check",
            body: "We miss you! Come see what your friends have been wearing.",
            data: { type: "inactive_3day" },
          });
          inactivityUpdates.push({
            id: profile.id,
            field: "last_inactive_3day_sent_at",
            value: now.toISOString(),
          });
        }

        // --- Inactivity: 7 days ---
        const already7DaySent =
          profile.last_inactive_7day_sent_at &&
          new Date(profile.last_inactive_7day_sent_at) >
            new Date(profile.last_active_at);

        if (daysSinceActive >= 7 && !already7DaySent) {
          messages.push({
            to: profile.push_token,
            sound: "default",
            title: "Fit Check",
            body: "It's been a week, come check out what's new!",
            data: { type: "inactive_7day" },
          });
          inactivityUpdates.push({
            id: profile.id,
            field: "last_inactive_7day_sent_at",
            value: now.toISOString(),
          });
        }
      }
    }

    if (messages.length > 0) {
      await sendPushBatch(messages);
    }

    await Promise.all([
      ...fitCheckUpdates.map((u) =>
        supabaseAdmin
          .from("profiles")
          .update({ [u.field]: u.value })
          .eq("id", u.id),
      ),
      ...inactivityUpdates.map((u) =>
        supabaseAdmin
          .from("profiles")
          .update({ [u.field]: u.value })
          .eq("id", u.id),
      ),
    ]);

    return new Response(
      JSON.stringify({ sent: messages.length, checked: profiles.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error in scheduled-notifications:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
