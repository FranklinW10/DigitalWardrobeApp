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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const lastScrollY = useRef(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const miniBarAnim = useRef(new Animated.Value(0)).current;
  const upScrollAccumulator = useRef(0);
  const SCROLL_UP_THRESHOLD = 750;

  const headerVisible = useRef(new Animated.Value(1)).current;
  const [activeTab, setActiveTab] = useState<"fits" | "hauls">("fits");
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const headerOpacity = headerVisible.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

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

  const renderMiniTabLabel = (tab: "fits" | "hauls", label: string) => (
    <TouchableOpacity
      style={styles.miniTabItem}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.miniTabText,
          activeTab === tab && styles.miniTabTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
  const miniBarOpacity = miniBarAnim;
  const miniBarTranslateY = miniBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });

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

      // Force remount
      setRefreshKey((prev) => prev + 1);
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
        const delta = currentY - lastScrollY.current;

        if (delta > 0 && currentY > 50) {
          // scrolling down — hide immediately, reset the up-accumulator
          upScrollAccumulator.current = 0;
          Animated.timing(headerVisible, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }).start();
          Animated.timing(miniBarAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }).start();
        } else if (delta < 0) {
          // scrolling up — accumulate distance before showing
          upScrollAccumulator.current += -delta;
          console.log(
            "up accum:",
            upScrollAccumulator.current,
            "delta:",
            delta,
          );

          if (
            upScrollAccumulator.current > SCROLL_UP_THRESHOLD ||
            currentY <= 50
          ) {
            Animated.timing(headerVisible, {
              toValue: 1,
              duration: 0,
              useNativeDriver: false,
            }).start();
            Animated.timing(miniBarAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }).start();
          }
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
        style={[styles.tabPill, activeTab === "fits" && styles.tabPillActive]}
        onPress={() => setActiveTab("fits")}
        activeOpacity={0.85}
      >
        <Text
          style={[styles.tabText, activeTab === "fits" && styles.activeTabText]}
        >
          Fits
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabPill, activeTab === "hauls" && styles.tabPillActive]}
        onPress={() => setActiveTab("hauls")}
        activeOpacity={0.85}
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
    outputRange: [0, 60],
  });

  const renderEmptyState = (kind: "fits" | "hauls") => (
    <View style={styles.emptyContent}>
      <View style={styles.emptyIconBadge}>
        {kind === "fits" ? (
          <Ionicons name="shirt-outline" size={28} color={colors.primary} />
        ) : (
          <Ionicons
            name="bag-handle-outline"
            size={28}
            color={colors.primary}
          />
        )}
      </View>
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>
        {kind === "fits"
          ? "Follow people to see their fits here"
          : "Follow people to see their hauls here"}
      </Text>
      <TouchableOpacity
        style={styles.findFriendsButton}
        onPress={() => router.push("/(profile)/suggestedFriends")}
        activeOpacity={0.85}
      >
        <Ionicons
          name="person-add-outline"
          size={16}
          color={colors.background}
        />
        <Text style={styles.findFriendsText}>Find Friends</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <SafeAreaView style={styles.containerViewStyle} edges={["top"]} />
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.miniTabBar,
          {
            top: insets.top,
            opacity: miniBarOpacity,
            transform: [{ translateY: miniBarTranslateY }],
          },
        ]}
      >
        {renderMiniTabLabel("fits", "Fits")}
        {renderMiniTabLabel("hauls", "Hauls")}
      </Animated.View>
      <View style={styles.ViewStyle}>
        <Animated.View
          style={[
            styles.header,
            {
              height: headerHeight,
              overflow: "hidden",
              opacity: headerOpacity,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.push("/(profile)/settings")}>
            <Ionicons name="menu-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fit Check</Text>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={styles.Noticontainer}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={colors.text}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ height: tabHeight, overflow: "hidden" }}>
          {tabSwitcher}
        </Animated.View>

        {activeTab === "fits" ? (
          <SectionList
            key={`fits-${refreshKey}`}
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary} // iOS spinner color
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={renderEmptyState("fits")}
            contentContainerStyle={
              sections.length === 0 ? styles.emptyContent : styles.content
            }
            ListFooterComponent={<View style={styles.whitespace} />}
          />
        ) : (
          <FlatList
            key={`hauls-${refreshKey}`}
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
            scrollEventThrottle={16}
            ListFooterComponent={<View style={styles.whitespace} />}
            contentContainerStyle={
              followingPosts.length === 0 ? styles.emptyContent : styles.content
            }
            ListEmptyComponent={renderEmptyState("hauls")}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary} // iOS spinner color
                colors={[colors.primary]}
              />
            }
          />
        )}

        {!hasActivePost && !bannerDismissed && (
          <View style={styles.postTodayBanner}>
            <TouchableOpacity
              style={styles.postTodayInner}
              onPress={() => router.push("/(post)/fit")}
              activeOpacity={0.9}
            >
              <View style={styles.postTodayIconBadge}>
                <Ionicons
                  name="camera-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
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
const createStyles = (colors: any) =>
  StyleSheet.create({
    Noticontainer: { position: "relative", padding: 4 },
    badge: {
      position: "absolute",
      top: 0,
      right: 0,
      backgroundColor: colors.accent,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { color: colors.background, fontSize: 11, fontWeight: "600" },
    ViewStyle: {
      flex: 1,
      backgroundColor: colors.background,
    },
    containerViewStyle: {
      backgroundColor: colors.background,
    },
    miniTabBar: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 50,
      flexDirection: "row",
      justifyContent: "center",
      gap: 20,
      paddingVertical: 0,

      backgroundColor: colors.background,
    },
    miniTabItem: {
      paddingHorizontal: 20,
      paddingVertical: 2,
    },
    miniTabText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    miniTabTextActive: {
      color: colors.text,
      fontWeight: "800",
    },

    emptyIconBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary + "1F",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 24,
      textAlign: "center",
      lineHeight: 20,
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
      borderRadius: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
      zIndex: 10,
    },
    postTodayInner: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingLeft: 12,
      paddingRight: 16,
    },
    postTodayIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    postTodayText: {
      flex: 1,
      color: colors.background,
      fontSize: 15,
      fontWeight: "700",
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
    sectionHeader: {
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: 0.2,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
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
    header: {
      backgroundColor: colors.background,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: colors.text,
    },
    whitespace: {
      padding: 50,
    },
    tabSwitcher: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 6,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 4,
      gap: 4,
    },
    tabPill: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 10,
    },
    tabPillActive: {
      backgroundColor: colors.background,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    tabText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textMuted,
    },
    activeTabText: {
      color: colors.text,
      fontWeight: "700",
    },
  });
