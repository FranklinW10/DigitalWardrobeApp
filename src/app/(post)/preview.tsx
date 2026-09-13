import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usePosts } from "@/hooks/usePosts";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useContext } from "react";
import { PostContext } from "@/context/PostContext";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const POST_WIDTH = SCREEN_WIDTH - 32;

export default function FinalPreviewFit() {

    const { imageUri, description } = useContext(PostContext);  // ← From context
  const { tags } = useLocalSearchParams<{ tags?: string }>();
    const { peopleTags } = useLocalSearchParams<{ peopleTags?: string }>();
  const { createPost } = usePosts();
  const { user } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState<"archive" | "public" | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const parsedTags = useMemo(() => {
    if (!tags) return undefined;
    try {
      return JSON.parse(tags);
    } catch (e) {
      console.error("Failed to parse tags param:", e);
      return undefined;
    }
  }, [tags]);
    const parsedPeopleTags = useMemo(() => {
    if (!peopleTags) return undefined;
    try {
      return JSON.parse(peopleTags);
    } catch (e) {
      console.error("Failed to parse peopleTags param:", e);
      return undefined;
    }
  }, [peopleTags]);

  const handlePost = async (isPublic: boolean) => {
    setUploading(isPublic ? "public" : "archive");
    try {
      await createPost(
        imageUri as string,
        description as string,
        isPublic,
        true,
        undefined, // imageUris (haul-only, not used on this fit screen)
        parsedTags,
        parsedPeopleTags
      );
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setUploading(null);
    }
  };
  // ...rest unchanged
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preview Post</Text>

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

        {/* Image */}
        <Image
          source={{ uri: imageUri as string }}
          style={{ width: POST_WIDTH, height: POST_WIDTH }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />

        {/* Actions */}
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
          {description ? (
            <Text style={styles.postDescription}>{description as string}</Text>
          ) : null}
          <Text style={styles.postInfo}>Your Post · Just now</Text>
        </View>
      </View>

      {/* Buttons */}
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

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>←</Text>
      </TouchableOpacity>
    </View>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: -40,
      color: colors.text,
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
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    postHeader: {
      flexDirection: "row",
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
