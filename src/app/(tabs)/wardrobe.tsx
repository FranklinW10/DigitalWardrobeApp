import { CommentsSheet } from "@/components/CommentSheet";
import { LikersSheet } from "@/components/LikerSheet";
import { ModalHaulPostCard, ModalPostCard } from "@/components/PostCard";
import { StreakFireBadge } from "@/components/steakBadge";
import { useAuth } from "@/context/AuthContext";
import { useBlocks } from "@/context/BlocksContext";
import { useTheme } from "@/context/ThemeContext";
import { useLikes } from "@/hooks/useLikes";
import { Post } from "@/hooks/usePosts";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { useTags } from "@/hooks/useTags";
import { supabase } from "@/lib/supabase/client";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32) / 7);
const getStreakGradient = (streak: number): [string, string] => {
  if (streak >= 60) return ["#4FE3FF", "#0066FF"];
  if (streak >= 30) return ["#D9B3FF", "#7B2FF7"];
  if (streak >= 14) return ["#FF8A8A", "#FF3B30"];
  if (streak >= 7) return ["#FFB35C", "#FF6B35"];
  return ["#FFD866", "#FF9500"];
};

export const getStreakPostIds = (posts: Post[]) => {
  const streakPostIds = new Set<string>();

  const outfitPosts = posts.filter((p) => p.isoutfit_post);

  for (const post of outfitPosts) {
    const streak = Number(post.streak);

    if (!streak || streak < 3) continue;

    const postDate = new Date(post.created_at);

    for (let i = 0; i < streak; i++) {
      const streakDate = new Date(postDate);
      streakDate.setDate(postDate.getDate() - i);

      const matchingPost = outfitPosts.find((p) => {
        const pDate = new Date(p.created_at);

        return (
          pDate.getFullYear() === streakDate.getFullYear() &&
          pDate.getMonth() === streakDate.getMonth() &&
          pDate.getDate() === streakDate.getDate()
        );
      });

      if (matchingPost) {
        streakPostIds.add(matchingPost.id);
      }
    }
  }

  return streakPostIds;
};

export const isStreakEnd = (post: Post, posts: Post[]) => {
  if (!post.streak || post.streak < 3) return false;

  const postDate = new Date(post.created_at);
  const nextDay = new Date(postDate);
  nextDay.setDate(postDate.getDate() + 1);

  const hasContinuation = posts.some((p) => {
    if (!p.isoutfit_post || !p.streak) return false;
    const pDate = new Date(p.created_at);
    return (
      pDate.getFullYear() === nextDay.getFullYear() &&
      pDate.getMonth() === nextDay.getMonth() &&
      pDate.getDate() === nextDay.getDate() &&
      p.streak === post.streak + 1
    );
  });

  return !hasContinuation;
};

