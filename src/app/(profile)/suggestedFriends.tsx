import { useFollows } from "@/context/FollowsContext";
import { useTheme } from "@/context/ThemeContext";
import { useContactFriends } from "@/hooks/useContactFriends";
import { useSuggestedFriends } from "@/hooks/useSuggestedFriends";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SuggestedFriendsScreen() {
  const router = useRouter();
  const {
    matches,
    isLoading: isLoadingContacts,
    findFriendsFromContacts,
  } = useContactFriends();
  const {
    suggestions,
    isLoading: isLoadingSuggestions,
    loadSuggestedFriends,
  } = useSuggestedFriends();
  const { addFollow, unfollowUser, isFollowing, isPending, loadFollowing } =
    useFollows();

  useEffect(() => {
    loadFollowing();
    findFriendsFromContacts();
    loadSuggestedFriends();
  }, []);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderRow = (
    u: {
      id: string;
      name: string;
      username: string;
      profile_image_url?: string;
    },
    subtitle?: string,
  ) => (
    <View key={u.id} style={styles.row}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/(profile)/${u.id}`)}
      >
        {u.profile_image_url ? (
          <Image source={{ uri: u.profile_image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {u.name?.[0]?.toUpperCase() || "U"}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.name}>{u.name}</Text>
          <Text style={styles.username}>
            @{u.username}
            {subtitle ? `  ·  ${subtitle}` : ""}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.followButton,
          isFollowing(u.id) && styles.followingButton,
          isPending(u.id) && styles.pendingButton,
        ]}
        onPress={() =>
          isFollowing(u.id) || isPending(u.id)
            ? unfollowUser(u.id)
            : addFollow(u.id)
        }
      >
        <Text
          style={[
            styles.followButtonText,
            (isFollowing(u.id) || isPending(u.id)) &&
              styles.followingButtonText,
          ]}
        >
          {isFollowing(u.id)
            ? "Following"
            : isPending(u.id)
              ? "Requested"
              : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const isLoading = isLoadingContacts || isLoadingSuggestions;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView>
          {matches.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>From Your Contacts</Text>
              {matches.map((m) => renderRow(m))}
            </>
          )}

          {suggestions.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Suggested For You</Text>
              {suggestions.map((s) =>
                renderRow(
                  s,
                  `${s.mutual_count} mutual${s.mutual_count === 1 ? "" : "s"}`,
                ),
              )}
            </>
          )}

          {matches.length === 0 && suggestions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>No suggestions right now</Text>
            </View>
          )}
        </ScrollView>
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
    sectionHeader: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textMuted,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      textTransform: "uppercase",
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
      paddingVertical: 10,
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
    followButton: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.background, // default state outline
    },
    followingButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pendingButton: {
      backgroundColor: colors.border,
      borderColor: colors.border,
    },
    followButtonText: {
      fontWeight: "600",
      fontSize: 13,
      color: colors.primary, // default state outline text
    },
    followingButtonText: {
      color: colors.background,
    },
  });
