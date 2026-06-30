import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
  const { imageUri, description } = useLocalSearchParams();
  const { createPost } = usePosts();
  const { user } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState<"archive" | "public" | null>(null);

  const handlePost = async (isPublic: boolean) => {
    setUploading(isPublic ? "public" : "archive");
    try {
      await createPost(
        imageUri as string,
        description as string,
        isPublic,
        true,
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

      <View style={styles.postContainer}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatar}
                cachePolicy="memory"
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
            <Ionicons name="heart-outline" size={24} color="#000" />
            <Text style={styles.actionCount}>0</Text>
          </View>
          <View style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color="#000" />
            <Text style={styles.actionCount}>0</Text>
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
            <ActivityIndicator size={24} color="#fff" />
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
            <ActivityIndicator size={24} color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: -40,
    color: "#000",
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
    color: "#000",
  },
  postContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 60,
    marginHorizontal: 16,
    shadowColor: "#000",
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
  postFooter: {
    padding: 12,
    paddingTop: 4,
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
    backgroundColor: "#000",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
