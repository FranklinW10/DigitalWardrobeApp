import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/context/FollowsContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function followList() {
  const { user, updateUser, signOut } = useAuth();
  const { profile_id, initialTab } = useLocalSearchParams<{
    profile_id?: string;
    initialTab?: "followers" | "following";
  }>();
  // Falls back to the logged-in user's own list when no profile_id is passed —
  // keeps this screen working for both "my followers" and "someone else's followers"
  const targetUserId = profile_id ?? user?.id;
  const isOwnList = targetUserId === user?.id;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [search, setSearch] = useState("");
  const [headerUsername, setHeaderUsername] = useState<string | null>(null);
  const {
    addFollow,
    unfollowUser,
    isFollowing,
    isPending,
    loadFollowing: loadFollowingState,
  } = useFollows();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    initialTab === "following" ? "following" : "followers",
  );
  const [users, setUsers] = useState<any[]>([]);

  // Keeps the tab in sync if this screen instance gets reused for a new
  // navigation (e.g. tapping "Following" while "Followers" is already open)
  // rather than fully remounting — the useState initializer above only runs once.
  useEffect(() => {
    if (initialTab === "followers" || initialTab === "following") {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!targetUserId) return;
    if (activeTab === "followers") {
      loadFollowers();
    } else {
      loadFollowing();
    }
  }, [activeTab, targetUserId]);

  useEffect(() => {
    loadFollowingState();
  }, [user?.id]);

  // Only need to fetch the header username separately when viewing someone
  // else's list — for your own list, `user.username` already covers it.
  useEffect(() => {
    if (isOwnList || !targetUserId) {
      setHeaderUsername(null);
      return;
    }
    const loadHeaderUser = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", targetUserId)
        .single();
      setHeaderUsername(data?.username ?? null);
    };
    loadHeaderUser();
  }, [isOwnList, targetUserId]);

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const loadFollowers = async () => {
    if (!targetUserId) return;

    const { data, error } = await supabase
      .from("follows")
      .select(
        `
        follower:profiles!follows_follower_id_fkey (
            id,
            username,
            profile_image_url,
            name
        )
        `,
      )
      .eq("following_id", targetUserId)
      .eq("status", true);

    if (!error) {
      setUsers(data?.map((row: any) => row.follower) ?? []);
    }
  };

  const loadFollowing = async () => {
    if (!targetUserId) return;

    const { data, error } = await supabase
      .from("follows")
      .select(
        `
        following:profiles!follows_following_id_fkey (
            id,
            username,
            profile_image_url,
            name
        )
        `,
      )
      .eq("follower_id", targetUserId)
      .eq("status", true);

    if (!error) {
      setUsers(data?.map((row: any) => row.following) ?? []);
    }
  };

  const tabSwitcher = (
    <View style={styles.tabSwitcher}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "followers" && styles.activeTab]}
        onPress={() => setActiveTab("followers")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "followers" && styles.activeTabText,
          ]}
        >
          Followers
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "following" && styles.activeTab]}
        onPress={() => setActiveTab("following")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "following" && styles.activeTabText,
          ]}
        >
          Following
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              router.back();
            }}
          >
            <Text style={styles.closeButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topHeaderUsername}>
            @{isOwnList ? user?.username : (headerUsername ?? "...")}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(profile)/settings")}>
            <Ionicons name="menu" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        <View>{tabSwitcher}</View>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={18}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
      </View>
      <ScrollView>
        <View style={{ padding: 16 }}>
          {filteredUsers.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={styles.userRow}
              onPress={() => router.push(`/(profile)/${u.id}`)}
            >
              {u.profile_image_url ? (
                <Image
                  source={{ uri: u.profile_image_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {u.name?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.name}>{u.name}</Text>
                <Text style={styles.username}>@{u.username}</Text>
              </View>
              {u.id !== user?.id && (
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
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    pendingButton: {
      backgroundColor: colors.border,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    topHeader: {
      flexDirection: "column",

      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    topHeaderUsername: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    closeButton: {},
    closeButtonText: {
      fontSize: 22,
      color: colors.text,
      fontWeight: "400",
    },

    tabSwitcher: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 12,
      borderBottomColor: colors.border,

      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 8,
    },
    activeTab: {
      marginBottom: -1,
    },
    tabText: {
      fontSize: 20,
      fontWeight: "500",
      color: colors.textMuted,
    },
    activeTabText: {
      color: colors.text,
      fontWeight: "600",
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
    },
    avatarPlaceholder: {
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontWeight: "600",
      fontSize: 18,
      color: colors.textMuted,
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
    followButton: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    followingButton: {
      backgroundColor: colors.primary,
    },
    followButtonText: {
      fontWeight: "600",
      fontSize: 13,
      color: colors.primary,
    },
    followingButtonText: {
      color: colors.background,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textMuted,
      marginTop: 40,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
  });
