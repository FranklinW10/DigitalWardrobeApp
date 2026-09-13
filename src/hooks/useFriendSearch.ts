import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase/client";


export interface User {
  id: string;
  username: string;
  name?: string;
  profile_image_url?: string;
  isFollowing?: boolean; // Track if current user follows this person
}

export const useFriendSearch = (currentUserId?: string) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        // Get all matching profiles
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, name, profile_image_url")
          .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
          .limit(20);

        if (profileError) throw profileError;

        // If we have a current user, fetch who they follow to prioritize
        if (currentUserId && profileData) {
          const { data: followData } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", currentUserId)
            .in(
              "following_id",
              profileData.map((p) => p.id),
            );

          const followingIds = new Set(
            followData?.map((f) => f.following_id) ?? [],
          );

          // Sort: friends first, then others
          const sortedUsers = profileData.sort((a, b) => {
            const aIsFollowing = followingIds.has(a.id) ? 0 : 1;
            const bIsFollowing = followingIds.has(b.id) ? 0 : 1;
            return aIsFollowing - bIsFollowing;
          });

          // Add isFollowing flag
          const usersWithFollowStatus: User[] = sortedUsers.map((u) => ({
            ...u,
            isFollowing: followingIds.has(u.id),
          }));

          setUsers(usersWithFollowStatus);
        } else {
          setUsers(profileData || []);
        }
      } catch (err) {
        console.error("Error searching users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [currentUserId],
  );

  return { users, loading, searchUsers };
};