import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    profile_image_url: string | null;
    streak: number;
  };
  like_count: number;
  is_liked: boolean;
  replies: Comment[];
}

export const useComments = (postId: string) => {
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const { user } = useAuth();
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [reportedCommentIds, setReportedCommentIds] = useState<string[]>([]);

  // Load blocked users on mount
  useEffect(() => {
    const loadBlockedAndReports = async () => {
      if (!user) return;

      const { data: blockedData } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      const { data: blockedByData } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", user.id);

      const { data: reportedData } = await supabase
        .from("reports")
        .select("target_id")
        .eq("reporter_id", user.id)
        .eq("target_type", "comment");

      const blockedIds = blockedData?.map((b) => b.blocked_id) ?? [];
      const blockedByIds = blockedByData?.map((b) => b.blocker_id) ?? [];

      setBlockedUserIds([...new Set([...blockedIds, ...blockedByIds])]);
      setReportedCommentIds(reportedData?.map((r) => r.target_id) ?? []);
    };

    loadBlockedAndReports();
  }, [user]);

  const [blockedAndReportsLoaded, setBlockedAndReportsLoaded] = useState(false);

  useEffect(() => {
    const loadBlockedAndReports = async () => {
      if (!user) return;

      const { data: blockedData } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      const { data: blockedByData } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", user.id);

      const { data: reportedData } = await supabase
        .from("reports")
        .select("target_id")
        .eq("reporter_id", user.id)
        .eq("target_type", "comment");

      const blockedIds = blockedData?.map((b) => b.blocked_id) ?? [];
      const blockedByIds = blockedByData?.map((b) => b.blocker_id) ?? [];

      setBlockedUserIds([...new Set([...blockedIds, ...blockedByIds])]);
      setReportedCommentIds(reportedData?.map((r) => r.target_id) ?? []);
      setBlockedAndReportsLoaded(true); // 👈 fires regardless of whether either list is empty
    };

    loadBlockedAndReports();
  }, [user]);

  useEffect(() => {
    if (!postId || !blockedAndReportsLoaded) return;
    fetchComments();
  }, [postId, blockedAndReportsLoaded, blockedUserIds, reportedCommentIds]);
  const fetchComments = async () => {
    let query = supabase
      .from("comments")
      .select("*, profiles(username, profile_image_url, streak)")
      .eq("post_id", postId);

    // Only add the .not() filter if there are blocked users
    if (blockedUserIds.length > 0) {
      query = query.not("user_id", "in", `(${blockedUserIds.join(",")})`);
    }

    const { data, error } = await query.order("created_at", {
      ascending: true,
    });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    const flatComments = (data ?? []).filter(
      (c) =>
        !blockedUserIds.includes(c.user_id) &&
        !reportedCommentIds.includes(c.id),
    );
    const commentIds = flatComments.map((c) => c.id);

    // Pull all likes for this post's comments in one query, then tally
    // counts + whether the current user liked each one client-side —
    // avoids a separate round trip per comment.
    const likesByComment = new Map<
      string,
      { count: number; likedByMe: boolean }
    >();

    if (commentIds.length > 0) {
      const { data: likesData, error: likesError } = await supabase
        .from("comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);

      if (likesError) {
        console.error("Error fetching comment likes:", likesError);
      } else {
        for (const like of likesData ?? []) {
          const entry = likesByComment.get(like.comment_id) ?? {
            count: 0,
            likedByMe: false,
          };
          entry.count += 1;
          if (like.user_id === user?.id) entry.likedByMe = true;
          likesByComment.set(like.comment_id, entry);
        }
      }
    }

    const withLikes: Comment[] = flatComments.map((c) => ({
      ...c,
      like_count: likesByComment.get(c.id)?.count ?? 0,
      is_liked: likesByComment.get(c.id)?.likedByMe ?? false,
      replies: [],
    }));

    // Build a tree: top-level comments hold their replies nested inside.
    // Orphaned replies (parent missing/deleted) fall back to top-level
    // rather than silently disappearing.
    const byId = new Map(withLikes.map((c) => [c.id, c]));
    const topLevel: Comment[] = [];

    for (const c of withLikes) {
      if (c.parent_comment_id) {
        const parent = byId.get(c.parent_comment_id);
        if (parent) {
          parent.replies.push(c);
        } else {
          topLevel.push(c);
        }
      } else {
        topLevel.push(c);
      }
    }

    setComments(topLevel);
    setCommentCount(flatComments.length); // includes replies in the total
  };

  const addComment = async (
    content: string,
    postOwnerId: string,
    parentCommentId?: string,
    parentCommentUserId?: string,
  ) => {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user?.id,
        content,
        parent_comment_id: parentCommentId ?? null,
      })
      .select("*, profiles(username, profile_image_url, streak)")
      .single();

    if (error || !data) {
      console.error("Error adding comment:", error);
      throw error ?? new Error("Failed to add comment");
    }

    // Refetch rather than hand-splice — simplest way to keep the tree
    // structure and like counts correct after an insert.
    await fetchComments();

    // Notify the post owner (top-level comment case)
    if (!parentCommentId && user?.id !== postOwnerId) {
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

    // Notify whoever they replied to, if it's not themselves
    if (
      parentCommentId &&
      parentCommentUserId &&
      user?.id !== parentCommentUserId
    ) {
      const { error: replyNotifError } = await supabase
        .from("notifications")
        .insert({
          recipient_id: parentCommentUserId,
          actor_id: user?.id,
          type: "comment_reply",
          post_id: postId,
          comment_id: data.id,
        });
      if (replyNotifError) {
        console.error("Error creating reply notification:", replyNotifError);
      }
    }
  };

  const toggleCommentLike = async (
    commentId: string,
    commentOwnerId: string,
  ) => {
    if (!user) return;

    const { data: existing, error: existingError } = await supabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking comment like:", existingError);
      return;
    }

    if (existing) {
      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("id", existing.id);
      if (error) console.error("Error unliking comment:", error);
    } else {
      const { error } = await supabase
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: user.id });
      if (error) console.error("Error liking comment:", error);

      // Only notify on the like itself, not the unlike, and never notify
      // yourself for liking your own comment
      if (!error && commentOwnerId !== user.id) {
        const { error: likeNotifError } = await supabase
          .from("notifications")
          .insert({
            recipient_id: commentOwnerId,
            actor_id: user.id,
            type: "comment_like",
            post_id: postId,
            comment_id: commentId,
          });
        if (likeNotifError) {
          console.error(
            "Error creating comment like notification:",
            likeNotifError,
          );
        }
      }
    }

    await fetchComments();
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
    // Refetch rather than manually filter — a delete can remove a
    // top-level comment (and cascade its replies) or a single reply,
    // and refetching is the simplest way to keep the tree consistent
    // either way.
    await fetchComments();
  };

  const fetchCommentLikers = async (commentId: string) => {
    const { data, error } = await supabase
      .from("comment_likes")
      .select("user_id, profiles(username, name, profile_image_url)")
      .eq("comment_id", commentId);

    if (error) {
      console.error("Error fetching comment likers:", error);
      return [];
    }
    return data ?? [];
  };

  return {
    comments,
    addComment,
    deleteComment,
    toggleCommentLike,
    fetchCommentLikers,
    commentCount,
  };
};
