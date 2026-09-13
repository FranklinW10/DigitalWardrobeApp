import { useTheme } from "@/context/ThemeContext";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
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
const PREVIEW_SIZE = SCREEN_WIDTH - 48; // account for 24px padding each side

export default function Haul() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need camera roll permissions to select an image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 10,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelectedImages(result.assets.map((a) => a.uri));
      setActiveIndex(0);
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
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImages((prev) => [...prev, result.assets[0].uri]);
    }
  };
  const showImagePicker = () => {
    Alert.alert("Select Profile Image", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / PREVIEW_SIZE);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Select images from your haul</Text>

        {selectedImages.length > 0 ? (
          <View
            style={{
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE * 1.2,
              marginBottom: 10,
            }}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              style={{ height: PREVIEW_SIZE }}
            >
              {selectedImages.map((uri, index) => (
                <Image
                  key={index}
                  source={{ uri }}
                  style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
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
              style={styles.changeButton}
              onPress={showImagePicker}
            >
              <Text style={styles.changeButtonText}>
                {selectedImages.length} photo
                {selectedImages.length > 1 ? "s" : ""} selected · tap to change
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.placeholder}
            onPress={showImagePicker}
          >
            <Text style={styles.placeholderText}>+</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            !selectedImages.length && styles.buttonDisabled,
          ]}
          disabled={!selectedImages.length}
          onPress={() =>
            router.push({
              pathname: "/previewHaul",
              params: {
                imageUris: JSON.stringify(selectedImages),
                type: "haul",
              },
            })
          }
        >
          <Text style={styles.buttonText}>Preview Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 24,
      paddingTop: 60,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 40,
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
    placeholder: {
      width: "100%",
      aspectRatio: 1,
      marginBottom: 16,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    placeholderText: {
      color: colors.text,
      fontSize: 64,
      fontWeight: "300",
      lineHeight: 70,
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
    dotActive: { backgroundColor: colors.text },
    dotInactive: { backgroundColor: colors.border },
    changeButton: {
      alignSelf: "center",
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    changeButtonText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    button: {
      width: "100%",
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: colors.primary,
      marginTop: 16,
    },
    buttonDisabled: {
      backgroundColor: colors.border,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
  });
