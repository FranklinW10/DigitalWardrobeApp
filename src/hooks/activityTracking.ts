// hooks/useActivityTracking.ts
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export const useActivityTracking = () => {
  const { user } = useAuth();
  const lastPing = useRef<number>(0);

  const ping = async () => {
    if (!user) return;

    // Throttle — no need to hit the DB more than once every few minutes
    // even if the user backgrounds/foregrounds repeatedly.
    const now = Date.now();
    if (now - lastPing.current < 5 * 60 * 1000) return;
    lastPing.current = now;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { error } = await supabase
      .from("profiles")
      .update({
        last_active_at: new Date().toISOString(),
        timezone,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating activity/timezone:", error);
    }
  };

  useEffect(() => {
    if (!user) return;

    ping(); // on mount / login

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") ping();
      },
    );

    return () => subscription.remove();
  }, [user]);
};
