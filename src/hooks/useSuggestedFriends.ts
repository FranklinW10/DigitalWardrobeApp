import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useState } from "react";

export interface SuggestedFriend {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  mutual_count: number;
}

export const useSuggestedFriends = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedFriend[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSuggestedFriends = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("suggest_mutual_friends", {
        target_user_id: user.id,
      });
      if (error) throw error;
      setSuggestions(data ?? []);
    } catch (error) {
      console.error("Error loading suggested friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { suggestions, isLoading, loadSuggestedFriends };
};
