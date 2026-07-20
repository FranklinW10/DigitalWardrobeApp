import { HaulPostCard, PostCard } from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/context/FollowsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useTheme } from "@/context/ThemeContext";
import { Post, usePosts } from "@/hooks/usePosts";
import { daysAgo } from "@/lib/date-helper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const { following, loadFollowing } = useFollows();
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const { posts, refreshPosts } = usePosts();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { unreadCount } = useNotifications();

  const headerVisible = useRef(new Animated.Value(1)).current;
  const [activeTab, setActiveTab] = useState<"fits" | "hauls">("fits");
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Check if user has an active post
  const userActivePost = (posts ?? []).find(
    (post) =>
      post.user_id === user?.id &&
      post.is_active &&
      post.is_post_today &&
      post.isoutfit_post,
  );

  const hasActivePost = !!userActivePost;

  useEffect(() => {
    loadFollowing();
    refreshPosts();
  }, [user?.id]);

  const followingPosts = posts.filter(
    (post) => following.includes(post.user_id) || post.user_id === user?.id,
  );

  const groupedPosts = followingPosts
    .filter((post) => daysAgo(post.created_at) !== "expired")
    .filter((post) => post.isoutfit_post)
    .reduce((groups: Record<string, Post[]>, post) => {
      const key = daysAgo(post.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(post);
      return groups;
    }, {});

  const sections = Object.entries(groupedPosts)
    .map(([title, data]) => ({ title, data }))
    .sort(
      (a, b) =>
        new Date(b.data[0].created_at).getTime() -
        new Date(a.data[0].created_at).getTime(),
    );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPosts();
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setRefreshing(false);
    }
  };
  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} currentUserId={user?.id} />
  );

  const renderHaulPost = ({ item }: { item: Post }) => (
    <HaulPostCard post={item} currentUserId={user?.id} />
  );

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        if (currentY > lastScrollY.current && currentY > 50) {
          // scrolling down — hide header
          Animated.timing(headerVisible, {
            toValue: 0,
            duration: 50,
            useNativeDriver: false,
          }).start();
        } else {
          // scrolling up — show header
          Animated.timing(headerVisible, {
            toValue: 1,
            duration: 50,
            useNativeDriver: false,
          }).start();
        }
        lastScrollY.current = currentY;
      },
    },
  );
  const followingHaulPosts = followingPosts.filter(
    (post) => !post.isoutfit_post,
  );

  const headerHeight = headerVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

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
  const tabHeight = headerVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60], // match the height of your tab switcher
  });

  return (
    <>
      <SafeAreaView style={styles.containerViewStyle} edges={["top"]} />
      <View style={styles.ViewStyle}>
        <Animated.View
          style={[styles.header, { height: headerHeight, overflow: "hidden" }]}
        >
          <TouchableOpacity onPress={() => router.push("/(profile)/settings")}>
            <Ionicons name="menu-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fit Check</Text>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={styles.Noticontainer}
          >
            <Ionicons name="notifications-outline" size={24} color="#000" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
        {/*List*/}
        <Animated.View style={{ height: tabHeight, overflow: "hidden" }}>
          {tabSwitcher}
        </Animated.View>
        {activeTab === "fits" ? (
          <SectionList
            key="fits"
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            stickySectionHeadersEnabled={false} //This makes the headers nt move
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            onScroll={handleScroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContent}>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySubtitle}>
                  Follow people to see their fits here
                </Text>
                <TouchableOpacity
                  style={styles.findFriendsButton}
                  onPress={() => router.push("/(profile)/suggestedFriends")}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={16}
                    color={colors.background}
                  />
                  <Text style={styles.findFriendsText}>Find Friends</Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={
              sections.length === 0 ? styles.emptyContent : styles.content
            }
            ListFooterComponent={<View style={styles.whitespace} />}
          />
        ) : (
          <FlatList
            data={followingHaulPosts}
            style={{ width: "100%" }}
            ListHeaderComponent={
              followingHaulPosts.length > 0 ? (
                <Text style={styles.sectionHeader}>Recent Hauls</Text>
              ) : null
            }
            renderItem={renderHaulPost}
            keyExtractor={(item) => item.id}
            onScroll={handleScroll}
            ListFooterComponent={<View style={styles.whitespace} />}
            contentContainerStyle={
              followingPosts.length === 0 ? styles.emptyContent : styles.content
            }
            ListEmptyComponent={
              <View style={styles.emptyContent}>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySubtitle}>
                  Follow people to see their hauls here
                </Text>
                <TouchableOpacity
                  style={styles.findFriendsButton}
                  onPress={() => router.push("/(profile)/suggestedFriends")}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={16}
                    color={colors.background}
                  />
                  <Text style={styles.findFriendsText}>Find Friends</Text>
                </TouchableOpacity>
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }

            // ListHeaderComponent={
            //   <View style={styles.headerContainer}>
            //     <Text
            //       style={{
            //         fontSize: 30,
            //         fontWeight: "600",
            //         marginBottom: 16,
            //         fontFamily: "Times New Roman",
            //         color: "#000",
            //       }}
            //     >
            //       Today's Fits
            //     </Text>
            //     <View style={styles.headerBorder} />
            //   </View>
            // }
          />
        )}
        {!hasActivePost && !bannerDismissed && (
          <View style={styles.postTodayBanner}>
            <TouchableOpacity
              style={styles.postTodayInner}
              onPress={() => router.push("/(post)/fit")}
            >
              <Ionicons
                name="camera-outline"
                size={20}
                color={colors.background}
              />
              <Text style={styles.postTodayText}>Post your fit for today</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.background}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bannerDismiss}
              onPress={() => setBannerDismissed(true)}
              hitSlop={4}
            >
              <Ionicons name="close" size={12} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any, currentTab?: any) =>
  StyleSheet.create({
    Noticontainer: { position: "relative", padding: 4 },
    badge: {
      position: "absolute",
      top: 0,
      right: 0,
      backgroundColor: "#FF3B30",
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
    ViewStyle: {
      flex: 1,
      backgroundColor: colors.background,
    },
    containerViewStyle: {
      backgroundColor: colors.background,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 24,
      textAlign: "center",
    },
    findFriendsButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 20,
    },
    findFriendsText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: "600",
    },
    postTodayBanner: {
      position: "absolute",
      bottom: 100,
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
      zIndex: 10,
    },
    postTodayInner: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 14,
      paddingLeft: 16,
    },
    postTodayText: {
      flex: 1,
      color: colors.background,
      fontSize: 15,
      fontWeight: "600",
    },
    bannerDismiss: {
      position: "absolute",
      top: -8,
      left: -8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    headerContainer: {
      padding: 15,
      marginBottom: -15,
    },
    headerBorder: {
      width: "100%",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginTop: -2,
    },
    sectionHeader: {
      fontSize: 30,
      fontWeight: "600",
      paddingHorizontal: 16,
      paddingVertical: 8,
      color: colors.text,
    },
    content: {
      paddingBottom: 100,
    },
    emptyContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
      marginBottom: 90,
    },
    postContainer: {
      backgroundColor: colors.background,
      overflow: "hidden",
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    postHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarPlaceholder: {
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textMuted,
    },
    username: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    timeAgo: {
      fontSize: 12,
      color: colors.secondary,
    },
    timeRemainingBadge: {
      backgroundColor: colors.accent, // Using accent here makes timers pop across layouts
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    timeRemainingText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
    postImage: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: colors.surface,
    },
    postFooter: {
      padding: 16,
    },
    postDescription: {
      fontSize: 15,
      color: colors.text,
      marginBottom: 8,
      lineHeight: 20,
    },
    postInfo: {
      fontSize: 14,
      color: colors.secondary,
    },
    header: {
      backgroundColor: colors.background,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      paddingTop: -120,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 30,
      fontWeight: "bold",
      color: colors.text,
    },
    headerIcon: {
      fontSize: 22,
    },
    whitespace: {
      padding: 50,
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
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
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
    dotsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    dotActive: {
      backgroundColor: colors.primary,
    },
    dotInactive: {
      backgroundColor: colors.border,
    },
  });
