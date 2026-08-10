import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/context/FollowsContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
interface IncomingRequest {
  follower_id: string;
  profiles: {
    name: string;
    username: string;
    profile_image_url?: string;
  };
}

export default function RequestsScreen() {
  const { user } = useAuth();
  const { loadIncomingRequests, acceptFollowRequest, declineFollowRequest } =
    useFollows();
  const router = useRouter();
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Track per-row loading so accepting/declining one request doesn't
  // spin the whole list, and so a user can't double-tap the same row
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    load();
  }, [user?.id]);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await loadIncomingRequests();
      setRequests(data as any);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requesterId: string) => {
    setProcessingIds((prev) => [...prev, requesterId]);
    try {
      await acceptFollowRequest(requesterId);
      setRequests((prev) => prev.filter((r) => r.follower_id !== requesterId));
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== requesterId));
    }
  };

  const handleDecline = async (requesterId: string) => {
    console.log("handleDecline called with:", requesterId);
    setProcessingIds((prev) => [...prev, requesterId]);
    try {
      console.log("About to call declineFollowRequest");
      await declineFollowRequest(requesterId);
      console.log("Returned from declineFollowRequest");
      setRequests((prev) => prev.filter((r) => r.follower_id !== requesterId));
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== requesterId));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.text} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      ) : (
        requests.map((req) => (
          <View key={req.follower_id} style={styles.row}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => router.push(`/(profile)/${req.follower_id}`)}
            >
              {req.profiles?.profile_image_url ? (
                <Image
                  source={{ uri: req.profiles.profile_image_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {req.profiles?.name?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.name}>{req.profiles?.name}</Text>
                <Text style={styles.username}>@{req.profiles?.username}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDecline(req.follower_id)}
                disabled={processingIds.includes(req.follower_id)}
              >
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccept(req.follower_id)}
                disabled={processingIds.includes(req.follower_id)}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </SafeAreaView>
  );
}
// ---- Dynamic Styles ----
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
    backText: {
      fontSize: 22,
      color: colors.text,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    emptyContainer: {
      alignItems: "center",
      marginTop: 60,
      gap: 8,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarPlaceholder: {
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontWeight: "600",
      fontSize: 16,
      color: colors.textMuted,
    },
    name: {
      fontWeight: "600",
      fontSize: 14,
      color: colors.text,
    },
    username: {
      color: colors.textMuted,
      fontSize: 12,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
    },
    declineButton: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    declineText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    acceptButton: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.primary || colors.text, // Adapts to active primary accent
    },
    acceptText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.background, // Dynamic contrast text
    },
  });
