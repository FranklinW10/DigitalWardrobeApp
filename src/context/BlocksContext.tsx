import { supabase } from "@/lib/supabase/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface BlocksContextValue {
  blockedIds: Set<string>; // users you blocked
  blockedByIds: Set<string>; // users who blocked you
  blockUser: (targetId: string) => Promise<{ error: any }>;
  unblockUser: (targetId: string) => Promise<{ error: any }>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BlocksContext = createContext<BlocksContextValue | undefined>(undefined);

export function BlocksProvider({
  userId,
  children,
}: {
  userId?: string;
  children: React.ReactNode;
}) {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [blockedByIds, setBlockedByIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadBlocks = useCallback(async () => {
    if (!userId) {
      setBlockedIds(new Set());
      setBlockedByIds(new Set());
      setLoading(false);
      return;
    }

    const { data: blockedData } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", userId);

    const { data: blockedByData } = await supabase
      .from("blocks")
      .select("blocker_id")
      .eq("blocked_id", userId);

    setBlockedIds(new Set(blockedData?.map((b) => b.blocked_id) ?? []));
    setBlockedByIds(new Set(blockedByData?.map((b) => b.blocker_id) ?? []));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const blockUser = async (targetId: string) => {
    if (!userId) return { error: new Error("Not authenticated") };
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: userId, blocked_id: targetId });
    if (!error) {
      setBlockedIds((prev) => new Set(prev).add(targetId));
    }
    return { error };
  };

  const unblockUser = async (targetId: string) => {
    if (!userId) return { error: new Error("Not authenticated") };
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", userId)
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

  return (
    <BlocksContext.Provider
      value={{
        blockedIds,
        blockedByIds,

        blockUser,
        unblockUser,
        loading,
        refresh: loadBlocks,
      }}
    >
      {children}
    </BlocksContext.Provider>
  );
}

export function useBlocks() {
  const ctx = useContext(BlocksContext);
  if (!ctx) throw new Error("useBlocks must be used within a BlocksProvider");
  return ctx;
}
