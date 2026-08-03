import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetchLikes();
  }, [postId]);

  const fetchLikers = async () => {
    setIsLoadingLikers(true);
    const { data, error } = await supabase
      .from("likes")
      .select("user_id, profiles(username, name, profile_image_url, streak)")
      .eq("post_id", postId);
    console.log("likers data:", data);
    console.log("likers error:", error);
    setLikers((data as any) ?? []);
    setIsLoadingLikers(false);
  };

  const fetchLikes = async () => {
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);
    setLikeCount(count ?? 0);

    if (currentUserId) {
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
    console.log("toggleLike called");
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

        setLikeCount((likeCount) => likeCount - 1);
        setIsLiked(false);
      } else {
        await supabase.from("likes").insert({
          user_id: user.id,
          post_id: postId,
        });
        setLikeCount((likeCount) => likeCount + 1);
        setIsLiked(true);
        const { data: post } = await supabase
          .from("posts")
          .select("user_id")
          .eq("id", postId)
          .single();
        if (post && post.user_id !== user.id) {
          console.log({
            recipient: post.user_id,
            actor: user.id,
            postId,
          });
          const { data: existing } = await supabase

            .from("notifications")
            .select("id")
            .eq("recipient_id", post.user_id)
            .eq("actor_id", user.id)
            .eq("post_id", postId)
            .eq("type", "like")
            .limit(1);
          console.log("existing notification:", existing);

          if (existing?.length === 0) {
            console.log("INSERTING notification");
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
