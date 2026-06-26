import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export interface Liker {
  user_id: string;
  profiles: {
    username: string;
    name: string;
    profile_image_url?: string;
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
    const { data } = await supabase
      .from("likes")
      .select("user_id, profiles(username, name, profile_image_url)")
      .eq("post_id", postId);
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
    if (!user) return;

    try {
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
          await supabase.from("notifications").insert({
            recipient_id: post.user_id, // you'll need to pass this in
            actor_id: currentUserId,
            type: "like",
            post_id: postId,
          });
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
