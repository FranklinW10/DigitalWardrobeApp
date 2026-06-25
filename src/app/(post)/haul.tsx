import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function Haul() {
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { createPost } = usePosts();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need camera roll permissions to select an Image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 10,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uris = result.assets.map((a) => a.uri);
      setSelectedImages(uris);
      setPreviewImage(uris[0]); // show first image in preview
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need camera permissions to take a photo.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPreviewImage(result.assets[0].uri);
      setShowPreview(true);
      setDescription("");
    }
  };

  const showImagePicker = () => {
    Alert.alert("Select Profile Image", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handlePosts = async () => {
    if (!previewImage) return;
    setIsUploading(true);
    try {
      await createPost(previewImage, description);
      setPreviewImage(null);
      setDescription("");
      setShowPreview(false);
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Faild to creeate post. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };
  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  return (
    <View style={styles.modalContainer}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => {
          router.back();
        }}
      >
        <Text style={styles.closeButtonText}>←</Text>
      </TouchableOpacity>

      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}> {"Select Images form your haul"}</Text>
        {selectedImages.length > 0 ? (
          <View style={{ height: 400, marginBottom: 16 }}>
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.previewScrollView}
                contentContainerStyle={{ flexGrow: 0 }}
                onMomentumScrollEnd={handleScroll}
              >
                {selectedImages.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>

              {selectedImages.length > 1 && (
                <View style={styles.dotsContainer}>
                  {selectedImages.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === activeIndex
                          ? styles.dotActive
                          : styles.dotInactive,
                      ]}
                    />
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={pickImage}
              >
                <Text style={styles.addMoreText}>
                  {selectedImages.length} photo
                  {selectedImages.length > 1 ? "s" : ""} selected · tap to
                  change
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.imagePlaceholder}
            onPress={showImagePicker}
          >
            <Text style={styles.photoPlaceholderText}>+</Text>
          </TouchableOpacity>
        )}
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.postButton]}
            onPress={() => {
              router.push({
                pathname: "/previewHaul",
                params: {
                  imageUris: JSON.stringify(selectedImages), // 👈 all images
                  type: "haul",
                },
              });
            }}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size={24} color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Preview Post </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",

    padding: 24,
    paddingTop: 60,
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    color: "#000",
  },
  descriptionInput: {
    width: "100%",
    minHeight: 80,
    maxHeight: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 0,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#000",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
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
  postButton: {
    backgroundColor: "#000",
  },
  postButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  imagePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 0,
    marginBottom: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "solid",
  },
  photoPlaceholderText: {
    color: "#000",
    fontSize: 64,
    fontWeight: "300",
    lineHeight: 70,
  },

  previewScrollView: {
    width: 300,
    height: 300,
    overflow: "hidden",
    marginBottom: 0,
  },
  previewImage: {
    width: 300,
    height: 300,
  },
  addMoreButton: {
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  addMoreText: {
    fontSize: 13,
    color: "#666",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#000",
  },
  dotInactive: {
    backgroundColor: "#ccc",
  },
});