const MonthBlock = ({
  month,
  year,
  postByDay,
  onSelectPost,
  onSelectEmptyDay,
  isStreakPost,
  streakEndIds,
}: {
  month: number;
  year: number;
  postByDay: Record<number, Post>;
  onSelectPost: (post: Post) => void;
  onSelectEmptyDay: (date: Date) => void;
  isStreakPost: (post: Post) => boolean;
  streakEndIds: Set<string>;
}) => {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [labelsHeight, setLabelsHeight] = useState(0);

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const cells = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.monthBlock}>
      <Text style={styles.monthTitle}>
        {MONTHS[month]} {year}
      </Text>

      <View style={{ position: "relative" }}>
        <View
          style={styles.dayLabelsRow}
          onLayout={(e) => setLabelsHeight(e.nativeEvent.layout.height)}
        >
          {DAYS.map((d) => (
            <Text key={d} style={styles.dayLabel}>
              {d}
            </Text>
          ))}
        </View>

        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {[...row, ...Array(7 - row.length).fill(null)].map((day, ci) => (
              <TouchableOpacity
                key={ci}
                style={[styles.cell, { position: "relative" }]}
                onPress={() => {
                  if (day && postByDay[day]) {
                    onSelectPost(postByDay[day]);
                  }
                  if (day && !postByDay[day]) {
                    onSelectEmptyDay(new Date(year, month, day));
                  }
                }}
                disabled={!day}
              >
                {day !== null && (
                  <View style={styles.imageWrapper}>
                    {postByDay[day] ? (
                      isStreakPost(postByDay[day]) ? (
                        <LinearGradient
                          colors={getStreakGradient(
                            Number(postByDay[day].streak),
                          )}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.streakThumbWrapper]}
                        >
                          <Image
                            source={{
                              uri:
                                postByDay[day].images?.[0]?.image_url ??
                                postByDay[day].image_url,
                            }}
                            style={styles.streakThumbImage}
                          />
                        </LinearGradient>
                      ) : (
                        <Image
                          source={{
                            uri:
                              postByDay[day].images?.[0]?.image_url ??
                              postByDay[day].image_url,
                          }}
                          style={[
                            styles.dayThumb,
                            isToday(day) && styles.todayThumb,
                          ]}
                          contentFit="cover"
                        />
                      )
                    ) : (
                      <View
                        style={[
                          styles.dayCircle,
                          isToday(day) && styles.todayCircle,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isToday(day) && styles.todayText,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {rows.map((row, ri) =>
          row.map((day, ci) => {
            if (!day || !postByDay[day] || !streakEndIds.has(postByDay[day].id))
              return null;
            return (
              <View
                key={`badge-${ri}-${ci}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 8 + ci * CELL_SIZE + CELL_SIZE - 3,
                  top: labelsHeight + ri * CELL_SIZE + CELL_SIZE - 6,
                  zIndex: 50,
                }}
              >
                <StreakFireBadge streak={postByDay[day].streak} />
              </View>
            );
          }),
        )}
      </View>
    </View>
  );
};

export default function WardrobeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<
    "wardrobe" | "hauls" | "Saved" | "Tags"
  >("wardrobe");
  const savedScrollRef = useRef<ScrollView>(null);
  const tabsTranslateY = useRef(new Animated.Value(0)).current;
  const tabsOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const tabsHidden = useRef(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedTagPost, setSelectedTagPost] = useState<Post | null>(null);

  const [selectedWardrobePost, setSelectedWardrobePost] = useState<Post | null>(
    null,
  );
  const calendarScrollRef = useRef<ScrollView>(null); // Fits/calendar page scroll
  const haulsScrollRef = useRef<ScrollView>(null); // Hauls page scroll
  const tabScrollRef = useRef<ScrollView>(null); // tab pager
  const [haulPosts, setHaulPosts] = useState<Post[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [collectionPreviews, setCollectionPreviews] = useState<
    Record<string, string[]>
  >({});

  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | null>(
    null,
  );
  const { tags, loadUserTags, loadPostsWithTag, toggleFavoriteTag, deleteTag } =
    useTags();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const {
    collections,
    loadCollections,
    createCollection,
    loadPostsInCollection,
  } = useSavedPosts();
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [selectedCollectionName, setSelectedCollectionName] =
    useState<string>("");
  const [collectionPosts, setCollectionPosts] = useState<Post[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isLoadingCollectionPosts, setIsLoadingCollectionPosts] =
    useState(false);
  const [tagPosts, setTagPosts] = useState<Post[]>([]);
  const [isLoadingTagPosts, setIsLoadingTagPosts] = useState(false);
  useEffect(() => {
    if (activeTab === "Saved") {
      loadCollections();
      loadCollectionPreviews();
    }
    if (activeTab === "Tags") {
      loadUserTags();
    }
  }, [activeTab]);
  const [likerPostId, setLikerPostId] = useState<string | null>(null);
  const { fetchLikers, isLoadingLikers, likers } = useLikes(likerPostId || "");

  useEffect(() => {
    if (likerPostId) {
      fetchLikers();
    }
  }, [likerPostId, fetchLikers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserTags();
    setRefreshing(false);
  };

  const handleCreateTag = () => {
    router.push({
      pathname: "/(profile)/newTag",
    });
  };

  const handleOpenCollection = async (id: string, name: string) => {
    setSelectedCollectionId(id);
    setSelectedCollectionName(name);
    setIsLoadingCollectionPosts(true);
    try {
      const posts = await loadPostsInCollection(id);
      setCollectionPosts(posts);
    } finally {
      setIsLoadingCollectionPosts(false);
    }
  };

  const handleOpenTag = async (id: string, name: string | null) => {
    setSelectedTagId(id);
    setSelectedCollectionName(name || "");
    setIsLoadingTagPosts(true);
    try {
      const posts = await loadPostsWithTag(id);
      setTagPosts(posts);
    } finally {
      setIsLoadingTagPosts(false);
    }
  };

  const renderTagPost = ({ item }: { item: Post }) => (
    <TouchableOpacity onPress={() => setSelectedTagPost(item)}>
      <Image
        source={{ uri: item.images?.[0]?.image_url ?? item.image_url }}
        style={styles.savedGridImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </TouchableOpacity>
  );
  const renderSavedPost = ({ item }: { item: Post }) => (
    <TouchableOpacity onPress={() => setSelectedPost(item)}>
      <Image
        source={{ uri: item.images?.[0]?.image_url ?? item.image_url }}
        style={styles.savedGridImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </TouchableOpacity>
  );
  const { blockedIds, blockedByIds, loading: blocksLoading } = useBlocks();

  useEffect(() => {
    if (blocksLoading) return; // Wait for blocks to load
    loadCollectionPreviews();
  }, [blocksLoading, user]);

  const loadCollectionPreviews = async () => {
    if (!user) return;

    const allBlockedIds = Array.from(new Set([...blockedIds, ...blockedByIds]));

    const { data, error } = await supabase
      .from("saved_posts")
      .select(
        `
      collection_id,
      posts(
        user_id,
        image_url,
        images(
          image_url
        )
      )
    `,
      )
      .eq("user_id", user.id)
      .limit(100);

    if (error) {
      console.error(error);
      return;
    }

    const previews: Record<string, string[]> = {};

    data?.forEach((item: any) => {
      if (allBlockedIds.includes(item.posts?.user_id)) return;

      const image = item.posts?.images?.[0]?.image_url ?? item.posts?.image_url;

      if (!image) return;

      if (!previews[item.collection_id]) {
        previews[item.collection_id] = [];
      }

      if (previews[item.collection_id].length < 4) {
        previews[item.collection_id].push(image);
      }
    });

    setCollectionPreviews(previews);
  };
  const userActivePost = (posts ?? []).find(
    (post) =>
      post.user_id === user?.id &&
      post.is_active &&
      post.is_post_today &&
      post.isoutfit_post,
  );

  const hasActivePost = !!userActivePost;
  useEffect(() => {
    loadPosts();
  }, [user?.id]);

  const haulImages = haulPosts.flatMap((post) =>
    (post.images ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((img) => ({ ...img, post })),
  );
  const groupedByMonth = haulImages.reduce<Record<string, typeof haulImages>>(
    (acc, img) => {
      const date = new Date(img.post.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(img);
      return acc;
    },
    {},
  );

  const monthGroups = Object.entries(groupedByMonth).map(([key, images]) => {
    const [year, month] = key.split("-").map(Number);
    return { year, month, images };
  });

  const loadPosts = async () => {
    if (!user?.id) return;
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*, profiles(*), images(*)")
        .eq("isoutfit_post", true)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("post_date", { ascending: false });
      if (postsError) throw postsError;
      setPosts(postsData ?? []);
      const { data: haulData } = await supabase
        .from("posts")
        .select("*, profiles(*), images(*)")
        .eq("isoutfit_post", false)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setHaulPosts(haulData ?? []);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const ownPosts = posts.filter((p) => p.user_id === user?.id);

  // Generate last 12 months + next 1 month
  const startYear = 2026;
  const startMonth = 3; // June (0-indexed)

  const today = new Date();
  const monthsCount =
    (today.getFullYear() - startYear) * 12 +
    (today.getMonth() - startMonth) +
    1;

  const months = Array.from({ length: monthsCount }, (_, i) => {
    const d = new Date(startYear, startMonth, 1);
    d.setMonth(d.getMonth() + i);
    return { month: d.getMonth(), year: d.getFullYear() };
  });
  const getPostByDay = (month: number, year: number) =>
    ownPosts.reduce<Record<number, Post>>((acc, p) => {
      const [y, m, d] = p.post_date.split("-").map(Number);
      if (m - 1 === month && y === year) {
        acc[d] = p;
      }
      return acc;
    }, {});

  const sheetY = useRef(new Animated.Value(40)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  const showTabs = () => {
    if (!tabsHidden.current) return;
    tabsHidden.current = false;
    Animated.parallel([
      Animated.timing(tabsTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(tabsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };
  useEffect(() => {
    if (showModal) {
      sheetY.setValue(40);
      sheetOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(sheetY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
          mass: 0.9,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showModal]);

  const closeModal = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 40,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModal(false);
      onDone?.();
    });
  };

  const hideTabs = () => {
    if (tabsHidden.current) return;
    tabsHidden.current = true;
    Animated.parallel([
      Animated.timing(tabsTranslateY, {
        toValue: -80,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(tabsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };
  const handleCalendarScroll = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (currentY <= 0) {
      showTabs();
    } else if (diff > 6) {
      hideTabs();
    } else if (diff < -6) {
      showTabs();
    }

    lastScrollY.current = currentY;
  };
  const handleSelectEmptyDay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date > today) return; // block future dates
    if (date.getTime() === today.getTime()) {
      router.push({ pathname: "/(post)/fit" });
      return; // ← stop here
    }
    router.push({
      pathname: "/(post)/fitArchive",
      params: { postDate: date.toISOString() },
    });
  };

  // Whenever the active tab changes — whether from tapping the pill or
  // swiping the pager — jump the newly-visible page straight to its bottom.
  useEffect(() => {
    // Reset the floating-tab scroll tracker so switching tabs doesn't get
    // compared against the OTHER page's last scroll position.
    lastScrollY.current = 0;
    showTabs();

    const targetRef =
      activeTab === "wardrobe" ? calendarScrollRef : haulsScrollRef;
    // Slight delay lets the newly-focused page finish laying out first,
    // otherwise scrollToEnd can fire before it knows its true content height.
    const timeout = setTimeout(() => {
      targetRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  const handleOpenLikers = (postId: string) => {
    setLikerPostId(postId);
    // fetchLikers will be called by the useEffect above
  };

  // Pass a callback down into your modal post cards
  const handleOpenComments = (postId: string, postOwnerId: string) => {
    console.log("postId:", postId, "postOwnerId:", postOwnerId);
    setCommentPostId(postId);
    setCommentPostOwnerId(postOwnerId);
  };
  const streakPostIds = getStreakPostIds(posts ?? []);

  const isStreakPost = (post: Post) => {
    return streakPostIds.has(post.id);
  };

  const streakEndIds = new Set(
    posts.filter((p) => isStreakEnd(p, posts)).map((p) => p.id),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Text style={styles.newPost}>+</Text>
        </TouchableOpacity>
        <Text style={styles.topHeaderUsername}>Wardrobe</Text>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Ionicons name="information" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {!selectedCollectionId && !selectedTagId && (
        <Animated.View
          style={[
            styles.floatingTabsWrapper,
            {
              transform: [{ translateY: tabsTranslateY }],
              opacity: tabsOpacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.floatingTabs}>
            <TouchableOpacity
              style={[
                styles.floatingTabPill,
                activeTab === "wardrobe" && styles.floatingTabPillActive,
              ]}
              onPress={() => {
                setActiveTab("wardrobe");
                tabScrollRef.current?.scrollTo({ x: 0, animated: true });
              }}
            >
              <Text
                style={[
                  styles.floatingTabText,
                  activeTab === "wardrobe" && styles.floatingTabActive,
                ]}
              >
                Fits
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.floatingTabPill,
                activeTab === "Tags" && styles.floatingTabPillActive,
              ]}
              onPress={() => {
                setActiveTab("Tags");
                tabScrollRef.current?.scrollTo({
                  x: SCREEN_WIDTH,
                  animated: true,
                });
              }}
            >
              <Text
                style={[
                  styles.floatingTabText,
                  activeTab === "Tags" && styles.floatingTabActive,
                ]}
              >
                Tags
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.floatingTabPill,
                activeTab === "hauls" && styles.floatingTabPillActive,
              ]}
              onPress={() => {
                setActiveTab("hauls");
                tabScrollRef.current?.scrollTo({
                  x: SCREEN_WIDTH * 2,
                  animated: true,
                });
              }}
            >
              <Text
                style={[
                  styles.floatingTabText,
                  activeTab === "hauls" && styles.floatingTabActive,
                ]}
              >
                Hauls
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.floatingTabPill,
                activeTab === "Saved" && styles.floatingTabPillActive,
              ]}
              onPress={() => {
                setActiveTab("Saved");
                tabScrollRef.current?.scrollTo({
                  x: SCREEN_WIDTH * 3,
                  animated: true,
                });
              }}
            >
              <Text
                style={[
                  styles.floatingTabText,
                  activeTab === "Saved" && styles.floatingTabActive,
                ]}
              >
                Saved
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Paged content */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveTab(
            page === 0
              ? "wardrobe"
              : page === 1
                ? "Tags"
                : page === 2
                  ? "hauls"
                  : "Saved",
          );
        }}
        style={{ flex: 1 }}
      >
        {/* Page 1 — Calendar */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            ref={calendarScrollRef}
            onScroll={handleCalendarScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(w, h) => {
              calendarScrollRef.current?.scrollTo({ y: h, animated: false });
            }}
          >
            {months.map(({ month, year }, index) => (
              <MonthBlock
                key={`${year}-${month}-${index}`}
                month={month}
                year={year}
                postByDay={getPostByDay(month, year)}
                onSelectPost={setSelectedWardrobePost}
                onSelectEmptyDay={handleSelectEmptyDay}
                isStreakPost={isStreakPost}
                streakEndIds={streakEndIds}
              />
            ))}
            <View style={styles.whitespace} />
          </ScrollView>
        </View>

        {/* Page 2 — Tags */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            ref={haulsScrollRef}
            onScroll={handleCalendarScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 100 }}
            onContentSizeChange={(w, h) => {
              haulsScrollRef.current?.scrollTo({ y: h, animated: false });
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {selectedTagId ? (
              <>
                <View style={styles.savedCollectionHeader}>
                  <TouchableOpacity onPress={() => setSelectedTagId(null)}>
                    <Text style={styles.backText}>
                      ← {selectedCollectionName}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isLoadingTagPosts ? (
                  <View style={styles.emptyContent}>
                    <Text style={styles.emptyText}>Loading...</Text>
                  </View>
                ) : tagPosts.length === 0 ? (
                  <View style={styles.emptyContent}>
                    <Text style={styles.emptyText}>
                      No posts saved here yet
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    key="saved"
                    data={tagPosts}
                    renderItem={renderTagPost}
                    numColumns={3}
                    keyExtractor={(item) => item.id}
                    columnWrapperStyle={{ gap: 2 }}
                    scrollEnabled={false}
                    ListEmptyComponent={
                      <View style={styles.emptyContent}>
                        <Text style={styles.emptyText}>
                          No posts saved here yet
                        </Text>
                      </View>
                    }
                  />
                )}
              </>
            ) : (
              <>
                <Text style={styles.photoMonthHeader}>Tags Archive</Text>
                {tags.length === 0 ? (
                  <View style={styles.emptyContent}>
                    <Text style={styles.emptyText}>
                      Create a tag to start your collection
                    </Text>
                  </View>
                ) : (
                  tags.map((tag, i) => {
                    const tagImage = tag.tag_image || tag.image_url || null;

                    return (
                      <Pressable
                        key={i}
                        style={({ pressed }) => [
                          styles.tagRow,
                          pressed && { opacity: 0.6 },
                        ]}
                        onPress={() => handleOpenTag(tag.id, tag.name || null)}
                      >
                        <View style={styles.TagcountBadge}>
                          {tagImage ? (
                            <View style={styles.tagImageClip}>
                              <Image
                                source={{ uri: tagImage }}
                                style={styles.tagImage}
                              />
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.tagImagePlaceholder}
                              onPress={() =>
                                router.push({
                                  pathname: "/(profile)/tagDetails",
                                  params: { tagId: tag.id },
                                })
                              }
                            >
                              <Ionicons
                                name="add"
                                size={22}
                                color={colors.textMuted}
                              />
                            </TouchableOpacity>
                          )}

                          <View style={styles.imageCount}>
                            <Text style={styles.overlayCountText}>
                              {tag.count}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.tagTextContainer}>
                          {tag.name ? (
                            <Text style={styles.tagTitle} numberOfLines={1}>
                              {tag.name}
                            </Text>
                          ) : null}

                          <View style={{ gap: 5 }}>
                            {tag.brand ? (
                              <Text style={styles.tagDetails} numberOfLines={1}>
                                {tag.brand}
                              </Text>
                            ) : null}
                            {tag.store ? (
                              <Text style={styles.tagDetails} numberOfLines={1}>
                                {tag.store}
                              </Text>
                            ) : null}
                            {tag.price ? (
                              <Text style={styles.tagDetails} numberOfLines={1}>
                                ${tag.price}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.tagActionColumn}>
                          <TouchableOpacity
                            style={styles.tagActionButton}
                            hitSlop={6}
                            onPress={() => toggleFavoriteTag(tag.id)}
                          >
                            <Ionicons
                              name={tag.favorite ? "star" : "star-outline"}
                              size={16}
                              color={
                                tag.favorite ? colors.accent : colors.textMuted
                              }
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.tagActionButton}
                            hitSlop={6}
                            onPress={() =>
                              Alert.alert(
                                "Delete this tag?",
                                "This will remove it from your archive. This will not remove it from your posts.",
                                [
                                  { text: "Cancel", style: "cancel" },
                                  {
                                    text: "Delete",
                                    style: "destructive",
                                    onPress: () => deleteTag(tag.id),
                                  },
                                ],
                              )
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.tagActionButton}
                            hitSlop={6}
                            onPress={() =>
                              router.push({
                                pathname: "/(profile)/tagDetails",
                                params: { tagId: tag.id },
                              })
                            }
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={16}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                        </View>

                        <MaterialIcons
                          name="chevron-right"
                          size={24}
                          color={colors.border}
                        />
                      </Pressable>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>
          {/* Floating create button */}
          {!selectedTagId && (
            <TouchableOpacity
              style={styles.fab}
              onPress={handleCreateTag}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.text} />
              <Text style={styles.fabText}>Create new tag</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Page 3 — Hauls */}

        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            ref={haulsScrollRef}
            onScroll={handleCalendarScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 100 }}
            onContentSizeChange={(w, h) => {
              haulsScrollRef.current?.scrollTo({ y: h, animated: false });
            }}
          >
            {monthGroups.map(({ year, month, images }) => (
              <View key={`${year}-${month}`}>
                {/* Month header */}
                <Text style={styles.photoMonthHeader}>
                  {MONTHS[month]} {year}
                </Text>

                {/* Hero image — first image full width */}
                <TouchableOpacity
                  onPress={() => setSelectedPost(images[0].post)}
                >
                  <Image
                    source={{ uri: images[0].image_url }}
                    style={styles.heroImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>

                {/* Rest in 3-column grid */}
                {images.length > 1 && (
                  <View style={styles.haulGrid}>
                    {images.slice(1).map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedPost(img.post)}
                      >
                        <Image
                          source={{ uri: img.image_url }}
                          style={styles.haulGridImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {haulImages.length === 0 && (
              <View style={styles.HaulemptyContent}>
                <View style={styles.HaulemptyTitle}>
                  <Text style={styles.photoMonthHeader}>Hauls Archive</Text>
                </View>
                <Text style={styles.emptyHaulText}>No haul posts yet</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Page 4 — Saved */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            ref={savedScrollRef}
            onScroll={handleCalendarScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {selectedCollectionId ? (
              <>
                <View style={styles.savedCollectionHeader}>
                  <TouchableOpacity
                    onPress={() => setSelectedCollectionId(null)}
                  >
                    <Text style={styles.backText}>
                      ← {selectedCollectionName}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isLoadingCollectionPosts ? (
                  <View style={styles.emptyContent}>
                    <Text style={styles.emptyText}>Loading...</Text>
                  </View>
                ) : collectionPosts.length === 0 ? (
                  <View style={styles.emptyContent}>
                    <Text style={styles.emptyText}>
                      No posts saved here yet
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    key="saved"
                    data={collectionPosts}
                    renderItem={renderSavedPost}
                    numColumns={3}
                    keyExtractor={(item) => item.id}
                    columnWrapperStyle={{ gap: 2 }}
                    scrollEnabled={false}
                    ListEmptyComponent={
                      <View style={styles.emptyContent}>
                        <Text style={styles.emptyText}>
                          No posts saved here yet
                        </Text>
                      </View>
                    }
                  />
                )}
              </>
            ) : (
              <>
                <Text style={styles.photoMonthHeader}>Collections</Text>
                {collections.length === 0 ? (
                  <View style={styles.emptyContent}>
                    <Text style={styles.emptyText}>
                      Save a post to create your first collection
                    </Text>
                  </View>
                ) : (
                  <View style={styles.collectionsGrid}>
                    {collections.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.collectionTile}
                        onPress={() => handleOpenCollection(c.id, c.name)}
                      >
                        <View style={styles.collectionPreviewGrid}>
                          {[0, 1, 2, 3].map((i) =>
                            collectionPreviews[c.id]?.[i] ? (
                              <Image
                                key={i}
                                source={{ uri: collectionPreviews[c.id][i] }}
                                style={styles.collectionPreviewImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                              />
                            ) : (
                              <View
                                key={i}
                                style={[
                                  styles.collectionPreviewImage,
                                  styles.collectionPreviewPlaceholder,
                                ]}
                              />
                            ),
                          )}
                        </View>
                        <View style={styles.collectionTileInfo}>
                          <Text
                            style={styles.collectionTileText}
                            numberOfLines={1}
                          >
                            {c.name}
                          </Text>
                          <Text style={styles.collectionTileCount}>
                            {collectionPreviews[c.id]?.length ?? 0} posts
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.border}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Selected post modal */}
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
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() =>
                router.push({
                  pathname: "/(profile)/collectionScroll",
                  params: {
                    collection_id: selectedCollectionId,
                    collection_name: selectedCollectionName,
                  },
                })
              }
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={colors.background}
              />
              <Text style={styles.exploreButtonText}>
                Scroll {selectedCollectionName} Posts →
              </Text>
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
        </TouchableWithoutFeedback>
      )}

      {selectedTagPost && (
        <TouchableWithoutFeedback onPress={() => setSelectedTagPost(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedTagPost.isoutfit_post ? (
                <ModalPostCard
                  post={selectedTagPost}
                  currentUserId={user?.id}
                  onNavigateAway={() => setSelectedPost(null)}
                  onOpenComments={handleOpenComments}
                  onOpenLikers={handleOpenLikers}
                />
              ) : (
                <ModalHaulPostCard
                  post={selectedTagPost}
                  currentUserId={user?.id}
                  onNavigateAway={() => setSelectedPost(null)}
                  onOpenComments={handleOpenComments}
                  onOpenLikers={handleOpenLikers}
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() =>
                router.push({
                  pathname: "/(profile)/tagScroll",
                  params: {
                    tag_id: selectedTagId,
                    tag_name: selectedCollectionName,
                  },
                })
              }
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={colors.background}
              />
              <Text style={styles.exploreButtonText}>
                Scroll {selectedCollectionName} Posts →
              </Text>
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
        </TouchableWithoutFeedback>
      )}

      {selectedWardrobePost && (
        <TouchableWithoutFeedback onPress={() => setSelectedWardrobePost(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedWardrobePost.isoutfit_post ? (
                <ModalPostCard
                  post={selectedWardrobePost}
                  currentUserId={user?.id}
                  onNavigateAway={() => setSelectedWardrobePost(null)}
                  onOpenComments={handleOpenComments}
                  onOpenLikers={handleOpenLikers}
                />
              ) : (
                <ModalHaulPostCard
                  post={selectedWardrobePost}
                  currentUserId={user?.id}
                  onNavigateAway={() => setSelectedWardrobePost(null)}
                  onOpenComments={handleOpenComments}
                  onOpenLikers={handleOpenLikers}
                />
              )}
            </View>

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
        </TouchableWithoutFeedback>
      )}
      <Modal visible={showInfo} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowInfo(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.infoModal}>
            <Text style={styles.infoTitle}>Your Wardrobe</Text>
            <Text style={styles.infoBody}>
              Your wardrobe is your personal style archive. Every fit you post
              gets saved here so you can look back at what you wore on any given
              day.{"\n\n"}
              Tap an empty day to add a fit for that date. Tap a day with a
              photo to view that outfit.{"\n\n"}
              The Tags tab allows you to look at all the tags you've used, edit
              them, and see what outfits you've worn them with. Click the new
              tag button to add a new tag to your archive.{"\n\n"}
              The Hauls tab keeps all your haul posts in one place as a photo
              gallery.
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowInfo(false)}
            >
              <Text style={styles.infoButtonText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => closeModal()}
      >
        <Pressable style={styles.modalContainer1} onPress={() => closeModal()}>
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: sheetOpacity,
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />

              <Text style={styles.eyebrow}>New post</Text>
              <Text style={styles.sheetTitle}>What are you sharing?</Text>

              <View style={styles.cardRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.card}
                  onPress={() =>
                    closeModal(() =>
                      router.push({
                        pathname: "/(post)/fit",
                        params: {
                          hasActivePost: hasActivePost ? "true" : "false",
                        },
                      }),
                    )
                  }
                >
                  <View
                    style={[
                      styles.iconBadge,
                      { backgroundColor: colors.primary + "1F" },
                    ]}
                  >
                    <Ionicons
                      name="shirt-outline"
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.cardTitle}>
                    {hasActivePost ? "Replace fit" : "Fit"}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {hasActivePost ? "Swap today's post" : "Today's outfit"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.card}
                  onPress={() => closeModal(() => router.push("/(post)/haul"))}
                >
                  <View
                    style={[
                      styles.iconBadge,
                      { backgroundColor: colors.primary + "1F" },
                    ]}
                  >
                    <Ionicons
                      name="bag-handle-outline"
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.cardTitle}>Haul</Text>
                  <Text style={styles.cardSubtitle}>New pieces</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelButton1}
                onPress={() => closeModal()}
              >
                <Text style={styles.cancelButtonText1}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    tagText: {
      fontSize: 13,
      color: colors.text,
      fontFamily: "System",
    },
    tagTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,

      marginBottom: 4,
    },
    tagDetails: {
      fontSize: 12,
      color: colors.textMuted,
      fontFamily: "System",
    },
    tagTextContainer: {
      flex: 1,
      gap: 2,
      minHeight: 30,
      justifyContent: "center",
    },
    TagcountBadge: {
      position: "relative",
      width: 80,
      height: 80,
      marginRight: 12,
    },
    tagImagePlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    tagImageClip: {
      width: 80,
      height: 80,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    tagImage: {
      width: "100%",
      height: "100%",
    },
    imageCount: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: "rgba(0,0,0,0.75)",
      borderRadius: 11,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 5,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    countText: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.background,
    },
    HaulemptyTitle: {
      alignSelf: "flex-start",
    },
    overlayCountText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#fff",
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface, // or .card if you have it
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      gap: 12,
    },
    countBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
    },

    fab: {
      position: "absolute",
      bottom: 100,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 28,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    fab2: {
      position: "absolute",
      bottom: 100,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 28,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    fabText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },

    modalContainer1: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: 36,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 18,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.textMuted ?? colors.secondary,
      textAlign: "center",
      marginBottom: 4,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 20,
    },
    cardRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 22,
      paddingHorizontal: 12,
      alignItems: "center",
      gap: 4,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textMuted ?? colors.secondary,
    },
    cancelButton1: {
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelButtonText1: {
      color: colors.textMuted ?? colors.secondary,
      fontSize: 15,
      fontWeight: "600",
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
    collectionsGrid: {
      width: "100%",
      paddingHorizontal: 16,
      gap: 0,
    },
    collectionTile: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    collectionPreviewGrid: {
      width: 64,
      height: 64,
      flexDirection: "row",
      flexWrap: "wrap",
      borderRadius: 8,
      overflow: "visible",
    },
    collectionPreviewImage: {
      width: 32,
      height: 32,
    },
    collectionPreviewPlaceholder: {
      backgroundColor: colors.border,
    },
    collectionTileInfo: {
      flex: 1,
      gap: 2,
    },
    collectionTileText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    collectionTileCount: {
      fontSize: 13,
      color: colors.textMuted,
    },
    previewGrid: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
    },
    previewImage: {
      width: "50%",
      height: "50%",
    },
    collectionTileWrapper: {
      width: "100%",
      height: (SCREEN_WIDTH - 80) / 3,
      marginBottom: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      justifyContent: "center",
      gap: 6,
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoModal: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 24,
      marginHorizontal: 32,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    infoTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    infoBody: {
      fontSize: 15,
      color: colors.secondary,
      lineHeight: 22,
      marginBottom: 24,
    },
    infoButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
    },
    infoButtonText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: "600",
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
    exploreButton2: {
      position: "absolute",
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
    exploreButtonText2: {
      color: colors.background,
      fontSize: 14,
      fontWeight: "600",
    },
    photoMonthHeader: {
      marginTop: 50,
      fontSize: 24,
      fontWeight: "600",
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginLeft: 6,
    },
    heroImage: {
      width: SCREEN_WIDTH,
      height: SCREEN_WIDTH * 0.7,
      marginBottom: 2,
    },
    haulGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
    },
    haulGridImage: {
      width: (SCREEN_WIDTH - 4) / 3,
      height: (SCREEN_WIDTH - 4) / 3,
    },
    haulGridItem: {
      width: (SCREEN_WIDTH - 4) / 3,
    },
    floatingTabsWrapper: {
      position: "absolute",
      top: 130,
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 20,
    },
    floatingTabs: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 6,
      paddingVertical: 4,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },

    floatingTabPill: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
    },
    floatingTabPillActive: {
      backgroundColor: colors.background,
    },
    floatingTabText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.textMuted,
    },
    floatingTabActive: {
      color: colors.text,
      fontWeight: "700",
    },
    whitespace: {
      padding: 50,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    navBtn: {
      padding: 8,
    },

    navArrow: {
      fontSize: 28,
      color: colors.secondary,
    },
    dayLabelsRow: {
      flexDirection: "row",
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    dayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "500",
      color: colors.textMuted,
    },
    row: {
      flexDirection: "row",
      paddingHorizontal: 8,
    },
    cell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      alignItems: "center",
      justifyContent: "center",
      padding: 2,
    },
    dayCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    todayCircle: {
      backgroundColor: colors.primary,
    },
    dayText: {
      fontSize: 14,
      color: colors.text,
    },
    todayText: {
      color: colors.background,
      fontWeight: "600",
    },
    dayThumb: {
      width: CELL_SIZE - 6,
      height: CELL_SIZE - 6,
      borderRadius: 8,
    },
    todayThumb: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    dayOverlay: {
      position: "absolute",
      top: 17,
      left: 17,
      fontSize: 15,
      color: colors.text,
      fontWeight: "400",
      textShadowColor: "rgba(34, 33, 33, 0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    segmentedControlContainer: {
      alignItems: "center",
      paddingVertical: 10,
    },
    segmentedControl: {
      width: 160,
      height: 32,
      backgroundColor: "transparent",
    },
    tagActionColumn: {
      gap: 10,
      marginTop: -4,
      marginBottom: -4,
      marginRight: 4,
    },
    tagActionButton: {
      padding: 2,
    },
    selectedPost: {
      margin: 16,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    closeSelected: {
      position: "absolute",
      top: 8,
      right: 8,
      zIndex: 10,
      backgroundColor: "rgba(0,0,0,0.4)",
      borderRadius: 16,
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    closeText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    topHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topHeaderUsername: {
      marginBottom: -4,
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    newPost: {
      fontSize: 30,
      fontWeight: "300",
      color: colors.text,
    },
    imageWrapper: {
      position: "relative",
      overflow: "visible",
    },
    monthBlock: {
      paddingHorizontal: 8,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 12,
      color: colors.text,
    },
    selectedImage: {
      width: "100%",
      height: 400,
    },
    selectedDescription: {
      padding: 12,
      fontSize: 14,
      color: colors.text,
    },
    streakThumbWrapper: {
      width: CELL_SIZE - 6,
      height: CELL_SIZE - 6,
      borderRadius: 10,
      padding: 2.5,
    },

    streakThumbImage: {
      width: "100%",
      height: "100%",
      borderRadius: 7,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabText: { fontSize: 15, fontWeight: "500", color: colors.textMuted },
    tabTextActive: { color: colors.text, fontWeight: "700" },
    indicator: {
      position: "absolute",
      bottom: 0,
      width: "50%",
      height: 2,
      backgroundColor: colors.primary,
    },
    savedCollectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },

    streakCornerBadge: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 28,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      elevation: 10,
    },

    streakCornerText: {
      position: "absolute",
      color: "#fff",
      fontSize: 10,
      fontWeight: "800",
      top: 9,
      textAlign: "center",
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    backText: {
      fontSize: 24,
      fontWeight: "500",
      marginBottom: 8,
      color: colors.text,
    },
    savedGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 8,
      gap: 2,
    },
    savedGridImage: {
      width: (SCREEN_WIDTH - 4) / 3,
      height: (SCREEN_WIDTH - 4) / 3,
    },
    emptyContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 60,
    },
    HaulemptyContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyText: { color: colors.textMuted, fontSize: 15 },
    tabBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      position: "relative",
    },
    emptyHaulText: { color: colors.textMuted, fontSize: 15, paddingTop: 60 },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    postmodalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      gap: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    modalButtons: {
      marginTop: 8,
    },
    modalButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.surface,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });
