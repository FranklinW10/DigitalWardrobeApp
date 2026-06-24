import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { formatTimeAgo } from "@/lib/date-helper";
import { Image } from "expo-image";
import { useEffect } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { notifications, markAllRead } = useNotifications(user?.id);

  useEffect(() => {
    markAllRead();
  }, []);

  const getNotificationText = (type: string, username: string) => {
    switch (type) {
      case "like":
        return `${username} liked your post`;
      case "comment":
        return `${username} commented on your post`;
      case "follow":
        return `${username} started following you`;
      default:
        return "";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.is_read && styles.unread]}>
            {/* Avatar */}
            {item.actor?.profile_image_url ? (
              <Image
                source={{ uri: item.actor.profile_image_url }}
                style={styles.avatar}
                cachePolicy="none"
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
              <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
            </View>

            {/* Post thumbnail if applicable */}
            {item.posts?.image_url && (
              <Image
                source={{ uri: item.posts.image_url }}
                style={styles.thumbnail}
                contentFit="cover"
                cachePolicy="none"
              />
            )}

            {/* Unread dot */}
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  unread: {
    backgroundColor: "#f9f9f9",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "600",
    fontSize: 16,
  },
  textContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  bold: {
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
    color: "#999",
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
    backgroundColor: "#000",
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 60,
  },
});
