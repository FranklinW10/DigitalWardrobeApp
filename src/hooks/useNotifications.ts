import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow";
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    username: string;
    profile_image_url: string | null;
  };
  posts: {
    image_url: string | null;
  } | null;
}

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    // Real-time updates
    const sub = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((c) => c + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select(
        "*, actor:profiles!actor_id(username, profile_image_url, id), posts(image_url)",
      )
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data ?? []);
    setUnreadCount(data?.filter((n) => !n.is_read).length ?? 0);
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId);
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAllRead };
};
