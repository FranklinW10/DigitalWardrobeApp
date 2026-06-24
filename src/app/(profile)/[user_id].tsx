import {
  ExplorePostCard,
  ModalHaulPostCard,
  ModalPostCard,
} from "@/components/PostCard";
import { useFollows } from "@/hooks/useFollows";
import { Post } from "@/hooks/usePosts";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ProfileUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface ProfileUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export default function UserProfileScreen() {
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { addFollow, unfollowUser, isFollowing } = useFollows();
  const [activeTab, setActiveTab] = useState<"fits" | "hauls">("fits");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const filteredPosts = posts.filter((post) =>
    activeTab === "fits" ? post.isoutfit_post : !post.isoutfit_post,
  );
  useEffect(() => {
    loadProfile();
  }, [user_id]);

  const renderExplorePost = ({ item }: { item: Post }) => (
    <ExplorePostCard
      post={item}
      currentUserId={profileUser?.id}
      onPress={() => setSelectedPost(item)}
    />
  );

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, username, profile_image_url")
        .eq("id", user_id)
        .single();
      if (profileError) throw profileError;
      setProfileUser(profile);

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*, profiles(*), images(*)")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (postsError) throw postsError;
      setPosts(postsData ?? []);

      // Load follower count
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user_id);
      setFollowerCount(followers ?? 0);

      // Load following count
      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user_id);
      setFollowingCount(following ?? 0);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  const tabSwitcher = (
    <View style={styles.tabSwitcher}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "fits" && styles.activeTab]}
        onPress={() => setActiveTab("fits")}
      >
        <Text
          style={[styles.tabText, activeTab === "fits" && styles.activeTabText]}
        >
          Fits
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "hauls" && styles.activeTab]}
        onPress={() => setActiveTab("hauls")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "hauls" && styles.activeTabText,
          ]}
        >
          Hauls
        </Text>
      </TouchableOpacity>
    </View>
  );
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Modal
        visible={selectedPost !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPostContent}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setSelectedPost(null)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            {selectedPost && (
              <>
                {/* Header */}

                {/* Images */}
                {selectedPost.isoutfit_post ? (
                  <ModalPostCard
                    post={selectedPost}
                    currentUserId={user_id}
                    onNavigateAway={() => setSelectedPost(null)}
                  />
                ) : (
                  <ModalHaulPostCard
                    post={selectedPost}
                    currentUserId={user_id}
                    onNavigateAway={() => setSelectedPost(null)}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topHeaderUsername}>@{profileUser?.username}</Text>
        <TouchableOpacity onPress={() => router.push("/(profile)/settings")}>
          <Ionicons name="menu" size={26} color="#000" />
        </TouchableOpacity>
      </View>
      <FlatList
        key={activeTab}
        numColumns={3}
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 2 }}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Avatar */}
            {profileUser?.profile_image_url ? (
              <Image
                source={{ uri: profileUser.profile_image_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.profileImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {profileUser?.name?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}

            {/* Name + username */}
            <Text style={styles.name}>{profileUser?.name}</Text>
            <Text style={styles.username}>@{profileUser?.username}</Text>

            {/* Follower counts */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>

            {/* Follow button */}
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing(user_id) && styles.followingButton,
              ]}
              onPress={() =>
                isFollowing(user_id)
                  ? unfollowUser(user_id)
                  : addFollow(user_id)
              }
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing(user_id) && styles.followingButtonText,
                ]}
              >
                {isFollowing(user_id) ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>

            {tabSwitcher}
          </View>
        }
        renderItem={renderExplorePost}
        ListEmptyComponent={<Text style={styles.emptyText}>No posts yet</Text>}
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
    alignItems: "center",
    padding: 20,
    marginBottom: -30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  closeButton: {},
  closeButtonText: {
    fontSize: 22,
    color: "#000",
    fontWeight: "400",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "600",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
  },
  username: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 16,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
  },
  followButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 24,
  },
  followingButton: {
    backgroundColor: "#000",
  },
  followButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  followingButtonText: {
    color: "#fff",
  },
  postsHeader: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  postImage: {
    width: "100%",
    height: 300,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  topHeaderUsername: {
    fontSize: 18,
    fontWeight: "700",
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
  postContainer: {
    backgroundColor: "#fff",

    overflow: "hidden",
    marginBottom: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalPostContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "95%",
    maxHeight: "85%",
    overflow: "hidden",
  },
});
