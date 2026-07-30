import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useState } from "react";

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
        .neq("id", user?.id) // exclude yourself
        .limit(20);
      if (error) throw error;
      setResults((data ?? []) as SearchUser[]);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, searchUsers };
};
