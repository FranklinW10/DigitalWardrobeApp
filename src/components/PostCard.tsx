import { CommentsSheet } from "@/components/CommentSheet";
import { LikersSheet } from "@/components/LikerSheet";
import { StreakAvatar } from "@/components/StreakAvatar";
import { useTheme } from "@/context/ThemeContext";
import { useBlocks } from "@/hooks/useBlocks"; // or wherever you end up putting the provider
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { Post, PostTag } from "@/hooks/usePosts";
import { supabase } from "@/lib/supabase/client";
import { Alert } from "react-native";

import { formatDate, formatTimeAgo } from "@/lib/date-helper";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { ReportModal } from "@/components/reportModal";
import {
  Dimensions,
  GestureResponderEvent,
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
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
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
          top: top - 40,
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
  // Captured once at the start of each pinch — the baseline we compose on top of.
  const startScale = useSharedValue(1);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);
  // Focal point (relative to container center) at gesture start.
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  // Captured at the start of each pan.
  const panStartTranslateX = useSharedValue(0);
  const panStartTranslateY = useSharedValue(0);
  const clampTranslate = (
    tx: number,
    ty: number,
    s: number,
  ): { x: number; y: number } => {
    "worklet";
    const maxTranslateX = (containerSize.width * (s - 1)) / 2;
    const maxTranslateY = (containerSize.height * (s - 1)) / 2;
    return {
      x: Math.max(-maxTranslateX, Math.min(maxTranslateX, tx)),
      y: Math.max(-maxTranslateY, Math.min(maxTranslateY, ty)),
    };
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin((e) => {
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
      startFocalX.value = e.focalX - containerSize.width / 2;
      startFocalY.value = e.focalY - containerSize.height / 2;
    })
    .onUpdate((e) => {
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(startScale.value * e.scale, MAX_SCALE),
      );
      scale.value = newScale;

      const focalX = e.focalX - containerSize.width / 2;
      const focalY = e.focalY - containerSize.height / 2;

      // Point in image space that was under the fingers when the pinch began.
      const anchorX =
        (startFocalX.value - startTranslateX.value) / startScale.value;
      const anchorY =
        (startFocalY.value - startTranslateY.value) / startScale.value;

      // Keep that same image point under the (possibly moved) current focal point.
      const nextX = focalX - anchorX * newScale;
      const nextY = focalY - anchorY * newScale;

      const clamped = clampTranslate(nextX, nextY, newScale);
      translateX.value = clamped.x;
      translateY.value = clamped.y;

      if (newScale > 1 && !isZoomed) {
        runOnJS(setIsZoomed)(true);
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      runOnJS(setIsZoomed)(false);
    });

  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onBegin(() => {
      panStartTranslateX.value = translateX.value;
      panStartTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const clamped = clampTranslate(
        panStartTranslateX.value + e.translationX,
        panStartTranslateY.value + e.translationY,
        scale.value,
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      runOnJS(setIsZoomed)(false);
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
const HEART_SIZE = 90;

export function DoubleTapButton({
  onDoubleTap,
  onSingleTap,
  isLiked,
  children,
}: any) {
  const lastTap = useRef(0);
  const singleTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Heart burst: scales up past 1, settles back down, then fades out — same
  // beat as Instagram's like animation. Position now tracks the actual tap
  // location instead of always being centered.
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartX = useSharedValue(0);
  const heartY = useSharedValue(0);
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);

  const playHeartBurst = (x: number, y: number) => {
    heartX.value = x - HEART_SIZE / 2;
    heartY.value = y - HEART_SIZE / 2;
    heartScale.value = 0;
    heartOpacity.value = 0;
    heartScale.value = withSequence(
      withSpring(1.15, { damping: 9, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 350 }),
      withDelay(350, withTiming(0, { duration: 250 })),
    );
  };

  const heartStyle = useAnimatedStyle(() => ({
    left: heartX.value,
    top: heartY.value,
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const handlePress = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      lastTap.current = 0;
      if (singleTapTimeout.current) {
        clearTimeout(singleTapTimeout.current);
        singleTapTimeout.current = null;
      }
      // Always show the heart on a double tap (matches Instagram — tapping
      // an already-liked post still bursts a heart), but only fire the
      // like callback if the post isn't already liked, so this can never
      // unlike it.
      playHeartBurst(locationX, locationY);
      if (!isLiked) {
        onDoubleTap?.();
      }
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
      <Animated.View
        style={[heartstyles.heart, heartStyle]}
        pointerEvents="none"
      >
        <Ionicons
          name="heart"
          size={HEART_SIZE}
          color={colors.accent}
          style={heartstyles.heartShadow}
        />
      </Animated.View>
    </Pressable>
  );
}

const heartstyles = StyleSheet.create({
  heart: {
    position: "absolute",
    width: HEART_SIZE,
    height: HEART_SIZE,
  },
  heartShadow: {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});

const Heartstyles = StyleSheet.create({
  heartWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  heartShadow: {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
const MAX_SEARCH_ITERATIONS = 12;
const SETTLE_RECHECK_DELAY = 400; // ms — long enough to clear virtualization/layout
// timing glitches, short enough nobody notices a caption "fixing itself"

const ExpandableCaption1 = ({
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
  // Bumping this forces a full re-run of the truncation search — used for
  // the one-time settle recheck below, and could be reused elsewhere later.
  const [remeasureGen, setRemeasureGen] = useState(0);

  const resetSearch = () => {
    setCheckedFullText(false);
    setNeedsExpansion(false);
    setTruncateAt(null);
    setSettled(false);
    bounds.current = { low: 0, high: text.length };
    iterations.current = 0;
  };

  useEffect(() => {
    resetSearch();
  }, [text]);

  useEffect(() => {
    // The very first measurement can land before the surrounding list/
    // header layout has actually settled (virtualization, animated header
    // height, etc.), locking in a wrong truncation that never gets
    // rechecked. This forces one guaranteed second pass once things have
    // had a moment to stabilize — cheap, and only runs once per mount.
    const timeout = setTimeout(() => {
      resetSearch();
      setRemeasureGen((g) => g + 1);
    }, SETTLE_RECHECK_DELAY);
    return () => clearTimeout(timeout);
  }, []);

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
        key={`full-${remeasureGen}`}
        style={textStyle}
        onTextLayout={(e) => {
          const overflows = e.nativeEvent.lines.length > 2;
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
      key={`search-${remeasureGen}`}
      style={textStyle}
      onTextLayout={(e) => {
        if (settled) return;
        iterations.current += 1;

        const { low, high } = bounds.current;
        const fits = e.nativeEvent.lines.length <= 1;

        if (high - low <= 1) {
          setSettled(true);
          return;
        }

        if (iterations.current >= MAX_SEARCH_ITERATIONS) {
          setSettled(true);
          if (truncateAt !== low) {
            setTruncateAt(low);
          }
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

const styles1 = StyleSheet.create({
  measureHidden: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
  },
});

// Static styles for ExpandableCaption — not theme-dependent, so this
// doesn't need to live inside createStyles(colors).
const captionStyles1 = StyleSheet.create({
  moreOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    paddingLeft: 24,
  },
});
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
  const [truncateAt, setTruncateAt] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const bounds = useRef({ low: 0, high: text.length });
  const iterations = useRef(0);

  useEffect(() => {
    // Reset on text change
    setTruncateAt(null);
    setSettled(false);
    bounds.current = { low: 0, high: text.length };
    iterations.current = 0;

    // Fallback: force settle if measurement doesn't happen
    const timeout = setTimeout(() => {
      setSettled(true);
    }, 500);

    return () => clearTimeout(timeout);
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

  if (!settled) {
    return (
      <View>
        <View style={captionStyles.skeletonLine} />
        {/* Measure hidden, don't show until done */}
        <Text
          style={[textStyle, styles.measureHidden]}
          onTextLayout={(e) => {
            // First measurement: does it need truncating?
            if (truncateAt === null) {
              const overflows = e.nativeEvent.lines.length > 2;
              if (!overflows) {
                setSettled(true);
                return;
              }
              // Start binary search
              const mid = Math.floor(text.length / 2);
              bounds.current = { low: 0, high: text.length };
              setTruncateAt(mid);
              return;
            }

            // Binary search: adjust and continue
            const { low, high } = bounds.current;
            const fits = e.nativeEvent.lines.length <= 1;

            if (
              high - low <= 1 ||
              iterations.current >= MAX_SEARCH_ITERATIONS
            ) {
              setSettled(true);
              return;
            }

            iterations.current += 1;
            const newBounds = fits
              ? { low: truncateAt, high }
              : { low, high: truncateAt };
            bounds.current = newBounds;
            const mid = Math.floor((newBounds.low + newBounds.high) / 2);
            setTruncateAt(mid);
          }}
        >
          {truncateAt !== null
            ? text.slice(0, truncateAt).trimEnd() + "… more"
            : text}
        </Text>
      </View>
    );
  }

  // Settled: show final result
  if (truncateAt === null) {
    return <Text style={textStyle}>{text}</Text>;
  }

  const candidate = text.slice(0, truncateAt).trimEnd();
  return (
    <Text style={textStyle}>
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

const captionStyles = StyleSheet.create({
  moreOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    paddingLeft: 24,
  },

  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: "rgba(128,128,128,0.2)",
    marginBottom: 6,
    width: "90%",
  },
  skeletonLineShort: {
    width: "55%",
    marginBottom: 0,
  },
});

const LikeButton = ({
  likeCount,
  isLiked,
  toggleLike,
  onLikeCountPress,
  isLoadingLikeCount,
  colors,
  styles, // <-- Receive styles here
}: {
  likeCount: number;
  isLiked: boolean;
  toggleLike: () => void;
  onLikeCountPress: () => void;
  isLoadingLikeCount?: boolean;
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
      {isLoadingLikeCount ? (
        <View style={styles.likeCountSkeleton} />
      ) : (
        <TouchableOpacity onPress={onLikeCountPress}>
          <Text style={styles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  </View>
);

// Replace getStreakColor with a two-color gradient per tier
const getStreakGradient = (streak: number): [string, string] => {
  if (streak >= 60) return ["#4FE3FF", "#0066FF"]; // electric blue — legendary
  if (streak >= 30) return ["#D9B3FF", "#7B2FF7"]; // purple — epic
  if (streak >= 14) return ["#FF8A8A", "#FF3B30"]; // red — hot
  if (streak >= 7) return ["#FFB35C", "#FF6B35"]; // red-orange — warm
  return ["#FFD866", "#FF9500"]; // orange — just starting
};

const PostActions = ({
  post,
  commentCount,
  likeCount,
  isLiked,
  toggleLike,
  onCommentPress,
  onLikeCountPress,
  isLoadingLikeCount,
  isLoadingCommentCount,
  colors,
  styles, // <-- Receive styles here
  streak,
}: any) => {
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const streakOpacity = useSharedValue(0);

  const streakBubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: streakOpacity.value,
    transform: [
      {
        translateY: interpolate(streakOpacity.value, [0, 1], [10, 0]),
      },
    ],
  }));
  return (
    <View style={styles.actions}>
      <LikeButton
        likeCount={likeCount}
        isLiked={isLiked}
        toggleLike={toggleLike}
        onLikeCountPress={onLikeCountPress}
        isLoadingLikeCount={isLoadingLikeCount}
        colors={colors}
        styles={styles} // <-- Pass down
      />
      <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
        <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
        {isLoadingCommentCount ? (
          <View style={styles.likeCountSkeleton} />
        ) : (
          <TouchableOpacity onPress={onCommentPress}>
            <Text style={styles.actionCount}>{commentCount}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {streak >= 3 && (
        <TouchableOpacity
          onPress={() => {
            setShowStreakInfo(true);

            streakOpacity.value = withTiming(1, {
              duration: 250,
            });

            setTimeout(() => {
              streakOpacity.value = withTiming(0, {
                duration: 400,
              });

              setTimeout(() => {
                setShowStreakInfo(false);
              }, 400);
            }, 3000);
          }}
          style={styles.streakContainer}
        >
          {showStreakInfo && (
            <Animated.View style={streakBubbleAnimatedStyle}>
              <LinearGradient
                colors={getStreakGradient(streak)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.streakBubble,
                  { shadowColor: getStreakGradient(streak)[0] },
                ]}
              >
                <Text style={styles.streakBubbleText}>
                  @{post.profiles.username} has Posted their Fit {streak} days
                  in a row
                </Text>
              </LinearGradient>
            </Animated.View>
          )}
          <LinearGradient
            colors={getStreakGradient(streak)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.streakBadge,
              { shadowColor: getStreakGradient(streak)[0] },
            ]}
          >
            <Ionicons name="flame-outline" size={20} color="#fff" />
            <Text style={styles.streakText}>{streak}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      <View style={{ marginLeft: "auto" }}>
        <SaveButton postId={post.id} color={colors.text} />
      </View>
    </View>
  );
};

export const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const { comments, commentCount, isLoadingCommentCount } = useComments(
    post.id,
  );
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
    isLoadingLikeCount,
  } = useLikes(post.id, currentUserId);
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);
  const [showReportModal, setShowReportModal] = useState(false);
  const { blockUser } = useBlocks();
const handlePostOptions = (post: Post) => {
  const options = [
    {
      text: post.is_public ? "Switch to archive" : "Switch to Public",
      onPress: async () => {
        const { error } = await supabase
          .from("posts")
          .update({ is_public: !post.is_public })
          .eq("id", post.id);

        if (error) {
          Alert.alert("Error", "Failed to update post. Please try again.");
          return;
        }

        Alert.alert(
          "Success",
          post.is_public
            ? "Your post has been switched to archive."
            : "Your post has been switched to public.",
        );
      },
    },
    {
      text: "Delete Post",
      style: "destructive" as const,
      onPress: async () => {
        const { error } = await supabase
          .from("posts")
          .update({ is_active: false })
          .eq("id", post.id);

        if (error) {
          Alert.alert("Error", "Failed to delete post. Please try again.");
          return;
        }

                setTimeout(() => {
          Alert.alert(
            "Success",
            post.is_public
              ? "Your post has been switched to archive."
              : "Your post has been switched to public.",
          );
        }, 300);
      },
    },
    {
      text: "Cancel",
      style: "cancel" as const,
    },
  ];

  Alert.alert("Post Options", "", options);
};

const handleOldPostOptions = (post: Post) => {
  const options = [
    {
      text: "Delete Post",
      style: "destructive" as const,
      onPress: async () => {
        const { error } = await supabase
          .from("posts")
          .update({ is_active: false })
          .eq("id", post.id);

        if (error) {
          Alert.alert("Error", "Failed to delete post. Please try again.");
          return;
        }

        Alert.alert("Success", "Your post has been deleted. It may take a second to disappear");
      },
    },
    {
      text: "Cancel",
      style: "cancel" as const,
    },
  ];

  Alert.alert("Post Options", "", options);
};

  const handleOptionsPress = () => {
    isOwnPost
      ? post.ispostedontime === false
        ? handleOldPostOptions(post)
        : handlePostOptions(post)
      : Alert.alert("Post Options", "", [
          {
            text: "Report Post",
            onPress: () => setShowReportModal(true),
          },
          {
            text: "Block User",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Block this user?",
                `You won't see posts from @${postUser?.username} anymore.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Block",
                    style: "destructive",
                    onPress: () => blockUser(post.user_id),
                  },
                ],
              );
            },
          },
          { text: "Cancel", style: "cancel" },
        ]);
  };

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
              <StreakAvatar
                uri={postUser?.profile_image_url}
                initial={postUser?.username?.[0]?.toUpperCase() || "U"}
                streak={postUser?.streak ?? 0}
                size={40}
                colors={colors}
              />

              <View>
                <Text style={styles.username}>
                  {isOwnPost ? "You" : `@${postUser?.username}`}
                </Text>
                <Text style={styles.timeAgo}>
                  {formatTimeAgo(post.created_at)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.postOptions}
                hitSlop={15}
                onPress={handleOptionsPress}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                targetType="post"
                targetId={post.id}
              />
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
          commentCount={commentCount}
          likeCount={likeCount}
          isLiked={isLiked}
          toggleLike={toggleLike}
          onCommentPress={() => setShowComments(true)}
          onLikeCountPress={() => {
            fetchLikers();
            setShowLikers(true);
          }}
          isLoadingLikeCount={isLoadingLikeCount}
          isLoadingCommentCount={isLoadingCommentCount}
          colors={colors}
          styles={styles}
          streak={post.streak ?? 0}
        />
      </View>
      <View style={styles.postFooter}>
        {post.description && (
          <ExpandableCaption1
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
  const { comments, commentCount, isLoadingCommentCount } = useComments(
    post.id,
  );
  const {
    likeCount,
    isLiked,
    toggleLike,
    likers,
    isLoadingLikers,
    fetchLikers,
    isLoadingLikeCount,
  } = useLikes(post.id, currentUserId);
  const [showLikers, setShowLikers] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { blockUser } = useBlocks();

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
  const handlePostOptions = (post: Post) => {
    const options = [
      {
        text: post.is_public ? "Switch to archive" : "Switch to Public",
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_public: !post.is_public })
            .eq("id", post.id);
        },
      },
      {
        text: "Delete Post",
        style: "destructive" as const,
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_active: false })
            .eq("id", post.id);
        },
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Post Options", "", options);
  };
  const handleOldPostOptions = (post: Post) => {
    const options = [
      {
        text: "Delete Post",
        style: "destructive" as const,
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_active: false })
            .eq("id", post.id);
        },
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Post Options", "", options);
  };
  const handleOptionsPress = () => {
    isOwnPost
      ? post.ispostedontime === false
        ? handleOldPostOptions(post)
        : handlePostOptions(post)
      : Alert.alert("Post Options", "", [
          {
            text: "Report Post",
            onPress: () => setShowReportModal(true),
          },
          {
            text: "Block User",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Block this user?",
                `You won't see posts from @${postUser?.username} anymore.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Block",
                    style: "destructive",
                    onPress: () => blockUser(post.user_id),
                  },
                ],
              );
            },
          },
          { text: "Cancel", style: "cancel" },
        ]);
  };

  return (
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
            <StreakAvatar
              uri={postUser?.profile_image_url}
              initial={postUser?.username?.[0]?.toUpperCase() || "U"}
              streak={postUser?.streak ?? 0}
              size={40}
              colors={colors}
            />
            <View>
              <Text style={styles.username}>
                {isOwnPost ? "You" : `@${postUser?.username}`}
              </Text>
              <Text style={styles.timeAgo}>
                {formatTimeAgo(post.created_at)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.postOptions}
              hitSlop={15}
              onPress={handleOptionsPress}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <ReportModal
              visible={showReportModal}
              onClose={() => setShowReportModal(false)}
              targetType="post"
              targetId={post.id}
            />
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
        commentCount={commentCount}
        likeCount={likeCount}
        isLiked={isLiked}
        toggleLike={toggleLike}
        isLoadingLikeCount={isLoadingLikeCount}
        isLoadingCommentCount={isLoadingCommentCount}
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
          <ExpandableCaption1
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
    isLoadingLikeCount,
  } = useLikes(post.id, currentUserId);
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [showComments, setShowComments] = useState(false);
  const { comments, commentCount, isLoadingCommentCount } = useComments(
    post.id,
  );
  const [showLikers, setShowLikers] = useState(false);
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);
  const [showReportModal, setShowReportModal] = useState(false);
  const { blockUser } = useBlocks();
  const handlePostOptions = (post: Post) => {
    const options = [
      {
        text: post.is_public ? "Switch to archive" : "Switch to Public",
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_public: !post.is_public })
            .eq("id", post.id);
        },
      },
      {
        text: "Delete Post",
        style: "destructive" as const,
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_active: false })
            .eq("id", post.id);
        },
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Post Options", "", options);
  };
  const handleOldPostOptions = (post: Post) => {
    const options = [
      {
        text: "Delete Post",
        style: "destructive" as const,
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_active: false })
            .eq("id", post.id);
        },
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Post Options", "", options);
  };

  const handleOptionsPress = () => {
    isOwnPost
      ? post.ispostedontime === false
        ? handleOldPostOptions(post)
        : handlePostOptions(post)
      : Alert.alert("Post Options", "", [
          {
            text: "Report Post",
            onPress: () => setShowReportModal(true),
          },
          {
            text: "Block User",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Block this user?",
                `You won't see posts from @${postUser?.username} anymore.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Block",
                    style: "destructive",
                    onPress: () => blockUser(post.user_id),
                  },
                ],
              );
            },
          },
          { text: "Cancel", style: "cancel" },
        ]);
  };
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
              <StreakAvatar
                uri={postUser?.profile_image_url}
                initial={postUser?.username?.[0]?.toUpperCase() || "U"}
                streak={postUser?.streak ?? 0}
                size={40}
                colors={colors}
              />

              <View>
                <Text style={styles.username}>
                  {isOwnPost ? "You" : `@${postUser?.username}`}
                </Text>
                <Text style={styles.timeAgo}>
                  {formatTimeAgo(post.created_at)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.postOptions}
                hitSlop={15}
                onPress={handleOptionsPress}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                targetType="post"
                targetId={post.id}
              />
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
          commentCount={commentCount}
          likeCount={likeCount}
          isLoadingLikeCount={isLoadingLikeCount}
          isLoadingCommentCount={isLoadingCommentCount}
          isLiked={isLiked}
          toggleLike={toggleLike}
          onCommentPress={() => onOpenComments(post.id, post.user_id)}
          onLikeCountPress={() => onOpenLikers(post.id)}
          colors={colors}
          styles={styles}
          streak={post.streak ?? 0}
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
    isLoadingLikeCount,
  } = useLikes(post.id, currentUserId);
  const postUser = post.profiles;
  const isOwnPost = post.user_id === currentUserId;
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const { comments, commentCount, isLoadingCommentCount } = useComments(
    post.id,
  );
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
  const handlePostOptions = (post: Post) => {
    const options = [
      {
        text: post.is_public ? "Switch to archive" : "Switch to Public",
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_public: !post.is_public })
            .eq("id", post.id);
        },
      },
      {
        text: "Delete Post",
        style: "destructive" as const,
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_active: false })
            .eq("id", post.id);
        },
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Post Options", "", options);
  };
  const handleOldPostOptions = (post: Post) => {
    const options = [
      {
        text: "Delete Post",
        style: "destructive" as const,
        onPress: async () => {
          await supabase
            .from("posts")
            .update({ is_active: false })
            .eq("id", post.id);
        },
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ];

    Alert.alert("Post Options", "", options);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setActiveIndex(index);
  };
  const [showReportModal, setShowReportModal] = useState(false);
  const { blockUser } = useBlocks();
  const handleOptionsPress = () => {
    isOwnPost
      ? post.ispostedontime === false
        ? handleOldPostOptions(post)
        : handlePostOptions(post)
      : Alert.alert("Post Options", "", [
          {
            text: "Report Post",
            onPress: () => setShowReportModal(true),
          },
          {
            text: "Block User",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Block this user?",
                `You won't see posts from @${postUser?.username} anymore.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Block",
                    style: "destructive",
                    onPress: () => blockUser(post.user_id),
                  },
                ],
              );
            },
          },
          { text: "Cancel", style: "cancel" },
        ]);
  };

  return (
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
            <StreakAvatar
              uri={postUser?.profile_image_url}
              initial={postUser?.username?.[0]?.toUpperCase() || "U"}
              streak={postUser?.streak ?? 0}
              size={40}
              colors={colors}
            />
            <View>
              <Text style={styles.username}>
                {isOwnPost ? "You" : `@${postUser?.username}`}
              </Text>
              <Text style={styles.timeAgo}>
                {formatTimeAgo(post.created_at)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.postOptions}
              hitSlop={15}
              onPress={handleOptionsPress}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <ReportModal
              visible={showReportModal}
              onClose={() => setShowReportModal(false)}
              targetType="post"
              targetId={post.id}
            />
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
        commentCount={commentCount}
        likeCount={likeCount}
        isLiked={isLiked}
        toggleLike={toggleLike}
        onCommentPress={() => onOpenComments(post.id, post.user_id)}
        onLikeCountPress={() => onOpenLikers(post.id)}
        isLoadingLikeCount={isLoadingLikeCount}
        isLoadingCommentCount={isLoadingCommentCount}
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
    streakBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 2,
      marginTop: -2,
    },
    streakText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#fff",
    },
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
      width: "100%",
      marginRight: 10,
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
      marginTop: -10,
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
    streakBubble: {
      position: "absolute",
      bottom: 15,
      backgroundColor: "rgba(0,0,0,0.85)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      left: -70,
      borderRadius: 12,
      width: 190,
      alignItems: "center",
      zIndex: 10,
      // iOS shadow
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      // Android
      elevation: 5,
    },
    postOptions: {
      marginLeft: "auto",

      marginTop: 4,

      // good idea to add if not already there, gives it a bigger tap target
    },

    streakBubbleText: {
      color: "#fff",
      fontSize: 12,
      textAlign: "center",
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
      marginBottom: 4,
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
    likeCountSkeleton: {
      width: 8,
      height: 14,
      borderRadius: 4,
      backgroundColor: colors.surface,
    },
    explorePostBadgeText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });
