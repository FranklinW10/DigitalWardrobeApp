import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export function useBlocks() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadBlocks = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    if (!error && data) {
      setBlockedIds(new Set(data.map((b) => b.blocked_id)));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const blockUser = async (targetId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: user.id, blocked_id: targetId });
    if (!error) {
      setBlockedIds((prev) => new Set(prev).add(targetId));
    }
    return { error };
  };

  const unblockUser = async (targetId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", targetId);
    if (!error) {
      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
    return { error };
  };

  return { blockedIds, blockUser, unblockUser, loading, refresh: loadBlocks };
}
