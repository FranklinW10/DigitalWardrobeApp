import { StreakAvatar } from "@/components/StreakAvatar";
import { ReportModal } from "@/components/reportModal";
import { useBlocks } from "@/context/BlocksContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BlockedUsers() {
  const { blockedIds, unblockUser } = useBlocks();
  const { colors } = useTheme();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadBlockedUsers();
  }, [blockedIds]);

  const loadBlockedUsers = async () => {
    if (blockedIds.size === 0) {
      setBlockedUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, name, profile_image_url, streak")
        .in("id", Array.from(blockedIds));

      setBlockedUsers(data ?? []);
    } catch (error) {
      console.error("Error loading blocked users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuPress = (userId: string) => {
    Alert.alert("User Options", "", [
      {
        text: "Report User",
        onPress: () => setReportTarget(userId),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Users</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {blockedUsers.length === 0 ? (
          <Text style={styles.emptyText}>No blocked users</Text>
        ) : (
          blockedUsers.map((user) => (
            <View key={user.id} style={styles.userRow}>
              <StreakAvatar
                uri={user.profile_image_url}
                initial={user.username?.[0]?.toUpperCase() || "U"}
                streak={user.streak ?? 0}
                size={46}
                colors={colors}
                RING_WIDTH={2.5}
                RING_GAP={2}
              />
              <View style={styles.userInfo}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.username}>@{user.username}</Text>
              </View>

              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => unblockUser(user.id)}
              >
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => handleMenuPress(user.id)}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <ReportModal
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        targetType="user"
        targetId={reportTarget ?? ""}
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
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    back: {
      fontSize: 22,
      color: colors.text,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    content: {
      padding: 16,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textMuted,
      marginTop: 40,
      fontSize: 16,
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 8,
    },
    userInfo: {
      flex: 1,
      marginLeft: 12,
    },
    name: {
      fontWeight: "600",
      fontSize: 15,
      color: colors.text,
    },
    username: {
      color: colors.textMuted,
      fontSize: 13,
    },
    menuButton: {
      padding: 8,
    },
    unblockButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.destructive || "#ff3b30",
    },
    unblockText: {
      color: colors.destructive || "#ff3b30",
      fontWeight: "600",
      fontSize: 12,
    },
  });
