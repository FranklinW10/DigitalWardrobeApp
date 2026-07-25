import { CommentsSheet } from "@/components/CommentSheet";
import { LikersSheet } from "@/components/LikerSheet";
import { useTheme } from "@/context/ThemeContext";
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { Post, PostTag } from "@/hooks/usePosts";
import { formatDate, formatTimeAgo } from "@/lib/date-helper";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { SaveButton } from "./saveButton";

interface PostCardProps {
  post: Post;
  currentUserId?: string;
}

const TagPin = ({
  tag,
  containerSize,
  colors,
}: {
  tag: PostTag;
  containerSize: { width: number; height: number };
  colors: any;
}) => {
  if (!containerSize.width || !containerSize.height) return null;

  const left = (tag.location_x / 100) * containerSize.width;
  const top = (tag.location_y / 100) * containerSize.height;

  const bubbleText = [
    tag.brand && `Brand: ${tag.brand}`,
    tag.store && `Store: ${tag.store}`,
    tag.price && `Price: $${tag.price}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <View
      pointerEvents="none"
      style={[
        tagPinStyles.pinWrap,
        {
          left: left - 70,
          top: top - 20,
        },
      ]}
    >
      <View
        style={[
          tagPinStyles.pinBubble,
          {
            backgroundColor: `${colors.surface}CC`,
            borderColor: `${colors.border}CC`,
          },
        ]}
      >
        <Text style={[tagPinStyles.pinText, { color: colors.text }]}>
          {bubbleText}
        </Text>
      </View>

      <View
        style={[
          tagPinStyles.pinArrow,
          {
            borderTopColor: `${colors.surface}CC`,
          },
        ]}
      />

      <View
        style={[
          tagPinStyles.pinDot,
          {
            backgroundColor: tag.color || colors.primary,
          },
        ]}
      />
    </View>
  );
};
const tagPinStyles = StyleSheet.create({
  pinWrap: {
    position: "absolute",

    alignItems: "center",
  },

  pinBubble: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  pinText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },

  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },

  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },

  bagButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
const TaggableImage = ({
  imageUri,
  tags,
  onDoubleTap,
  imageStyle,
  colors,
}: {
  imageUri: string;
  tags?: PostTag[];
  onDoubleTap: () => void;
  imageStyle: any;
  colors: any;
}) => {
  const [showTags, setShowTags] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const hasTags = !!tags && tags.length > 0;

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Anchor point + baseline translation captured at the start of each pinch,
  // so we can measure how far the pinch has moved (for two-finger drag)
  // independently of how much it has scaled (for zoom-into-focal-point).
  const pinchStartFocalX = useSharedValue(0);
  const pinchStartFocalY = useSharedValue(0);
  const pinchStartTranslateX = useSharedValue(0);
  const pinchStartTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onBegin((e) => {
      pinchStartFocalX.value = e.focalX;
      pinchStartFocalY.value = e.focalY;
      pinchStartTranslateX.value = translateX.value;
      pinchStartTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(e.scale, 4));
      if (scale.value > 1 && !isZoomed) {
        runOnJS(setIsZoomed)(true);
      }

      // Keeps the zoom centered under where the pinch started...
      const anchorX =
        (pinchStartFocalX.value - containerSize.width / 2) *
        (1 - scale.value) *
        0.5;
      const anchorY =
        (pinchStartFocalY.value - containerSize.height / 2) *
        (1 - scale.value) *
        0.5;

      // ...and lets the image be dragged by however far the two fingers
      // have physically moved together since the pinch began.
      const dragX = e.focalX - pinchStartFocalX.value;
      const dragY = e.focalY - pinchStartFocalY.value;

      translateX.value = pinchStartTranslateX.value + anchorX + dragX;
      translateY.value = pinchStartTranslateY.value + anchorY + dragY;
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      runOnJS(setIsZoomed)(false);
    });

  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onUpdate((e) => {
      const maxTranslateX = (containerSize.width * (scale.value - 1)) / 2;
      const maxTranslateY = (containerSize.height * (scale.value - 1)) / 2;

      translateX.value = Math.max(
        -maxTranslateX,
        Math.min(maxTranslateX, savedTranslateX.value + e.translationX),
      );
      translateY.value = Math.max(
        -maxTranslateY,
        Math.min(maxTranslateY, savedTranslateY.value + e.translationY),
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      style={[
        { position: "relative" },
        isZoomed
          ? { overflow: "visible", zIndex: 999, elevation: 999 }
          : { overflow: "hidden", zIndex: 0, elevation: 0 },
      ]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerSize({ width, height });
      }}
    >
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle}>
          <DoubleTapButton
            onDoubleTap={onDoubleTap}
            onSingleTap={() => {
              if (hasTags) setShowTags((v) => !v);
            }}
          >
            <Image
              cachePolicy={"memory-disk"}
              source={{ uri: imageUri }}
              style={imageStyle}
              contentFit="cover"
            />
          </DoubleTapButton>
        </Animated.View>
      </GestureDetector>

      {showTags &&
        hasTags &&
        tags!.map((tag) => (
          <TagPin
            key={tag.id}
            tag={tag}
            containerSize={containerSize}
            colors={colors}
          />
        ))}

      {hasTags && (
        <TouchableOpacity
          style={tagPinStyles.bagButton}
          onPress={() => setShowTags((v) => !v)}
          hitSlop={8}
        >
          <Ionicons
            name={showTags ? "bag-handle" : "bag-handle-outline"}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const DOUBLE_PRESS_DELAY = 250;

export function DoubleTapButton({ onDoubleTap, onSingleTap, children }: any) {
  const lastTap = useRef(0);
  const singleTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      lastTap.current = 0;
      if (singleTapTimeout.current) {
        clearTimeout(singleTapTimeout.current);
        singleTapTimeout.current = null;
      }
      onDoubleTap?.();
    } else {
      lastTap.current = now;
      if (singleTapTimeout.current) clearTimeout(singleTapTimeout.current);
      // Wait to see if a second tap follows before treating this as a single tap
      singleTapTimeout.current = setTimeout(() => {
        onSingleTap?.();
        singleTapTimeout.current = null;
      }, DOUBLE_PRESS_DELAY);
    }
  };

  return (
    <Pressable onPress={handlePress} unstable_pressDelay={0}>
      {children}
    </Pressable>
  );
}
const MAX_SEARCH_ITERATIONS = 8;

const ExpandableCaption = ({
  text,
  textStyle,
  moreStyle,
}: {
  text: string;
  textStyle: any;
  moreStyle: any;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [checkedFullText, setCheckedFullText] = useState(false);
  const [truncateAt, setTruncateAt] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const bounds = useRef({ low: 0, high: text.length });
  const iterations = useRef(0);

  useEffect(() => {
    setCheckedFullText(false);
    setNeedsExpansion(false);
    setTruncateAt(null);
    setSettled(false);
    bounds.current = { low: 0, high: text.length };
    iterations.current = 0;
  }, [text]);

  if (expanded) {
    return (
      <Text style={textStyle}>
        {text}
        <Text onPress={() => setExpanded(false)} style={moreStyle}>
          {"  less"}
        </Text>
      </Text>
    );
  }

  // Pass 1: does the full caption even need truncating?
  if (!checkedFullText) {
    return (
      <Text
        style={textStyle}
        onTextLayout={(e) => {
          const overflows = e.nativeEvent.lines.length > 1;
          setNeedsExpansion(overflows);
          setCheckedFullText(true);
          if (overflows) {
            const mid = Math.floor(text.length / 2);
            bounds.current = { low: 0, high: text.length };
            setTruncateAt(mid);
          } else {
            setSettled(true);
          }
        }}
      >
        {text}
      </Text>
    );
  }

  if (!needsExpansion) {
    return <Text style={textStyle}>{text}</Text>;
  }

  // Pass 2+: binary search for the longest substring that still fits
  // on one line alongside "… more" — always visible, never hidden,
  // and guaranteed to terminate within MAX_SEARCH_ITERATIONS.
  const candidate = text.slice(0, truncateAt ?? 0).trimEnd();

  return (
    <Text
      style={textStyle}
      onTextLayout={(e) => {
        if (settled) return;
        iterations.current += 1;

        const { low, high } = bounds.current;
        const fits = e.nativeEvent.lines.length <= 1;

        if (high - low <= 1 || iterations.current >= MAX_SEARCH_ITERATIONS) {
          setSettled(true);
          return;
        }

        const newBounds = fits
          ? { low: truncateAt ?? 0, high }
          : { low, high: truncateAt ?? 0 };
        bounds.current = newBounds;

        const mid = Math.floor((newBounds.low + newBounds.high) / 2);
        setTruncateAt(mid);
      }}
    >
      {candidate}
      {"… "}
      <Text onPress={() => setExpanded(true)} style={moreStyle}>
        more
      </Text>
    </Text>
  );
};

const styles = StyleSheet.create({
  measureHidden: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
  },
});

// Static styles for ExpandableCaption — not theme-dependent, so this
// doesn't need to live inside createStyles(colors).
const captionStyles = StyleSheet.create({
  moreOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    paddingLeft: 24,
  },
});

const LikeButton = ({
  likeCount,
  isLiked,
  toggleLike,
  onLikeCountPress,
  colors,
  styles, // <-- Receive styles here
}: {
  likeCount: number;
  isLiked: boolean;
  toggleLike: () => void;
  onLikeCountPress: () => void;
  colors: any;
  styles: any; // <-- Add type
}) => (
  <View style={styles.actionButton}>
    <TouchableOpacity onPress={toggleLike}>
      <Ionicons
        name={isLiked ? "heart" : "heart-outline"}
        size={24}
        color={isLiked ? colors.accent : colors.text}
      />
    </TouchableOpacity>
    <TouchableOpacity onPress={onLikeCountPress}>
      <Text style={styles.actionCount}>{likeCount}</Text>
    </TouchableOpacity>
  </View>
);

const PostActions = ({
  post,
  commentCount,
  likeCount,
  isLiked,
  toggleLike,
  onCommentPress,
  onLikeCountPress,
  colors,
  styles, // <-- Receive styles here
}: any) => (
  <View style={styles.actions}>
    <LikeButton
      likeCount={likeCount}
      isLiked={isLiked}
      toggleLike={toggleLike}
      onLikeCountPress={onLikeCountPress}
      colors={colors}
      styles={styles} // <-- Pass down
    />
    <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
      <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
      <Text style={styles.actionCount}>{commentCount}</Text>
    </TouchableOpacity>

    <View style={{ marginLeft: "auto" }}>
      <SaveButton postId={post.id} color={colors.text} />
    </View>
  </View>
);

export const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const { comments } = useComments(post.id);
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const {
    likeCount,
    isLiked,
    toggleLike,
    likers,
    isLoadingLikers,
    fetchLikers,
  } = useLikes(post.id, currentUserId);
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);
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

        <TaggableImage
          imageUri={post.image_url}
          tags={post.tags}
          onDoubleTap={toggleLike}
          imageStyle={styles.postImage}
          colors={colors}
        />

        <PostActions
          post={post}
          currentUserId={currentUserId}
          commentCount={comments.length}
          likeCount={likeCount}
          isLiked={isLiked}
          toggleLike={toggleLike}
          onCommentPress={() => setShowComments(true)}
          onLikeCountPress={() => {
            fetchLikers();
            setShowLikers(true);
          }}
          colors={colors}
          styles={styles}
        />
      </View>
      <View style={styles.postFooter}>
        {post.description && (
          <ExpandableCaption
            text={post.description}
            textStyle={styles.postDescription}
            moreStyle={styles.moreText}
          />
        )}
        <Text style={styles.postInfo}>
          {isOwnPost ? "Your Post" : `${postUser?.name}'s post`} -{" "}
          {formatDate(post.post_date)}
        </Text>
      </View>
      <CommentsSheet
        postId={post.id}
        postOwnerId={post.user_id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
      <LikersSheet
        likers={likers}
        isLoading={isLoadingLikers}
        visible={showLikers}
        onClose={() => setShowLikers(false)}
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
  const {
    likeCount,
    isLiked,
    toggleLike,
    likers,
    isLoadingLikers,
    fetchLikers,
  } = useLikes(post.id, currentUserId);
  const [showLikers, setShowLikers] = useState(false);
  // Actual on-screen width of the carousel, measured via onLayout rather
  // than assumed from Dimensions — if this card ever sits inside a
  // container with horizontal padding/margin, SCREEN_WIDTH would be wider
  // than the visible viewport, so each "page" would overflow it and
  // partially reveal the next slide when swiping. Falls back to
  // SCREEN_WIDTH only until the first layout pass reports the real width.
  const [carouselWidth, setCarouselWidth] = useState(SCREEN_WIDTH);

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
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setActiveIndex(index);
  };
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);

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
      <View onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
        >
          {images.map((img, index) => (
            <TaggableImage
              key={index}
              imageUri={img.image_url}
              tags={post.tags?.filter((t) => t.image_id === img.id)}
              onDoubleTap={toggleLike}
              imageStyle={[styles.postImage, { width: carouselWidth }]}
              colors={colors}
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

      <PostActions
        post={post}
        currentUserId={currentUserId}
        commentCount={comments.length}
        likeCount={likeCount}
        isLiked={isLiked}
        toggleLike={toggleLike}
        onCommentPress={() => setShowComments(true)}
        onLikeCountPress={() => {
          fetchLikers();
          setShowLikers(true);
        }}
        colors={colors}
        styles={styles}
      />
      <View style={styles.postFooter}>
        {post.description && (
          <ExpandableCaption
            text={post.description}
            textStyle={styles.postDescription}
            moreStyle={styles.moreText}
          />
        )}
        <Text style={styles.postInfo}>
          {isOwnPost ? "Your Post" : `${postUser?.name}'s post`} -{" "}
          {formatDate(post.post_date)}
        </Text>
      </View>
      <CommentsSheet
        postId={post.id}
        postOwnerId={post.user_id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
      <LikersSheet
        likers={likers}
        isLoading={isLoadingLikers}
        visible={showLikers}
        onClose={() => setShowLikers(false)}
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
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);

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

export const ProfilePostCard = ({
  post,
  currentUserId,
  onPress,
}: HaulPostCardProps & { onPress: () => void }) => {
  const firstImage = post.images?.[0]?.image_url ?? post.image_url;
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);

  return (
    <View style={styles.explorePostContainer}>
      <TouchableOpacity onPress={onPress}>
        <View style={{ width: ITEM_SIZE, height: ITEM_SIZE }}>
          <Image
            cachePolicy="memory-disk"
            source={{ uri: firstImage }}
            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.explorePostGradient}
          >
            <Text style={styles.explorePostBadgeText}>
              {post.is_public ? "Public" : "Private"}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const ModalPostCard = ({
  post,
  currentUserId,
  onNavigateAway,
  onOpenComments,
  onOpenLikers,
}: PostCardProps & {
  onNavigateAway: () => void;
  onOpenComments: (postId: string, postOwnerId: string) => void;
  onOpenLikers: (postId: string) => void;
}) => {
  const {
    likeCount,
    isLiked,
    toggleLike,
    likers,
    isLoadingLikers,
    fetchLikers,
  } = useLikes(post.id, currentUserId);
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [showComments, setShowComments] = useState(false);
  const { comments } = useComments(post.id);
  const [showLikers, setShowLikers] = useState(false);
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);
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
          <TaggableImage
            imageUri={post.image_url}
            tags={post.tags}
            onDoubleTap={toggleLike}
            imageStyle={styles.postImage}
            colors={colors}
          />
        </DoubleTapButton>
        <PostActions
          post={post}
          currentUserId={currentUserId}
          commentCount={comments.length}
          likeCount={likeCount}
          isLiked={isLiked}
          toggleLike={toggleLike}
          onCommentPress={() => onOpenComments(post.id, post.user_id)}
          onLikeCountPress={() => onOpenLikers(post.id)}
          colors={colors}
          styles={styles}
        />
      </View>
      <View style={styles.postFooter}>
        {post.description && (
          <ExpandableCaption
            text={post.description}
            textStyle={styles.postDescription}
            moreStyle={styles.moreText}
          />
        )}
        <Text style={styles.postInfo}>
          {isOwnPost ? "Your Post" : `${postUser?.name}'s post`} -{" "}
          {formatDate(post.post_date)}
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
  onOpenLikers,
}: HaulPostCardProps & {
  onNavigateAway: () => void;
  onOpenComments: (postId: string, postOwnerId: string) => void;
  onOpenLikers: (postId: string) => void;
}) => {
  if (post.isoutfit_post) {
    return;
  }
  const {
    likeCount,
    isLiked,
    toggleLike,
    likers,
    isLoadingLikers,
    fetchLikers,
  } = useLikes(post.id, currentUserId);
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const { comments } = useComments(post.id);
  const [showLikers, setShowLikers] = useState(false);
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);
  const lastTap = useRef(0);
  // Same fix as HaulPostCard — measure the real viewport instead of trusting
  // Dimensions.get("window"), since the modal's carousel may not be exactly
  // screen-width once its own padding/margins are applied.
  const [carouselWidth, setCarouselWidth] = useState(SCREEN_WIDTH);

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
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
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
      <View onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
        >
          {images.map((img, index) => (
            <TaggableImage
              key={index}
              imageUri={img.image_url}
              tags={post.tags?.filter((t) => t.image_id === img.id)}
              onDoubleTap={toggleLike}
              imageStyle={[
                styles.postImage,
                { width: carouselWidth, aspectRatio: 1 },
              ]}
              colors={colors}
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

      <PostActions
        post={post}
        currentUserId={currentUserId}
        commentCount={comments.length}
        likeCount={likeCount}
        isLiked={isLiked}
        toggleLike={toggleLike}
        onCommentPress={() => onOpenComments(post.id, post.user_id)}
        onLikeCountPress={() => onOpenLikers(post.id)}
        colors={colors}
        styles={styles}
      />
      <View style={styles.postFooter}>
        {post.description && (
          <ExpandableCaption
            text={post.description}
            textStyle={styles.postDescription}
            moreStyle={styles.moreText}
          />
        )}
        <Text style={styles.postInfo}>
          {isOwnPost ? "Your Post" : `${postUser?.name}'s post`} -{" "}
          {formatDate(post.post_date)}
        </Text>
      </View>
    </View>
  );
};

// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    explorePostContainer: {
      backgroundColor: colors.background,
      overflow: "hidden",
      marginBottom: 2,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
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
      color: colors.text, // mapped to colors object
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
      color: colors.textMuted,
    },
    moreText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 2,
    },
    timeRemainingBadge: {
      backgroundColor: colors.primary,
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
      padding: 12,
      marginTop: -10,
      backgroundColor: colors.background,
    },
    postContainer: {
      backgroundColor: colors.background,
      overflow: "hidden",
      marginBottom: 0,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    postDescription: {
      fontSize: 15,
      color: colors.text,
      marginBottom: 8,
      marginTop: -4,
      lineHeight: 20,
    },
    postInfo: {
      marginTop: -6,
      fontSize: 14,
      color: colors.textMuted,
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
      marginBottom: -22,
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
      color: colors.text,
    },
    explorePostBadge: {
      position: "absolute",
      bottom: 6,
      left: 6,
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    explorePostGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: ITEM_SIZE / 2,
      justifyContent: "flex-end",
      paddingBottom: 6,
      paddingLeft: 6,
    },
    explorePostBadgeText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });
