import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import { Post, usePosts } from "@/hooks/usePosts";
import { SearchUser, useSearch } from "@/hooks/useSearch";
import { formatTimeAgo } from "@/lib/date-helper";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface HaulPostCardProps {
  post: Post;
  currentUserId?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HaulPostCard = ({ post, currentUserId }: HaulPostCardProps) => {
  if (post.isoutfit_post) {
    return;
  }
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [activeIndex, setActiveIndex] = useState(0);

  const images = [...(post.images ?? [])].sort(
    (a, b) => a.order_index - b.order_index,
  );

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {postUser?.profile_image_url ? (
            <Image
              cachePolicy="none"
              source={{ uri: postUser.profile_image_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {postUser?.name?.[0]?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>
              {isOwnPost ? "You" : `@${postUser?.username}`}
            </Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* Scrollable images */}
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
        >
          {images.map((img, index) => (
            <Image
              key={index}
              cachePolicy="none"
              source={{ uri: img.image_url }}
              style={[styles.postImage, { width: SCREEN_WIDTH }]}
              contentFit="cover"
            />
          ))}
        </ScrollView>

        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.postFooter}>
        {post.description && (
          <Text style={styles.postDescription}>{post.description}</Text>
        )}
        <Text style={styles.postInfo}>
          {isOwnPost ? "Your Post" : `${postUser?.name}'s post`} -{" "}
          {formatTimeAgo(post.created_at)}
        </Text>
      </View>
    </View>
  );
};

const ITEM_SIZE = SCREEN_WIDTH / 3;

const ExplorePostCard = ({
  post,
  currentUserId,
  onPress,
}: HaulPostCardProps & { onPress: () => void }) => {
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [activeIndex, setActiveIndex] = useState(0);
  const firstImage = post.images?.[0]?.image_url ?? post.image_url;

  return (
    <View style={styles.postContainer}>
      <View>
        <TouchableOpacity onPress={onPress}>
          <Image
            cachePolicy="none"
            source={{ uri: firstImage }}
            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { results, isLoading, searchUsers } = useSearch();
  const { addFollow, unfollowUser, isFollowing } = useFollows();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { posts, refreshPosts } = usePosts();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(new Animated.Value(1)).current;
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const handleSearch = (text: string) => {
    setQuery(text);
    searchUsers(text);
  };

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

  const renderExplorePost = ({ item }: { item: Post }) => (
    <ExplorePostCard
      post={item}
      currentUserId={user?.id}
      onPress={() => setSelectedPost(item)}
    />
  );

  const renderUser = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => router.push(`/(profile)/${item.id}`)}
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
        ]}
        onPress={() =>
          isFollowing(item.id) ? unfollowUser(item.id) : addFollow(item.id)
        }
      >
        <Text
          style={[
            styles.followButtonText,
            isFollowing(item.id) && styles.followingButtonText,
          ]}
        >
          {isFollowing(item.id) ? "Following" : "Follow"}
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
    <SafeAreaView style={styles.container}>
      <Modal
        visible={selectedPost !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPost(null)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            {selectedPost && (
              <>
                {/* Header */}
                <View style={styles.postHeader}>
                  <View style={styles.userInfo}>
                    {selectedPost.profiles?.profile_image_url ? (
                      <Image
                        source={{
                          uri: selectedPost.profiles.profile_image_url,
                        }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                          {selectedPost.profiles?.name?.[0]?.toUpperCase() ||
                            "U"}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.username}>
                        {selectedPost.user_id === user?.id
                          ? "You"
                          : `@${selectedPost.profiles?.username}`}
                      </Text>
                      <Text style={styles.timeAgo}>
                        {formatTimeAgo(selectedPost.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Images */}
                <HaulPostCard post={selectedPost} currentUserId={user?.id} />
              </>
            )}
          </View>
        </View>
      </Modal>
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

        <TextInput
          ref={inputRef}
          style={[styles.searchInput, isFocused && { width: "90%" }]}
          placeholder={"🔎 Search by name or username..."}
          value={query}
          onChangeText={handleSearch}
          onFocus={() => setIsFocused(true)}
          autoCapitalize="none"
          onBlur={() => setIsFocused(false)}
        />
      </View>
      {isFocused ? (
        isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: "#fff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    width: "100%",
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

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    marginBottom: -2,
    width: "100%",
  },
  backArrow: {
    marginBottom: 15,
    fontSize: 22,
    paddingHorizontal: 4,
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
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  timeAgo: {
    fontSize: 12,
    color: "#666",
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
    backgroundColor: "#f5f5f5",

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
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
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
});
