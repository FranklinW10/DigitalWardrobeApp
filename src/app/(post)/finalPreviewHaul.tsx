import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usePosts } from "@/hooks/usePosts";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FinalPreviewHaul() {
  const { imageUris, caption, tags } = useLocalSearchParams();
  const images: string[] = JSON.parse(imageUris as string);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { createPost } = usePosts();
  const { user } = useAuth();
  const router = useRouter();
  const POST_WIDTH = SCREEN_WIDTH - 32;
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / POST_WIDTH);
    setActiveIndex(index);
  };
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [uploading, setUploading] = useState<"archive" | "public" | null>(null);
  const parsedTags = useMemo(() => {
    if (!tags) return undefined;
    try {
      return JSON.parse(tags as string);
    } catch (e) {
      console.error("Failed to parse tags param:", e);
      return undefined;
    }
  }, [tags]);

  const handlePost = async (isPublic: boolean) => {
    setUploading(isPublic ? "public" : "archive");
    try {
      await createPost(
        undefined,
        caption as string,
        isPublic,
        false,
        images,
        parsedTags,
      );
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preview Post</Text>
      {/* Mimics the feed — post card */}
      <View style={styles.postContainer}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatar}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.username}>You</Text>
              <Text style={styles.timeAgo}>Just now</Text>
            </View>
          </View>
        </View>

        {/* Images */}
        <View style={{ width: POST_WIDTH, height: POST_WIDTH }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={{ width: POST_WIDTH, height: POST_WIDTH }}
          >
            {images.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={{ width: POST_WIDTH, height: POST_WIDTH }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ))}
          </ScrollView>
        </View>

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

        {/* Actions (static preview, no interaction) */}
        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <Ionicons name="heart-outline" size={24} color={colors.text} />
            <Text style={styles.actionCount}>0</Text>
          </View>
          <View style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
            <Text style={styles.actionCount}>0</Text>
          </View>
          <View style={{ marginLeft: "auto" }}>
            <Ionicons name={"bookmark-outline"} size={22} color={colors.text} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.postFooter}>
          {caption ? (
            <Text style={styles.postDescription}>{caption as string}</Text>
          ) : null}
          <Text style={styles.postInfo}>Your Post · Just now</Text>
        </View>
      </View>

      {/* Post buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.button}
          disabled={uploading !== null}
          onPress={() => handlePost(false)}
        >
          {uploading === "archive" ? (
            <ActivityIndicator size={24} color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Save to Archive</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          disabled={uploading !== null}
          onPress={() => handlePost(true)}
        >
          {uploading === "public" ? (
            <ActivityIndicator size={24} color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Post Publicly</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Back button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>←</Text>
      </TouchableOpacity>
    </View>
  );
} // ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: -40,
      color: colors.text,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    closeButton: {
      position: "absolute",
      top: 60,
      left: 24,
      zIndex: 10,
      padding: 8,
    },
    closeButtonText: {
      fontSize: 22,
      color: colors.text,
    },
    postContainer: {
      backgroundColor: colors.background,
      borderRadius: 16,
      marginTop: 60,
      marginHorizontal: 16,
      marginBottom: 0,
      shadowColor: colors.text,
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
    dotsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      marginBottom: -22,
    },
    dot: { width: 7, height: 7, borderRadius: 4 },
    dotActive: { backgroundColor: colors.text },
    dotInactive: { backgroundColor: colors.border },
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
    postFooter: {
      padding: 12,
      paddingTop: 4,
    },
    postDescription: {
      fontSize: 15,
      color: colors.text,
      marginBottom: 8,
      lineHeight: 20,
    },
    postInfo: {
      fontSize: 14,
      color: colors.textMuted,
    },
    buttons: {
      flexDirection: "row",
      gap: 12,
      padding: 24,
      paddingTop: 16,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: "600",
    },
  });
