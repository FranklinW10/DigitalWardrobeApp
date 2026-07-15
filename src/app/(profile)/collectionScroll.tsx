import { HaulPostCard, PostCard } from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { Post } from "@/hooks/usePosts";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
  const { collection_id, collection_name } = useLocalSearchParams<{
    collection_id: string;
    collection_name: string;
  }>();
  const { loadPostsInCollection } = useSavedPosts();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(new Animated.Value(1)).current;

  const load = async () => {
    if (!collection_id) return;
    const data = await loadPostsInCollection(collection_id);
    setPosts(data);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    };
    init();
  }, [collection_id, user?.id]);

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
    if (item.isoutfit_post) {
      return <PostCard post={item} currentUserId={user?.id} />;
    }
    return <HaulPostCard post={item} currentUserId={user?.id} />;
  };

  return (
    <>
      <SafeAreaView style={{ backgroundColor: "#fff" }} edges={["top"]} />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Animated.View
          style={[styles.header, { height: headerHeight, overflow: "hidden" }]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{collection_name ?? "Saved"}</Text>
          <View style={{ width: 24 }} />
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            onScroll={handleScroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No posts saved here yet</Text>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    color: "#888",
    fontSize: 15,
  },
  whitespace: {
    padding: 50,
  },
});
