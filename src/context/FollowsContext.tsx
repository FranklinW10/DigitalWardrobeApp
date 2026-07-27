// src/context/FollowsContext.tsx
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { createContext, ReactNode, useContext, useRef, useState } from "react";

interface FollowsContextValue {
  following: string[];
  followers: string[];
  pendingRequests: string[];
  addFollow: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => boolean;
  isPending: (targetUserId: string) => boolean;
  loadFollowing: () => Promise<void>;
  loadFollowers: () => Promise<void>;
  loadIncomingRequests: () => Promise<any[]>;
  declineFollowRequest: (requesterId: string) => Promise<void>;
  acceptFollowRequest: (requesterId: string) => Promise<void>;
}

const FollowsContext = createContext<FollowsContextValue | undefined>(
  undefined,
);

export const FollowsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const loadFollowingRequestId = useRef(0);

  const addFollow = async (targetUserId: string) => {
    if (!user) return;
    // Optimistic update — reflect immediately, everywhere
    setFollowing((prev) =>
      prev.includes(targetUserId) ? prev : [...prev, targetUserId],
    );

    try {
      const { data: targetProfile, error: profileError } = await supabase
        .from("profiles")
        .select("isPrivate")
        .eq("id", targetUserId)
        .single();
      if (profileError) throw profileError;

      const status = targetProfile?.isPrivate ? false : true;

      if (!status) {
        // Actually a private account — it's a pending request, not an accepted follow
        setFollowing((prev) => prev.filter((id) => id !== targetUserId));
        setPendingRequests((prev) => [...prev, targetUserId]);
      }

      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
        status,
      });
      if (error) throw error;

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          recipient_id: targetUserId,
          actor_id: user.id,
          type: status ? "follow" : "follow_request",
          post_id: null,
        });
      if (notifError)
        console.error("Error creating follow notification:", notifError);
    } catch (error) {
      // Roll back on failure
      setFollowing((prev) => prev.filter((id) => id !== targetUserId));
      setPendingRequests((prev) => prev.filter((id) => id !== targetUserId));
      console.error("Error following user:", error);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return;
    const wasFollowing = following.includes(targetUserId);
    const wasPending = pendingRequests.includes(targetUserId);

    // Optimistic update
    setFollowing((prev) => prev.filter((id) => id !== targetUserId));
    setPendingRequests((prev) => prev.filter((id) => id !== targetUserId));

    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      if (error) throw error;
    } catch (error) {
      // Roll back on failure
      if (wasFollowing) setFollowing((prev) => [...prev, targetUserId]);
      if (wasPending) setPendingRequests((prev) => [...prev, targetUserId]);
      console.error("Error unfollowing user:", error);
    }
  };

  const isFollowing = (targetUserId: string) =>
    following.includes(targetUserId);
  const isPending = (targetUserId: string) =>
    pendingRequests.includes(targetUserId);

  const loadFollowing = async () => {
    if (!user) return;
    const requestId = ++loadFollowingRequestId.current;
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id, status")
        .eq("follower_id", user.id);
      if (error) throw error;
      if (requestId !== loadFollowingRequestId.current) return; // stale response

      setFollowing(
        (data ?? [])
          .filter((f) => f.status === true)
          .map((f) => f.following_id),
      );
      setPendingRequests(
        (data ?? [])
          .filter((f) => f.status === false)
          .map((f) => f.following_id),
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

  const declineFollowRequest = async (requesterId: string) => {
    if (!user) return;
    console.log("Declining follow request:");
    console.log("requesterId (follower_id):", requesterId);
    console.log("current user.id (following_id):", user.id);
    try {
      const { data, error, count } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", requesterId)
        .eq("following_id", user.id)
        .eq("status", false);
      if (error) throw error;
      console.log({ data, error, count });
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

  return (
    <FollowsContext.Provider
      value={{
        following,
        followers,
        pendingRequests,
        addFollow,
        unfollowUser,
        isFollowing,
        isPending,
        loadFollowing,
        loadFollowers,
        loadIncomingRequests,
        declineFollowRequest,
        acceptFollowRequest,
      }}
    >
      {children}
    </FollowsContext.Provider>
  );
};

export const useFollows = () => {
  const ctx = useContext(FollowsContext);
  if (!ctx) throw new Error("useFollows must be used within a FollowsProvider");
  return ctx;
};
