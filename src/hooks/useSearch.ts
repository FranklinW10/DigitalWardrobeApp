import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export interface SearchUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  streak?: number;
}

export const useSearch = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allBlockedIds, setAllBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!user) return;

      const { data: blockedData } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      const { data: blockedByData } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", user.id);

      const blockedUserIds = blockedData?.map((b) => b.blocked_id) ?? [];
      const blockedByUserIds = blockedByData?.map((b) => b.blocker_id) ?? [];
      setAllBlockedIds([...new Set([...blockedUserIds, ...blockedByUserIds])]);
    };

    loadBlockedUsers();
  }, [user]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, username, profile_image_url, streak")
        .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
        .not("id", "in", `(${allBlockedIds.join(",")})`)
        .limit(20);
      if (error) throw error;
      const filtered = data?.filter((u) => !allBlockedIds.includes(u.id)) ?? [];

      setResults((filtered ?? []) as SearchUser[]);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, searchUsers };
};
