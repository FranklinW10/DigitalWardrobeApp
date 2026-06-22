import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useState } from "react";
export const useFollows = () => {
  const { user } = useAuth();
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);

  const addFollow = async (targetUserId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });
      if (error) throw error;
      setFollowing((prev) => [...prev, targetUserId]);
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      if (error) throw error;
      setFollowing((prev) => prev.filter((id) => id !== targetUserId));
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };
  const isFollowing = (targetUserId: string) => {
    return following.includes(targetUserId);
  };

  const loadFollowing = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (error) throw error;
      setFollowing(
        (data ?? []).map((f: { following_id: string }) => f.following_id),
      );
    } catch (error) {
      console.error("Error loading following:", error);
    }
  };

  const loadFollowers = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);
      if (error) throw error;
      setFollowing(
        (data ?? []).map((f: { follower_id: string }) => f.follower_id),
      );
    } catch (error) {
      console.error("Error loading following:", error);
    }
  };

  return {
    following,
    followers,
    addFollow,
    unfollowUser,
    isFollowing,
    loadFollowing,
    loadFollowers,
  };
};
