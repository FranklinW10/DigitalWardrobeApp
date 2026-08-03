import { useAuth } from "@/context/AuthContext";
import { useBlocks } from "@/context/BlocksContext";
import { supabase } from "@/lib/supabase/client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface Liker {
  user_id: string;
  profiles: {
    username: string;
    name: string;
    profile_image_url?: string;
    streak?: number;
  };
}

export const useLikes = (postId: string, currentUserId?: string) => {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [isLoadingLikers, setIsLoadingLikers] = useState(false);
  const { blockedIds, blockedByIds, loading: blocksLoading } = useBlocks();

  // Combine both blocked sets
  const allBlockedIds = useMemo(
    () => new Set([...blockedIds, ...blockedByIds]),
    [blockedIds, blockedByIds],
  );

  useEffect(() => {
    if (!postId || blocksLoading) return;
    fetchLikes();
  }, [postId, blocksLoading]);

  const fetchLikers = useCallback(async () => {
    if (!postId) return; // Don't query if postId is empty

    setIsLoadingLikers(true);
    const { data, error } = await supabase
      .from("likes")
      .select("user_id, profiles(username, name, profile_image_url, streak)")
      .eq("post_id", postId);

    if (error) {
      console.error("Error fetching likers:", error);
      setLikers([]);
      setIsLoadingLikers(false);
      return;
    }

    const filtered =
      data?.filter((liker) => !allBlockedIds.has(liker.user_id)) ?? [];
    setLikers((filtered as any) ?? []);
    setIsLoadingLikers(false);
  }, [postId, allBlockedIds]);

  const fetchLikes = async () => {
    const blockedArray = Array.from(allBlockedIds);
    let query = supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    // Filter out likes from blocked users
    if (blockedArray.length > 0) {
      query = query.not("user_id", "in", `(${blockedArray.join(",")})`);
    }
    const { count } = await query;
    setLikeCount(count ?? 0);

    if (currentUserId) {
      if (!postId) return;
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .single();
      setIsLiked(!!data);
    }
  };

  const toggleLike = async () => {
    if (!user) return;

    try {
      const { data: post } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (!post) return;

      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        setLikeCount((count) => count - 1);
        setIsLiked(false);
      } else {
        await supabase.from("likes").insert({
          user_id: user.id,
          post_id: postId,
        });
        setLikeCount((count) => count + 1);
        setIsLiked(true);

        if (post.user_id !== user.id) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("recipient_id", post.user_id)
            .eq("actor_id", user.id)
            .eq("post_id", postId)
            .eq("type", "like")
            .limit(1);

          if (existing?.length === 0) {
            await supabase.from("notifications").insert({
              recipient_id: post.user_id,
              actor_id: user.id,
              type: "like",
              post_id: postId,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return {
    likeCount,
    isLiked,
    toggleLike,
    likers,
    fetchLikers,
    isLoadingLikers,
  };
};
