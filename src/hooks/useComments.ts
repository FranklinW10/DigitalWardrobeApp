import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    profile_image_url: string | null;
  };
}

export const useComments = (postId: string) => {
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!postId) return;
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data, count, error } = await supabase
      .from("comments")
      .select("*, profiles(username, profile_image_url)", { count: "exact" })
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }
    setComments(data ?? []);
    setCommentCount(count ?? 0);
  };

  const addComment = async (content: string, postOwnerId: string) => {
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: user?.id, content })
      .select("*, profiles(username, profile_image_url)")
      .single();

    if (error || !data) {
      console.error("Error adding comment:", error);
      throw error ?? new Error("Failed to add comment");
    }

    setComments((prev) => [...prev, data]);
    setCommentCount((commentCount) => commentCount + 1);

    // Notify post owner
    if (user?.id !== postOwnerId) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          recipient_id: postOwnerId,
          actor_id: user?.id,
          type: "comment",
          post_id: postId,
          comment_id: data.id,
        });
      if (notifError) {
        console.error("Error creating comment notification:", notifError);
      }
    }
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (error) {
      console.error("Error deleting comment:", error);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentCount((commentCount) => commentCount - 1);
  };

  return { comments, addComment, deleteComment, commentCount: comments.length };
};
