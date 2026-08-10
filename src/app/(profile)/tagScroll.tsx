import { HaulPostCard, PostCard } from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Post } from "@/hooks/usePosts";
import { useTags } from "@/hooks/useTags";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CollectionScrollScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { tag_id, tag_name } = useLocalSearchParams<{
    tag_id: string;
    tag_name: string;
  }>();
  const { loadPostsWithTag } = useTags();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const load = async () => {
    if (!tag_id) return;
    const data = await loadPostsWithTag(tag_id);
    setPosts(data);
  };

  const renderLoadingState = () => (
    <View style={styles.emptyContent}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    };
    init();
  }, [tag_id, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (error) {
      console.error("Error refreshing collection posts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        if (currentY > lastScrollY.current && currentY > 50) {
          Animated.timing(headerVisible, {
            toValue: 0,
            duration: 25,
            useNativeDriver: false,
          }).start();
        } else {
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

  const renderPost = ({ item }: { item: Post }) => {
    console.log(item.id, item.description);
    if (item.isoutfit_post) {
      return <PostCard post={item} currentUserId={user?.id} />;
    }
    return <HaulPostCard post={item} currentUserId={user?.id} />;
  };

  return (
    <>
      <SafeAreaView
        style={{ backgroundColor: colors.background }}
        edges={["top"]}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Animated.View
          style={[styles.header, { height: headerHeight, overflow: "hidden" }]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {tag_name ?? "Posts with this tag"}
          </Text>
          <View style={{ width: 24 }} />
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.text} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            onScroll={handleScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary} // iOS spinner color
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              isLoading ? (
                renderLoadingState()
              ) : (
                <Text style={styles.empty}>No posts saved here yet</Text>
              )
            }
            contentContainerStyle={
              posts.length === 0 ? styles.emptyContent : styles.content
            }
            ListFooterComponent={<View style={styles.whitespace} />}
          />
        )}
      </View>
    </>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    content: {
      paddingBottom: 40,
    },
    emptyContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    empty: {
      textAlign: "center",
      color: colors.textMuted,
      fontSize: 15,
    },
    whitespace: {
      padding: 50,
    },
  });
