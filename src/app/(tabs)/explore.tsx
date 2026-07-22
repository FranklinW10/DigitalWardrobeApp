import { CommentsSheet } from "@/components/CommentSheet";
import { LikersSheet } from "@/components/LikerSheet";
import {
  ExplorePostCard,
  ModalHaulPostCard,
  ModalPostCard,
} from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/context/FollowsContext";
import { useTheme } from "@/context/ThemeContext";
import { Liker } from "@/hooks/useLikes";
import { Post, usePosts } from "@/hooks/usePosts";
import { SearchUser, useSearch } from "@/hooks/useSearch";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { results, isLoading, searchUsers } = useSearch();
  const { addFollow, unfollowUser, isFollowing, loadFollowing, isPending } =
    useFollows();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { posts, refreshExplorePosts } = usePosts();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(new Animated.Value(1)).current;
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<SearchUser[]>([]);
  const [likerPostId, setLikerPostId] = useState<string | null>(null);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [isLoadingLikers, setIsLoadingLikers] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | null>(
    null,
  );

  const RECENT_KEY = "recent_searches";

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

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

  // Pass a callback down into your modal post cards
  const handleOpenComments = (postId: string, postOwnerId: string) => {
    console.log("postId:", postId, "postOwnerId:", postOwnerId);
    setCommentPostId(postId);
    setCommentPostOwnerId(postOwnerId);
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    searchUsers(text);
  };

  useEffect(() => {
    if (user) {
      refreshExplorePosts();
    }
  }, [user]);
  useEffect(() => {
    loadFollowing();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshExplorePosts();
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderExplorePost = ({ item }: { item: Post }) => (
    <ExplorePostCard
      post={item}
      currentUserId={user?.id}
      onPress={() => setSelectedPost(item)}
    />
  );

  const handleSelectUser = (user: SearchUser) => {
    // prevent duplicates
    setRecentSearches((prev) => {
      const filtered = prev.filter((u) => u.id !== user.id);
      return [user, ...filtered].slice(0, 10); // keep last 10
    });

    router.push(`/(profile)/${user.id}`);
  };

  const renderUser = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => handleSelectUser(item)}
    >
      {item.profile_image_url ? (
        <Image source={{ uri: item.profile_image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {item.name?.[0]?.toUpperCase() || "U"}
          </Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          isFollowing(item.id) && styles.followingButton,
          isPending(item.id) && styles.pendingButton,
        ]}
        onPress={() => {
          if (isFollowing(item.id) || isPending(item.id)) {
            unfollowUser(item.id);
          } else {
            addFollow(item.id);
          }
        }}
      >
        <Text
          style={[
            styles.followButtonText,
            (isFollowing(item.id) || isPending(item.id)) &&
              styles.followingButtonText,
          ]}
        >
          {isFollowing(item.id)
            ? "Following"
            : isPending(item.id)
              ? "Requested"
              : "Follow"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {selectedPost && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPost(null)}
            >
              <Text style={styles.closeText}>✕</Text>
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
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => {
              (setSelectedPost(null), router.push("/(profile)/exploreScroll"));
            }}
          >
            <Ionicons name="grid-outline" size={16} color={colors.background} />
            <Text style={styles.exploreButtonText}>Scroll Explore Posts →</Text>
          </TouchableOpacity>
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
        </View>
      )}

      <View style={styles.searchRow}>
        {isFocused && (
          <TouchableOpacity
            onPress={() => {
              setIsFocused(false);
              setQuery("");
              inputRef.current?.blur();
            }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.searchContainer, isFocused && { flex: 1 }]}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, isFocused && { width: "90%" }]}
            placeholder={"Search by name or username..."}
            placeholderTextColor={colors.textMuted ?? "#999"}
            value={query}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            autoCapitalize="none"
          />
        </View>
      </View>
      {isFocused ? (
        isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : query.length === 0 ? (
          <FlatList
            key="recent"
            data={recentSearches}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            style={{ paddingLeft: 10, paddingRight: 10 }}
            ListHeaderComponent={
              <Text style={styles.recentHeader}>Recent Searches</Text>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No recent searches</Text>
            }
          />
        ) : (
          <FlatList
            key="search"
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            style={{ paddingLeft: 10, paddingRight: 10 }}
            ListEmptyComponent={
              query.length > 0 ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : null
            }
          />
        )
      ) : (
        <FlatList
          key="explore"
          data={posts}
          style={{ width: "100%" }}
          renderItem={renderExplorePost}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 0 }}
          columnWrapperStyle={{ gap: 2 }}
          ListEmptyComponent={
            <View>
              <Text>No posts found</Text>
            </View>
          }
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
      padding: 0,
      backgroundColor: colors.background,
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
      color: colors.text,
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
    backArrow: {
      marginBottom: 15,
      fontSize: 22,
      paddingHorizontal: 4,
      color: colors.text,
    },
    postContainer: {
      backgroundColor: colors.background,
      overflow: "hidden",
      marginBottom: 2,
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
    timeAgo: {
      fontSize: 12,
      color: colors.secondary,
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
      backgroundColor: colors.surface,
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
    content: {
      marginBottom: -10,
    },
    emptyContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 16,
      width: "95%",
      maxHeight: "85%",
      overflow: "hidden",
    },
    closeButton: {
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
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      marginBottom: 8,
      width: "100%",
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 14,
      marginBottom: 8,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    recentHeader: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginTop: 0,
      marginBottom: 8,
      paddingVertical: 2,
      letterSpacing: 0.3,
    },
    exploreButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
    },
    exploreButtonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: "600",
    },
  });
