import { HaulPostCard, PostCard } from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
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

  const headerVisible = useRef(new Animated.Value(1)).current;
  const [activeTab, setActiveTab] = useState<"fits" | "hauls">("fits");
  // Check if user has an active post
  const userActivePost = (posts ?? []).find(
    (post) => post.user_id === user?.id && post.is_active && post.is_post_today,
  );

  const hasActivePost = !!userActivePost;

  useEffect(() => {
    loadFollowing();
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
      <SafeAreaView style={{ backgroundColor: "#fff" }} edges={["top"]} />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Animated.View
          style={[styles.header, { height: headerHeight, overflow: "hidden" }]}
        >
          <TouchableOpacity onPress={() => router.push("/(profile)/settings")}>
            <Ionicons name="menu-outline" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fit Check</Text>
          <TouchableOpacity
            onPress={() => router.push("/(profile)/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color="#000" />
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
            // stickySectionHeadersEnabled={false} This makes the headers nt move
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            onScroll={handleScroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContent}>
                <Text>No posts yet</Text>
              </View>
            }
            contentContainerStyle={
              sections.length === 0 ? styles.emptyContent : styles.content
            }
          />
        ) : (
          <FlatList
            data={followingPosts}
            style={{ width: "100%" }}
            renderItem={renderHaulPost}
            keyExtractor={(item) => item.id}
            onScroll={handleScroll}
            contentContainerStyle={
              posts.length === 0 ? styles.emptyContent : styles.content
            }
            ListEmptyComponent={
              <View>
                {tabSwitcher} <Text>No posts found</Text>
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  headerContainer: {
    padding: 15,
    marginBottom: -15,
  },
  headerBorder: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",

    marginTop: -2,
  },

  sectionHeader: {
    fontSize: 30,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#333",
  },
  content: {
    paddingBottom: 100,
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  postContainer: {
    backgroundColor: "#fff",

    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
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
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  timeAgo: {
    fontSize: 12,
    color: "#666",
  },
  timeRemainingBadge: {
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeRemainingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f5f5f5",
  },
  postFooter: {
    padding: 16,
  },
  postDescription: {
    fontSize: 15,
    color: "#000",
    marginBottom: 8,
    lineHeight: 20,
  },
  postInfo: {
    fontSize: 14,
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingTop: -120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  headerIcon: {
    fontSize: 22,
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
    borderBottomWidth: 1,
    borderBottomColor: "#000",
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
    backgroundColor: "#000",
  },
  dotInactive: {
    backgroundColor: "#ccc",
  },
});
