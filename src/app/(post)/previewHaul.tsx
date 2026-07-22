import { useTheme } from "@/context/ThemeContext";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const captionInputRef = useRef<TextInput>(null);
  const INPUT_ACCESSORY_ID = "captionInputDone";

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / PREVIEW_SIZE);
    setActiveIndex(index);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
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
                    index === activeIndex
                      ? styles.dotActive
                      : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}

          <TextInput
            ref={captionInputRef}
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor={colors.textMuted}
            value={caption}
            onChangeText={setCaption}
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
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
      color: colors.text,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 24,
      color: colors.text,
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
    dotActive: { backgroundColor: colors.text },
    dotInactive: { backgroundColor: colors.border },
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
    },
    button: {
      width: "100%",
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: colors.primary,
      marginTop: 24,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
  });
