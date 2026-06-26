import { CommentsSheet } from "@/components/CommentSheet";
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { Post } from "@/hooks/usePosts";
import { formatTimeAgo } from "@/lib/date-helper";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PostCardProps {
  post: Post;
  currentUserId?: string;
}

const DOUBLE_PRESS_DELAY = 250;

export function DoubleTapButton({ onDoubleTap, children }: any) {
  const lastTap = useRef(0);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      lastTap.current = 0;
      onDoubleTap?.();
    } else {
      lastTap.current = now;
    }
  };

  return (
    <Pressable onPress={handlePress} unstable_pressDelay={0}>
      {children}
    </Pressable>
  );
}

const LikeButton = ({
  likeCount,
  isLiked,
  toggleLike,
}: {
  likeCount: number;
  isLiked: boolean;
  toggleLike: () => void;
}) => (
  <TouchableOpacity style={styles.actionButton} onPress={toggleLike}>
    <Ionicons
      name={isLiked ? "heart" : "heart-outline"}
      size={24}
      color={isLiked ? "red" : "#000"}
    />
    <Text style={styles.actionCount}>{likeCount}</Text>
  </TouchableOpacity>
);

const PostActions = ({
  post,
  currentUserId,
  commentCount,
  likeCount,
  isLiked,
  toggleLike,
  onCommentPress,
}: {
  post: Post;
  currentUserId?: string;
  commentCount: number;
  likeCount: number;
  isLiked: boolean;
  toggleLike: () => void;
  onCommentPress: () => void;
}) => (
  <View style={styles.actions}>
    <LikeButton
      likeCount={likeCount}
      isLiked={isLiked}
      toggleLike={toggleLike}
    />
    <TouchableOpacity
      style={styles.actionButton}
      onPress={() => {
        console.log("comment pressed");
        onCommentPress();
      }}
    >
      <Ionicons name="chatbubble-outline" size={22} color="#000" />
      <Text style={styles.actionCount}>{commentCount}</Text>
    </TouchableOpacity>
  </View>
);

