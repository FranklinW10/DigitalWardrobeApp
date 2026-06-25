import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
  const [search, setSearch] = useState("");
  const {
    addFollow,
    unfollowUser,
    isFollowing,
    loadFollowing: loadFollowingState,
  } = useFollows();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    "followers",
  );
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    if (activeTab === "followers") {
      loadFollowers();
    } else {
      loadFollowing();
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    loadFollowingState();
  }, [user?.id]);

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const loadFollowers = async () => {
    if (!user?.id) return;

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
      .eq("following_id", user.id);

    if (!error) {
      setUsers(data?.map((row: any) => row.follower) ?? []);
    }
  };

  const loadFollowing = async () => {
    if (!user?.id) return;

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
      .eq("follower_id", user.id);

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
          <Text style={styles.topHeaderUsername}>@{user?.username}</Text>
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
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing(u.id) && styles.followingButton,
                ]}
                onPress={() =>
                  isFollowing(u.id) ? unfollowUser(u.id) : addFollow(u.id)
                }
              >
                <Text
                  style={[
                    styles.followButtonText,
                    isFollowing(u.id) && styles.followingButtonText,
                  ]}
                >
                  {isFollowing(u.id) ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  topHeader: {
    flexDirection: "column",

    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
  },
  closeButton: {},
  closeButtonText: {
    fontSize: 22,
    color: "#000",
    fontWeight: "400",
  },

  tabSwitcher: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomColor: "#e0e0e0",

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
    color: "#888",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "600",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "600",
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontWeight: "600",
    fontSize: 15,
  },
  username: {
    color: "#888",
    fontSize: 13,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
  },
  followingButton: {
    backgroundColor: "#000",
  },
  followButtonText: {
    fontWeight: "600",
    fontSize: 13,
  },
  followingButtonText: {
    color: "#fff",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
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
    color: "#000",
  },
});
