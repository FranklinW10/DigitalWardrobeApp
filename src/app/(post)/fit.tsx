import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usePosts } from "@/hooks/usePosts";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";

import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Fit() {
  const { hasActivePost } = useLocalSearchParams();
  const alreadyPosted = hasActivePost === "true";
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { createPost } = usePosts();
  const { colors } = useTheme();
  const captionInputRef = useRef<TextInput>(null);
  const INPUT_ACCESSORY_ID = "captionInputDone";

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);

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
      mediaTypes: ["images"],
      allowsEditing: true,

      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPreviewImage(result.assets[0].uri);
      setShowPreview(true);
      setDescription("");
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
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
            <Text style={styles.modalTitle}>
              {" "}
              {"Post your outfit of the day"}
            </Text>
            {previewImage ? (
              <TouchableOpacity onPress={showImagePicker}>
                <Image
                  cachePolicy={"memory-disk"}
                  source={{ uri: previewImage }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.imagePlaceholder}
                onPress={showImagePicker}
              >
                <Text style={styles.photoPlaceholderText}>+</Text>
              </TouchableOpacity>
            )}

            <TextInput
              ref={captionInputRef}
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={300}
              inputAccessoryViewID={
                Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined
              }
            />

            {Platform.OS === "ios" && (
              <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
                <View style={styles.accessoryBar}>
                  <TouchableOpacity
                    onPress={() => captionInputRef.current?.blur()}
                  >
                    <Text style={styles.accessoryDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </InputAccessoryView>
            )}
            <Text style={styles.charCount}>{description.length}/300</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.postButton,
                  !previewImage && styles.postButtonDisabled,
                ]}
                onPress={() => {
                  router.push({
                    pathname: "/fitTags",
                    params: {
                      imageUri: previewImage,
                      description: description,
                      alreadyPosted: alreadyPosted ? "true" : "false",
                    },
                  });
                }}
                disabled={isUploading || !previewImage}
              >
                {isUploading ? (
                  <ActivityIndicator size={24} color={colors.background} />
                ) : (
                  <Text style={styles.postButtonText}>Add Tags → </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 24,
      paddingTop: 60,
    },
    postButtonDisabled: {
      backgroundColor: colors.border,
    },
    modalContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      color: colors.text,
    },
    descriptionInput: {
      width: "100%",
      minHeight: 80,
      maxHeight: 120,
      backgroundColor: colors.surface,
      borderRadius: 0,
      padding: 12,
      fontSize: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
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
      color: colors.text,
      fontWeight: "400",
    },
    postButton: {
      backgroundColor: colors.primary,
    },
    accessoryBar: {
      backgroundColor: colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: "flex-end",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    accessoryDoneText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    postButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    previewImage: {
      width: "100%",
      aspectRatio: 1,
      marginBottom: 16,
      borderRadius: 0,
    },
    imagePlaceholder: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 0,
      marginBottom: 16,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    photoPlaceholderText: {
      color: colors.text,
      fontSize: 64,
      fontWeight: "300",
      lineHeight: 70,
    },
    captionInput: {
      width: "100%",
      minHeight: 80,
      maxHeight: 140,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      marginTop: 16,
      textAlignVertical: "top",
    },
    charCount: {
      alignSelf: "flex-end",
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 10,
    },
  });
