import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export const useStreak = (currentUserId?: string) => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStreak = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("streak, max_streak")
      .eq("id", currentUserId)
      .single();

    if (error) {
      console.error("Error fetching streak:", error);
      setIsLoading(false);
      return;
    }

    setStreak(profile.streak ?? 0);
    setMaxStreak(profile.max_streak ?? 0);
    setIsLoading(false);
  }, [user, currentUserId]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const getStreakGradient = (streak: number): [string, string] => {
    if (streak >= 60) return ["#4FE3FF", "#0066FF"]; // electric blue — legendary
    if (streak >= 30) return ["#D9B3FF", "#7B2FF7"]; // purple — epic
    if (streak >= 14) return ["#FF8A8A", "#FF3B30"]; // red — hot
    if (streak >= 7) return ["#FFB35C", "#FF6B35"]; // red-orange — warm
    return ["#FFD866", "#FF9500"]; // orange — just starting
  };

  return {
    streak,
    maxStreak,
    isLoading,
    getStreakGradient,
    refreshStreak: fetchStreak,
  };
};
