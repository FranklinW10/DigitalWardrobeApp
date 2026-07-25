// src/context/NotificationsContext.tsx
import { supabase } from "@/lib/supabase/client";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

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

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

export const NotificationsProvider = ({
  userId,
  children,
}: {
  userId?: string;
  children: ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

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

    const fetchNotification = async (id: string) => {
      return supabase
        .from("notifications")
        .select(
          "*, actor:profiles!actor_id(username, profile_image_url, id), posts(image_url)",
        )
        .eq("id", id)
        .single();
    };

    fetchNotifications();

    const sub = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await fetchNotification(payload.new.id);

          if (!data) return;

          setNotifications((prev) => [data as Notification, ...prev]);
          setUnreadCount((c) => c + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId);
    setUnreadCount(0);
  };

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  return ctx;
};
