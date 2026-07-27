import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useState } from "react";
export const useFollows = () => {
  const { user } = useAuth();
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);

  const addFollow = async (targetUserId: string) => {
    if (!user) return;
    try {
      // Look up the target's privacy setting ourselves — don't trust the caller to pass it
      const { data: targetProfile, error: profileError } = await supabase
        .from("profiles")
        .select("isPrivate")
        .eq("id", targetUserId)
        .single();

      if (profileError) throw profileError;

      const status = targetProfile?.isPrivate ? false : true;

      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
        status,
      });
      if (error) throw error;

      if (status) {
        setFollowing((prev) => [...prev, targetUserId]);
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            recipient_id: targetUserId,
            actor_id: user.id,
            type: "follow",
            post_id: null,
          });
        if (notifError)
          console.error("Error creating follow notification:", notifError);
      } else {
        setPendingRequests((prev) => [...prev, targetUserId]);
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            recipient_id: targetUserId,
            actor_id: user.id,
            type: "follow_request",
            post_id: null,
          });
        if (notifError)
          console.error("Error creating follow notification:", notifError);
      }
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
      setPendingRequests((prev) => prev.filter((id) => id !== targetUserId));
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };
  const isFollowing = (targetUserId: string) =>
    following.includes(targetUserId);
  const isPending = (targetUserId: string) =>
    pendingRequests.includes(targetUserId);

  const loadFollowing = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id, status")
        .eq("follower_id", user.id);
      if (error) throw error;

      const accepted = (data ?? [])
        .filter((f) => f.status === true)
        .map((f) => f.following_id);

      const pending = (data ?? [])
        .filter((f) => f.status === false)
        .map((f) => f.following_id);

      setFollowing(accepted);
      setPendingRequests(pending);
    } catch (error) {
      console.error("Error loading following:", error);
    }
  };
  const declineFollowRequest = async (requesterId: string) => {
    console.log(user);
    if (!user) return;
    console.log("Declining follow request:");
    console.log("requesterId (follower_id):", requesterId);
    console.log("current user.id (following_id):", user.id);
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", requesterId)
        .eq("following_id", user.id)
        .eq("status", false);
      if (error) throw error;
    } catch (error) {
      console.error("Error declining follow request:", error);
    }
  };

  const acceptFollowRequest = async (requesterId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("follows")
        .update({ status: true })
        .eq("follower_id", requesterId)
        .eq("following_id", user.id);
      if (error) throw error;
      setFollowers((prev) => [...prev, requesterId]);
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          recipient_id: requesterId,
          actor_id: user.id,
          type: "follow_accepted",
          post_id: null,
        });
      if (notifError)
        console.error("Error creating follow notification:", notifError);
    } catch (error) {
      console.error("Error accepting follow request:", error);
    }
  };

  const loadFollowers = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, status")
        .eq("following_id", user.id)
        .eq("status", true);
      if (error) throw error;
      setFollowers((data ?? []).map((f) => f.follower_id));
    } catch (error) {
      console.error("Error loading followers:", error);
    }
  };
  const loadIncomingRequests = async () => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from("follows")
        .select(
          "follower_id, profiles!follows_follower_id_fkey(name, username, profile_image_url)",
        )
        .eq("following_id", user.id)
        .eq("status", false);
      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error("Error loading incoming requests:", error);
      return [];
    }
  };

  return {
    following,
    followers,
    addFollow,
    unfollowUser,
    isFollowing,
    isPending,
    loadFollowing,
    loadFollowers,
    pendingRequests,
    loadIncomingRequests,
    declineFollowRequest,
    acceptFollowRequest,
  };
};
