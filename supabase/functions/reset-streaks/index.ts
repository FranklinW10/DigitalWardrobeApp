// supabase/functions/reset-streaks/index.ts
// Runs every 15 minutes via pg_cron. For each user, checks whether it's
// their local midnight hour — if so, and they didn't post an outfit
// yesterday (their local yesterday), resets their streak to 0.
// Deliberately does NOT filter by push_token — streaks apply to every
// user regardless of notification settings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function getLocalHourAndYesterday(timezone: string) {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hourCycle: "h23", // guarantees 0-23, avoids the "24" midnight bug
    }).format(now),
  );
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
  }).format(yesterday);
  return { hour, yesterdayStr };
}

Deno.serve(async () => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, timezone, streak");

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response("No profiles", { status: 200 });
    }

    // Only look at users currently in their local midnight hour AND who
    // actually have a streak to lose — no point checking/writing for
    // everyone else every single run.
    const candidates = profiles.filter((p) => {
      const { hour } = getLocalHourAndYesterday(
        p.timezone || "America/Chicago",
      );
      return hour === 0 && (p.streak ?? 0) > 0;
    });

    if (candidates.length === 0) {
      return new Response("No candidates this run", { status: 200 });
    }

    const candidateIds = candidates.map((p) => p.id);

    // One query for all candidates' outfit posts, newest first — then
    // take the first (most recent) post_date seen per user client-side,
    // rather than querying per-user in a loop.
    const { data: recentPosts, error: postsError } = await supabaseAdmin
      .from("posts")
      .select("user_id, post_date")
      .eq("isoutfit_post", true)
      .in("user_id", candidateIds)
      .order("post_date", { ascending: false });

    if (postsError) throw postsError;

    const lastPostDateByUser = new Map<string, string>();
    for (const post of recentPosts ?? []) {
      if (!lastPostDateByUser.has(post.user_id)) {
        lastPostDateByUser.set(post.user_id, post.post_date);
      }
    }

    const toReset: string[] = [];

    for (const profile of candidates) {
      const { yesterdayStr } = getLocalHourAndYesterday(
        profile.timezone || "America/Chicago",
      );
      const lastPostDate = lastPostDateByUser.get(profile.id);

      // Didn't post yesterday (their local yesterday) — streak's broken
      if (lastPostDate !== yesterdayStr) {
        toReset.push(profile.id);
      }
    }

    if (toReset.length > 0) {
      const { error: resetError } = await supabaseAdmin
        .from("profiles")
        .update({ streak: 0 })
        .in("id", toReset);

      if (resetError) throw resetError;
    }

    return new Response(
      JSON.stringify({ checked: candidates.length, reset: toReset.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error in reset-streaks:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
