import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Preview() {
  const { imageUri, description, alreadyPosted } = useLocalSearchParams();
  const userActivePost = alreadyPosted === "true";

  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading1, setIsUploading1] = useState(false);
  const [isUploading2, setIsUploading2] = useState(false);
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { createPost } = usePosts();
  const [publicPost, setPublicPost] = useState(false);

  const handlePosts = async (publicPost: boolean) => {
    if (!imageUri) return;
    publicPost ? setIsUploading1(true) : setIsUploading2(true);

    try {
      await createPost(
        imageUri as string,
        description as string,
        publicPost,
        true,
      );
      Alert.alert("Success", "Your post has been created successfully.");
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      publicPost ? setIsUploading1(false) : setIsUploading2(false);
    }
  };
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Preview</Text>

      <View style={styles.divider} />

      <View style={styles.postContainer}>
        <Image
          cachePolicy={"none"}
          source={{ uri: imageUri as string }}
          style={styles.previewImage}
          contentFit="cover"
        />
        <Text style={styles.description}>
          {description || "No description provided."}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.postButton}
          onPress={async () => {
            await handlePosts(false);
            router.replace("/(tabs)");
          }}
        >
          <Text style={styles.postText}>
            {isUploading2 ? (
              <ActivityIndicator size={24} color="#fff" />
            ) : (
              "Add to archive"
            )}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.postButton}
          onPress={async () => {
            setPublicPost(true);
            await handlePosts(true);
            router.replace("/(tabs)");
          }}
        >
          <Text style={styles.postText}>
            {isUploading1 ? (
              <ActivityIndicator size={24} color="#fff" />
            ) : userActivePost ? (
              "Update Post"
            ) : (
              "Post Publicly"
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },
  divider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#d0d0d0",
    marginVertical: 16,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    alignSelf: "flex-start",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 4,
  },
  postButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#000",
  },
  postText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  postContainer: {
    flex: 0.75,
    width: "100%",
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
    color: "#000",
    fontWeight: "400",
  },
});
