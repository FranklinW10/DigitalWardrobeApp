import { CommentsSheet } from "@/components/CommentSheet";
import { LikersSheet } from "@/components/LikerSheet";
import { StreakFireBadge } from "@/components/profileStreak";
import { ReportModal } from "@/components/reportModal";
import { StreakAvatar } from "@/components/StreakAvatar";
import { useAuth, User } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Liker } from "@/hooks/useLikes";

import {
  ExplorePostCard,
  ModalHaulPostCard,
  ModalPostCard,
} from "@/components/PostCard";
import { useBlocks } from "@/context/BlocksContext";
import { useFollows } from "@/context/FollowsContext";
import { Post } from "@/hooks/usePosts";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  streak?: number;
  bio?: string;
  link?: string;
  linkLabel?: string;
}

export default function UserProfileScreen() {
  const { user, updateUser, signOut } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { blockUser } = useBlocks();
  const [showReportModal, setShowReportModal] = useState(false);
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
  const { postId, openComments } = useLocalSearchParams<{
    postId?: string;
    openComments?: string;
  }>();
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

  const handledNotificationRef = useRef(false);

  useEffect(() => {
    if (handledNotificationRef.current) return;
    if (!postId || posts.length === 0) return;

    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    handledNotificationRef.current = true;
    setSelectedPost(targetPost);
    // matches what renderExplorePost's onPress already does when opening a post
    if (openComments === "true") {
      handleOpenComments(targetPost.id, targetPost.user_id);
    }
  }, [posts, postId, openComments]);

  const renderExplorePost = ({ item }: { item: Post }) => (
    <ExplorePostCard
      post={item}
      currentUserId={profileUser?.id}
      onPress={() => setSelectedPost(item)}
    />
  );
  const flattenPostTags = (post: any) => {
    return (post.post_image_tags ?? [])
      .map((row: any) => {
        if (!row.tags_new) return null;
        return {
          id: row.tags_new.id,
          image_id: row.image_id,
          location_x: row.location_x,
          created_at: row.tags_new.created_at,

          location_y: row.location_y,
          brand: row.tags_new.brand,
          tag_image: row.tags_new.tag_image,
          price: row.tags_new.price,
          store: row.tags_new.store,
          color: row.tags_new.color,
          favorite: row.tags_new.favorite,
          in_archive: row.tags_new.in_archive,
          name: row.tags_new.name,
          count: 0,
        };
      })
      .filter(Boolean);
  };

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, name, username, profile_image_url, isPrivate, streak,  bio, link,linkLabel",
        )
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
          .select(
            "*, profiles(*), images(*),post_image_tags(image_id,location_x,location_y,tags_new(*))",
          )
          .eq("user_id", user_id)
          .eq("is_active", true)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        if (postsError) throw postsError;
        setPosts(
          (postsData ?? []).map((post) => ({
            ...post,
            tags: flattenPostTags(post),
          })),
        );
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
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
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
  const stripProtocol = (url: string) =>
    url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");

  const truncateText = (text: string, maxLength = 28) =>
    text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

  const handleProfileOptions = (User: User) => {
    Alert.alert("User Options", "", [
      {
        text: "Report User",
        onPress: () => setShowReportModal(true),
      },
      {
        text: "Block User",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Block this user?",
            `You won't see posts from @${profileUser?.username} anymore.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Block",
                style: "destructive",
                onPress: () => blockUser(User.id),
              },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {selectedPost && (
        <TouchableWithoutFeedback onPress={() => setSelectedPost(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
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
        </TouchableWithoutFeedback>
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
        <TouchableOpacity
          onPress={() => handleProfileOptions(profileUser as User)}
        >
          <Ionicons name="menu" size={26} color={colors.text} />
        </TouchableOpacity>
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="user"
          targetId={profileUser?.id ?? ""}
        />
      </View>
      <FlatList
        key={`${activeTab}-${canViewContent ? 3 : 1}`}
        numColumns={canViewContent ? 3 : 1}
        data={canViewContent ? filteredPosts : null}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={canViewContent ? { gap: 2 } : undefined}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Avatar */}
            <StreakAvatar
              uri={profileUser?.profile_image_url}
              initial={profileUser?.username?.[0]?.toUpperCase() || "U"}
              streak={profileUser?.streak ?? 0}
              size={90}
              colors={colors}
              RING_WIDTH={3.3}
              RING_GAP={2.75}
            />
            {(profileUser?.streak ?? 0) >= 3 && (
              <StreakFireBadge
                streak={profileUser?.streak ?? 0}
                size={44}
                offsetY={250}
                offsetX={140}
              />
            )}

            {/* Name + username */}
            <Text style={styles.name}>{profileUser?.name}</Text>
            <Text style={styles.username}>@{profileUser?.username}</Text>

            {profileUser?.bio ? (
              <Text style={styles.bio}>{profileUser.bio}</Text>
            ) : null}

            {profileUser?.link ? (
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL(profileUser.link!)}
              >
                <Ionicons
                  name="link-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={styles.linkText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {truncateText(
                    profileUser.linkLabel?.trim() ||
                      stripProtocol(profileUser.link),
                  )}
                </Text>
              </TouchableOpacity>
            ) : null}

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
              <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
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

const createStyles = (colors: any) =>
  StyleSheet.create({
    pendingButton: {
      backgroundColor: colors.border,
    },
    privateNotice: {
      alignItems: "center",
      paddingTop: 48,
      gap: 8,
    },
    privateTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 8,
    },
    privateSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text,
      fontWeight: "400",
    },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      marginBottom: 12,
    },
    avatarPlaceholder: {
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 36,
      fontWeight: "600",
      color: colors.textMuted,
    },
    name: {
      marginTop: 12,
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    username: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 12,
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
      color: colors.text,
    },
    modalContent: {
      backgroundColor: colors.card || colors.surface,
      borderRadius: 16,
      width: "95%",
      maxHeight: "85%",
      overflow: "hidden",
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    followButton: {
      paddingHorizontal: 32,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      marginBottom: 24,
    },
    followingButton: {
      backgroundColor: colors.primary,
    },
    followButtonText: {
      fontWeight: "600",
      fontSize: 14,
      color: colors.primary,
    },
    followingButtonText: {
      color: colors.background,
    },
    bio: {
      fontSize: 14,
      color: colors.text,
      textAlign: "center",
      paddingHorizontal: 32,
      marginBottom: 6,
      lineHeight: 19,
    },
    bioCharCount: {
      fontSize: 11,
      color: colors.textMuted,
      alignSelf: "flex-end",
      marginTop: -2,
      marginBottom: -4,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 12,
    },
    linkText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
      textDecorationLine: "underline",
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
      color: colors.text,
    },
    postImage: {
      width: "100%",
      height: 300,
      marginBottom: 8,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textMuted,
      marginTop: 40,
    },
    topHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topHeaderUsername: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },

    tabSwitcher: {
      flexDirection: "row",
      marginHorizontal: -26,
      marginBottom: 9,

      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,

      padding: 1,
    },
    activeTab: {
      flex: 1,
      paddingVertical: 6,
      alignItems: "center",
      borderRadius: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
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
      color: colors.textMuted,
    },
    activeTabText: {
      color: colors.text,
      fontWeight: "600",
    },
    postContainer: {
      backgroundColor: colors.card || colors.surface,

      overflow: "hidden",
      marginBottom: 2,
      shadowColor: colors.text,
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
      color: "#fff", // Kept white to maintain contrast over the absolute dark background overlay button
      fontSize: 14,
      fontWeight: "600",
    },
    modalPostContent: {
      backgroundColor: colors.card || colors.surface,
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
      color: "#fff", // Kept white to maintain contrast over the absolute dark background overlay button
      fontSize: 14,
      fontWeight: "600",
    },
  });
