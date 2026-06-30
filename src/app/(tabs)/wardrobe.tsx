import { useAuth } from "@/context/AuthContext";
import { Post } from "@/hooks/usePosts";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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

const MonthBlock = ({
  month,
  year,
  postByDay,
  onSelectPost,
  onSelectEmptyDay,
}: {
  month: number;
  year: number;
  postByDay: Record<number, Post>;
  onSelectPost: (post: Post) => void;
  onSelectEmptyDay: (date: Date) => void;
}) => {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const cells = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.monthBlock}>
      <Text style={styles.monthTitle}>
        {MONTHS[month]} {year}
      </Text>

      <View style={styles.dayLabelsRow}>
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
                <>
                  {postByDay[day] ? (
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
                  {/* Always show day number on top of image */}
                  {postByDay[day] && (
                    <Text style={styles.dayOverlay}>{day}</Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

export default function WardrobeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<"wardrobe" | "hauls">("wardrobe");
  const tabsTranslateY = useRef(new Animated.Value(0)).current;
  const tabsOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const tabsHidden = useRef(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const scrollViewRef = useRef<ScrollView>(null); // calendar scroll
  const tabScrollRef = useRef<ScrollView>(null); // tab pager

  useEffect(() => {
    loadPosts();
  }, [user?.id]);

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderUsername}>@{user?.username}</Text>
        <TouchableOpacity onPress={() => router.push("/(profile)/settings")}>
          <Ionicons name="menu" size={26} color="#000" />
        </TouchableOpacity>
      </View>
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
              activeTab === "hauls" && styles.floatingTabPillActive,
            ]}
            onPress={() => {
              setActiveTab("hauls");
              tabScrollRef.current?.scrollTo({
                x: SCREEN_WIDTH,
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
        </View>
      </Animated.View>

      {/* Paged content */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveTab(page === 0 ? "wardrobe" : "hauls");
        }}
        style={{ flex: 1 }}
      >
        {/* Page 1 — Calendar */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleCalendarScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(w, h) => {
              scrollViewRef.current?.scrollTo({ y: h, animated: false });
            }}
          >
            {months.map(({ month, year }, index) => (
              <MonthBlock
                key={`${year}-${month}-${index}`}
                month={month}
                year={year}
                postByDay={getPostByDay(month, year)}
                onSelectPost={setSelectedPost}
                onSelectEmptyDay={handleSelectEmptyDay}
              />
            ))}
            <View style={styles.whitespace} />
          </ScrollView>
        </View>

        {/* Page 2 — Hauls */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyText}>Hauls coming soon</Text>
          </View>
        </View>
      </ScrollView>

      {/* Selected post modal */}
      {selectedPost && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPost(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setSelectedPost(null)}
          >
            <View style={styles.modalContent}>
              <Image
                source={{
                  uri:
                    selectedPost.images?.[0]?.image_url ??
                    selectedPost.image_url,
                }}
                style={styles.selectedImage}
                contentFit="cover"
              />
              {selectedPost.description && (
                <Text style={styles.selectedDescription}>
                  {selectedPost.description}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    shadowColor: "#000",
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
    backgroundColor: "#f0f0f0",
  },
  floatingTabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#bbb",
  },
  floatingTabActive: {
    color: "#000",
    fontWeight: "700",
  },
  whitespace: {
    padding: 50,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  navBtn: {
    padding: 8,
  },
  navArrow: {
    fontSize: 28,
    color: "#555",
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
    color: "#999",
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
    backgroundColor: "#111",
  },
  dayText: {
    fontSize: 14,
    color: "#111",
  },
  todayText: {
    color: "#fff",
    fontWeight: "600",
  },
  dayThumb: {
    width: CELL_SIZE - 6,
    height: CELL_SIZE - 6,
    borderRadius: 8,
  },
  todayThumb: {
    borderWidth: 2,
    borderColor: "#111",
  },
  dayOverlay: {
    position: "absolute",
    top: 17,
    left: 17,
    fontSize: 15,
    color: "#1f1e1e",
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
    width: 160, // ← adjust to taste
    height: 32,

    backgroundColor: "transparent",
  },
  selectedPost: {
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f9f9f9",
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  topHeaderUsername: {
    fontSize: 18,
    fontWeight: "700",
  },
  monthBlock: {
    paddingHorizontal: 8,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 12,
    color: "#111",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  selectedImage: {
    width: "100%",
    height: 400,
  },
  selectedDescription: {
    padding: 12,
    fontSize: 14,
    color: "#333",
  },

  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 15, fontWeight: "500", color: "#999" },
  tabTextActive: { color: "#000", fontWeight: "700" },
  indicator: {
    position: "absolute",
    bottom: 0,
    width: "50%",
    height: 2,
    backgroundColor: "#000",
  },
  // keep your existing monthBlock, row, cell, etc styles

  emptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: { color: "#999", fontSize: 15 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
    position: "relative",
  },
});
