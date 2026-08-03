import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";

export type ReportTargetType = "post" | "comment" | "user";

export function useReports() {
  const { user } = useAuth();

  const submitReport = async (
    targetType: ReportTargetType,
    targetId: string,
    reason: string,
    details?: string,
  ) => {
    if (!user?.id) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details,
    });
    return { error };
  };

  return { submitReport };
}
