import { CommentsSheet } from "@/components/CommentSheet";
import { LikersSheet } from "@/components/LikerSheet";
import { useAuth } from "@/context/AuthContext";
import { Liker } from "@/hooks/useLikes";

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
  const { user, updateUser, signOut } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);

  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { addFollow, unfollowUser, isFollowing, isPending, loadFollowing } =
    useFollows();
  const [activeTab, setActiveTab] = useState<"fits" | "hauls">("fits");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likerPostId, setLikerPostId] = useState<string | null>(null);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [isLoadingLikers, setIsLoadingLikers] = useState(false);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | null>(
    null,
  );
  // Pass a callback down into your modal post cards
  const handleOpenComments = (postId: string, postOwnerId: string) => {
    console.log("postId:", postId, "postOwnerId:", postOwnerId);
    setCommentPostId(postId);
    setCommentPostOwnerId(postOwnerId);
  };
  const handleOpenLikers = async (postId: string) => {
    setLikerPostId(postId);
    setIsLoadingLikers(true);
    const { data } = await supabase
      .from("likes")
      .select("user_id, profiles(username, name, profile_image_url)")
      .eq("post_id", postId);
    setLikers((data as any) ?? []);
    setIsLoadingLikers(false);
  };

  const filteredPosts = posts.filter((post) =>
    activeTab === "fits" ? post.isoutfit_post : !post.isoutfit_post,
  );
  useEffect(() => {
    const init = async () => {
      // Make sure we know the current follow state BEFORE deciding whether
      // this private account's posts/follow-list are visible — otherwise
      // isFollowing() can read stale/empty data and the privacy check below
      // becomes unreliable.
      await loadFollowing();
      await loadProfile();
    };
    init();
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
        .select("id, name, username, profile_image_url, isPrivate")
        .eq("id", user_id)
        .single();
      if (profileError) throw profileError;
      setProfileUser(profile);
      setIsPrivate(profile.isPrivate ?? false);

      const canView = !profile.isPrivate || isFollowing(user_id);

      // Counts are always visible (just not tappable/viewable in detail when
      // private) — fetch them as lightweight count-only queries regardless
      // of privacy, independent of whether we load the actual post content.
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user_id)
        .eq("status", true);
      setFollowerCount(followers ?? 0);

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user_id)
        .eq("status", true);
      setFollowingCount(following ?? 0);

      const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("is_active", true)
        .eq("is_public", true);
      setPostsCount(postCount ?? 0);

      // Only load the actual post content if the account is public, or
      // it's private but the viewer already follows it.
      if (canView) {
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("*, profiles(*), images(*)")
          .eq("user_id", user_id)
          .eq("is_active", true)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        if (postsError) throw postsError;
        setPosts(postsData ?? []);
      } else {
        // Important: clear out any posts left over from a previously
        // viewed (public/followed) profile — otherwise navigating from
        // one profile to a private one leaves the old grid on screen.
        setPosts([]);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  // Followers/following list (and post grid) should only be visible if the
  // account is public, or it's private but the current user already follows it.
  const canViewContent = !isPrivate || isFollowing(user_id);

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
      {selectedPost && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalcloseButton}
              onPress={() => setSelectedPost(null)}
            >
              <Text style={styles.modalcloseText}>✕</Text>
            </TouchableOpacity>

            {selectedPost.isoutfit_post ? (
              <ModalPostCard
                post={selectedPost}
                currentUserId={user?.id}
                onNavigateAway={() => setSelectedPost(null)}
                onOpenComments={handleOpenComments}
                onOpenLikers={handleOpenLikers}
              />
            ) : (
              <ModalHaulPostCard
                post={selectedPost}
                currentUserId={user?.id}
                onNavigateAway={() => setSelectedPost(null)}
                onOpenComments={handleOpenComments}
                onOpenLikers={handleOpenLikers}
              />
            )}
          </View>
        </View>
      )}

      <CommentsSheet
        postId={commentPostId ?? ""}
        postOwnerId={commentPostOwnerId ?? ""}
        visible={commentPostId !== null}
        onClose={() => {
          setCommentPostId(null);
          setCommentPostOwnerId(null);
        }}
      />
      <LikersSheet
        likers={likers}
        isLoading={isLoadingLikers}
        visible={likerPostId !== null}
        onClose={() => setLikerPostId(null)}
      />

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
        numColumns={canViewContent ? 3 : 1}
        data={canViewContent ? filteredPosts : null}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={canViewContent ? { gap: 2 } : undefined}
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
              <TouchableOpacity
                onPress={() => {
                  if (!canViewContent) return;
                  router.push({
                    pathname: "/(profile)/followList",
                    params: { profile_id: user_id, initialTab: "followers" },
                  });
                }}
                disabled={!canViewContent}
                style={!canViewContent && styles.statLocked}
              >
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{followerCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!canViewContent) return;
                  router.push({
                    pathname: "/(profile)/followList",
                    params: { profile_id: user_id, initialTab: "following" },
                  });
                }}
                disabled={!canViewContent}
                style={!canViewContent && styles.statLocked}
              >
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{postsCount}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>

            {/* Follow button */}
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing(user_id) && styles.followingButton,
                isPending(user_id) && styles.pendingButton,
              ]}
              onPress={() => {
                if (isFollowing(user_id) || isPending(user_id)) {
                  unfollowUser(user_id);
                } else {
                  addFollow(user_id);
                }
              }}
            >
              <Text
                style={[
                  styles.followButtonText,
                  (isFollowing(user_id) || isPending(user_id)) &&
                    styles.followingButtonText,
                ]}
              >
                {isFollowing(user_id)
                  ? "Following"
                  : isPending(user_id)
                    ? "Requested"
                    : "Follow"}
              </Text>
            </TouchableOpacity>

            {tabSwitcher}
          </View>
        }
        renderItem={renderExplorePost}
        ListEmptyComponent={
          !canViewContent ? (
            <View style={styles.privateNotice}>
              <Ionicons name="lock-closed" size={32} color="#999" />
              <Text style={styles.privateTitle}>This account is private</Text>
              <Text style={styles.privateSubtitle}>
                Follow this account to see their posts
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No posts yet</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pendingButton: {
    backgroundColor: "#ccc",
  },
  privateNotice: {
    alignItems: "center",
    paddingTop: 48,
    gap: 8,
  },
  privateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginTop: 8,
  },
  privateSubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingHorizontal: 32,
  },
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
  statLocked: {
    opacity: 0.4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "95%",
    maxHeight: "85%",
    overflow: "hidden",
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
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
    marginHorizontal: -26,
    marginBottom: 9,

    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",

    padding: 1,
  },
  activeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 8,
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

  modalcloseButton: {
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
  modalcloseText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
