import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PREVIEW_SIZE = SCREEN_WIDTH - 48;

export default function PreviewHaul() {
  const { imageUris } = useLocalSearchParams();
  const images: string[] = JSON.parse(imageUris as string);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const router = useRouter();

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

      <Text style={styles.title}>Add a caption</Text>

      <View style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        >
          {images.map((uri, index) => (
            <Image
              key={index}
              source={{ uri }}
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
              contentFit="cover"
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

      <TextInput
        style={styles.captionInput}
        placeholder="Write a caption..."
        placeholderTextColor="#999"
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={300}
      />
      <Text style={styles.charCount}>{caption.length}/300</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          router.push({
            pathname: "/finalPreviewHaul",
            params: {
              imageUris: JSON.stringify(images),
              caption,
            },
          })
        }
      >
        <Text style={styles.buttonText}>Preview Post →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "center",
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#000",
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
  dotActive: { backgroundColor: "#000" },
  dotInactive: { backgroundColor: "#ccc" },
  captionInput: {
    width: "100%",
    minHeight: 80,
    maxHeight: 140,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#000",
    marginTop: 16,
    textAlignVertical: "top",
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  button: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#000",
    marginTop: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
