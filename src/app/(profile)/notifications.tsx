import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/context/FollowsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useTheme } from "@/context/ThemeContext";
import { formatTimeAgo } from "@/lib/date-helper";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, markAllRead } = useNotifications();
  const { loadIncomingRequests } = useFollows();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    markAllRead();
  }, []);

  // Loaded independently of markAllRead — requests aren't "read/unread"
  // notifications, they're a live pending count, so it needs its own fetch.
  useEffect(() => {
    const load = async () => {
      const data = await loadIncomingRequests();
      setPendingRequests(data);
    };
    load();
  }, [user?.id]);

  const getNotificationText = (type: string, username: string) => {
    switch (type) {
      case "like":
        return `${username} liked your post`;
      case "comment":
        return `${username} commented on your post`;
      case "follow":
        return `${username} started following you`;
      case "follow_request":
        return `${username} requested to follow you`;
      case "follow_accepted":
        return `${username} accepted your follow request`;
      default:
        return "";
    }
  };

  const requestsPreview = pendingRequests.length > 0 && (
    <TouchableOpacity
      style={styles.requestsBanner}
      onPress={() => router.push("/(profile)/requests")}
    >
      <View style={styles.requestsAvatarStack}>
        {pendingRequests.slice(0, 3).map((req, i) => (
          <View
            key={req.follower_id}
            style={[
              styles.stackedAvatarWrap,
              { marginLeft: i === 0 ? 0 : -14 },
            ]}
          >
            {req.profiles?.profile_image_url ? (
              <Image
                source={{ uri: req.profiles.profile_image_url }}
                style={styles.stackedAvatar}
              />
            ) : (
              <View style={[styles.stackedAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {req.profiles?.username?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.textContent}>
        <Text style={styles.bold}>Follow Requests</Text>
        <Text style={styles.time}>
          {pendingRequests.length} pending request
          {pendingRequests.length === 1 ? "" : "s"}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={requestsPreview || null}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(profile)/${item.actor?.id}`)}
          >
            <View style={[styles.row, !item.is_read && styles.unread]}>
              {/* Avatar */}
              {item.actor?.profile_image_url ? (
                <Image
                  source={{ uri: item.actor.profile_image_url }}
                  style={styles.avatar}
                  cachePolicy="memory"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {item.actor?.username?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}

              {/* Text */}
              <View style={styles.textContent}>
                <Text style={styles.notificationText}>
                  <Text style={styles.bold}>@{item.actor?.username}</Text>{" "}
                  {getNotificationText(item.type, "")}
                </Text>
                <Text style={styles.time}>
                  {formatTimeAgo(item.created_at)}
                </Text>
              </View>

              {/* Post thumbnail if applicable */}
              {item.posts?.image_url && (
                <Image
                  source={{ uri: item.posts.image_url }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}

              {/* Unread dot */}
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet.</Text>
        }
      />
    </SafeAreaView>
  );
}
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    requestsBanner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    requestsAvatarStack: {
      flexDirection: "row",
    },
    stackedAvatarWrap: {
      borderWidth: 2,
      borderColor: colors.surface,
      borderRadius: 22,
    },
    stackedAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    unread: {
      backgroundColor: colors.surface,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarPlaceholder: {
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontWeight: "600",
      fontSize: 16,
      color: colors.text,
    },
    textContent: {
      flex: 1,
    },
    notificationText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    bold: {
      fontWeight: "700",
    },
    time: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    thumbnail: {
      width: 44,
      height: 44,
      borderRadius: 4,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    empty: {
      textAlign: "center",
      color: colors.textMuted,
      marginTop: 60,
    },
    closeButton: {},
    closeButtonText: {
      fontSize: 22,
      color: colors.text,
      fontWeight: "400",
    },
  });