export const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const { comments } = useComments(post.id);
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [showComments, setShowComments] = useState(false);

  const { likeCount, isLiked, toggleLike } = useLikes(post.id, currentUserId);
  return (
    <>
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={() =>
              isOwnPost
                ? router.push("/profile")
                : router.push(`/(profile)/${post.user_id}`)
            }
          >
            <View style={styles.userInfo}>
              {postUser?.profile_image_url ? (
                <Image
                  cachePolicy={"memory"}
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
                <Text style={styles.timeAgo}>
                  {formatTimeAgo(post.created_at)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          {/*Post content*/}
        </View>
        <DoubleTapButton onDoubleTap={toggleLike}>
          <Image
            cachePolicy={"memory-disk"}
            source={{ uri: post.image_url }}
            style={styles.postImage}
            contentFit="cover"
          />
        </DoubleTapButton>
        <PostActions
          post={post}
          currentUserId={currentUserId}
          commentCount={comments.length}
          likeCount={likeCount}
          isLiked={isLiked}
          toggleLike={toggleLike}
          onCommentPress={() => setShowComments(true)}
        />
      </View>
      <View style={styles.postFooter}>
        {post.description && (
          <Text style={styles.postDescription}>{post.description}</Text>
        )}
        <Text style={styles.postInfo}>
          {isOwnPost ? "Your Post" : `${postUser?.name}'post`} -{" "}
          {formatTimeAgo(post.created_at)}
        </Text>
      </View>
      <CommentsSheet
        postId={post.id}
        postOwnerId={post.user_id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
    </>
  );
};

interface HaulPostCardProps {
  post: Post;
  currentUserId?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const HaulPostCard = ({ post, currentUserId }: HaulPostCardProps) => {
  if (post.isoutfit_post) {
    return;
  }
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const { comments } = useComments(post.id);
  const { likeCount, isLiked, toggleLike } = useLikes(post.id, currentUserId);

  const lastTap = useRef(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      lastTap.current = 0;
      toggleLike();
    } else {
      lastTap.current = now;
    }
  };
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
        <TouchableOpacity
          onPress={() => router.push(`/(profile)/${post.user_id}`)}
        >
          <View style={styles.userInfo}>
            {postUser?.profile_image_url ? (
              <Image
                cachePolicy="memory"
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
              <Text style={styles.timeAgo}>
                {formatTimeAgo(post.created_at)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
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
            <Pressable key={index} onPress={handleDoubleTap}>
              <Image
                key={index}
                cachePolicy="memory-disk"
                source={{ uri: img.image_url }}
                style={[styles.postImage, { width: SCREEN_WIDTH }]}
                contentFit="cover"
              />
            </Pressable>
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

      <PostActions
        post={post}
        currentUserId={currentUserId}
        commentCount={comments.length}
        likeCount={likeCount}
        isLiked={isLiked}
        toggleLike={toggleLike}
        onCommentPress={() => setShowComments(true)}
      />
      <View style={styles.postFooter}>
        {post.description && (
          <Text style={styles.postDescription}>{post.description}</Text>
        )}
        <Text style={styles.postInfo}>
          {isOwnPost ? "Your Post" : `${postUser?.name}'s post`} -{" "}
          {formatTimeAgo(post.created_at)}
        </Text>
      </View>
      <CommentsSheet
        postId={post.id}
        postOwnerId={post.user_id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
};

const ITEM_SIZE = SCREEN_WIDTH / 3;

export const ExplorePostCard = ({
  post,
  currentUserId,
  onPress,
}: HaulPostCardProps & { onPress: () => void }) => {
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [activeIndex, setActiveIndex] = useState(0);
  const firstImage = post.images?.[0]?.image_url ?? post.image_url;

  return (
    <View style={styles.explorePostContainer}>
      <View>
        <TouchableOpacity onPress={onPress}>
          <Image
            cachePolicy="memory-disk"
            source={{ uri: firstImage }}
            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const ModalPostCard = ({
  post,
  currentUserId,
  onNavigateAway,
  onOpenComments,
}: PostCardProps & {
  onNavigateAway: () => void;
  onOpenComments: (postId: string, postOwnerId: string) => void;
}) => {
  const { likeCount, isLiked, toggleLike } = useLikes(post.id, currentUserId);

  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [showComments, setShowComments] = useState(false);
  const { comments } = useComments(post.id);

  return (
    <>
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={() => {
              onNavigateAway();
              isOwnPost
                ? router.push("/profile")
                : router.push(`/(profile)/${post.user_id}`);
            }}
          >
            <View style={styles.userInfo}>
              {postUser?.profile_image_url ? (
                <Image
                  cachePolicy={"memory"}
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
                <Text style={styles.timeAgo}>
                  {formatTimeAgo(post.created_at)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          {/*Post content*/}
        </View>
        <DoubleTapButton onDoubleTap={toggleLike}>
          <Image
            cachePolicy={"memory-disk"}
            source={{ uri: post.image_url }}
            style={styles.postImage}
            contentFit="cover"
          />
        </DoubleTapButton>
        <PostActions
          post={post}
          currentUserId={currentUserId}
          commentCount={comments.length}
          likeCount={likeCount}
          isLiked={isLiked}
          toggleLike={toggleLike}
          onCommentPress={() => setShowComments(true)}
        />
      </View>
      <View style={styles.postFooter}>
        {post.description && (
          <Text style={styles.postDescription}>{post.description}</Text>
        )}
        <Text style={styles.postInfo}>
          {isOwnPost ? "Your Post" : `${postUser?.name}'post`} -{" "}
          {formatTimeAgo(post.created_at)}
        </Text>
      </View>
    </>
  );
};

export const ModalHaulPostCard = ({
  post,
  currentUserId,
  onNavigateAway,
  onOpenComments,
}: HaulPostCardProps & {
  onNavigateAway: () => void;
  onOpenComments: (postId: string, postOwnerId: string) => void;
}) => {
  if (post.isoutfit_post) {
    return;
  }
  const { likeCount, isLiked, toggleLike } = useLikes(post.id, currentUserId);

  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const { comments } = useComments(post.id);

  const lastTap = useRef(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      lastTap.current = 0;
      toggleLike();
    } else {
      lastTap.current = now;
    }
  };

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
        <TouchableOpacity
          onPress={() => {
            onNavigateAway();
            router.push(`/(profile)/${post.user_id}`);
          }}
        >
          <View style={styles.userInfo}>
            {postUser?.profile_image_url ? (
              <Image
                cachePolicy="memory"
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
              <Text style={styles.timeAgo}>
                {formatTimeAgo(post.created_at)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
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
            <Pressable key={index} onPress={handleDoubleTap}>
              <Image
                key={index}
                cachePolicy="memory-disk"
                source={{ uri: img.image_url }}
                style={[styles.postImage, { width: SCREEN_WIDTH - 20 }]}
                contentFit="cover"
              />
            </Pressable>
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

      <PostActions
        post={post}
        currentUserId={currentUserId}
        commentCount={comments.length}
        likeCount={likeCount}
        isLiked={isLiked}
        toggleLike={toggleLike}
        onCommentPress={() => setShowComments(true)}
      />
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

const styles = StyleSheet.create({
  explorePostContainer: {
    backgroundColor: "#fff",

    overflow: "hidden",
    marginBottom: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
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
    padding: 12,
    paddingTop: 4, // ✅ reduce top padding
  },
  postContainer: {
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 0, // ✅ remove bottom margin
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    marginBottom: -22,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: "500",
  },
});
