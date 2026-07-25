import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    LayoutChangeEvent,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    PanResponder,
    Platform,
    Pressable,
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

// Matches the public.post_tags table:
// id, created_at, post_id, location_x, location_y, price, store, is_clothing_tag
type PostTag = {
  id: string;
  locationX: number;
  locationY: number;
  brand: string;
  store: string;
  price: string;
  is_clothing_tag: boolean;
  color: string;
  imageIndex: number;
};

type Draft = PostTag & { isNew: boolean };

const PIN_COLORS = [
  "#FF5FA2",
  "#F7C948",
  "#7EC8E3",
  "#B78CFF",
  "#4ADE80",
  "#FF9E6B",
];

function DraggablePin({
  tag,
  color,
  isSelected,
  containerSize,
  onPress,
  onMove,
}: {
  tag: PostTag;
  color: string;
  isSelected: boolean;
  containerSize: { width: number; height: number };
  onPress: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const { colors } = useTheme();
  const pinStyles = createPinStyles(colors);

  // The pin box is 140x54 and anchors at its bottom-center (see pinStyles.wrap
  // margins below), so we bake that -70/-54 offset into the pixel position
  // pan tracks. `pan` is the ONLY source of truth for where the pin sits —
  // there's no separate percentage-based left/top competing with it, which
  // is what caused the pin to jump back to its old spot for a frame before
  // snapping to the new one.
  const toPanXY = (
    locX: number,
    locY: number,
    size: { width: number; height: number },
  ) => ({
    x: (locX / 100) * size.width - 70,
    y: (locY / 100) * size.height - 54,
  });

  const pan = useRef(
    new Animated.ValueXY(toPanXY(tag.locationX, tag.locationY, containerSize)),
  ).current;
  const wasDragged = useRef(false);
  const measured = useRef(containerSize.width > 0 && containerSize.height > 0);

  // Safety net in case the pin mounts before the image has been measured.
  useEffect(() => {
    if (!measured.current && containerSize.width && containerSize.height) {
      pan.setValue(toPanXY(tag.locationX, tag.locationY, containerSize));
      measured.current = true;
    }
  }, [containerSize.width, containerSize.height]);

  useEffect(() => {
    console.log("Pin received updated tag:", tag);
  }, [tag]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          wasDragged.current = false;
          // Fold the current position into an offset, then track the new
          // gesture from zero — this is the standard drag pattern and avoids
          // recomputing from percentages mid-gesture.
          pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
            wasDragged.current = true;
          }
          pan.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: () => {
          pan.flattenOffset();
          if (!wasDragged.current) {
            onPress();
            return;
          }
          if (containerSize.width && containerSize.height) {
            const xPx = (pan.x as any)._value + 70;
            const yPx = (pan.y as any)._value + 54;
            const nextX = Math.max(
              2,
              Math.min(98, (xPx / containerSize.width) * 100),
            );
            const nextY = Math.max(
              2,
              Math.min(98, (yPx / containerSize.height) * 100),
            );
            onMove(nextX, nextY);
          }
        },
      }),
    [onPress, onMove, containerSize.width, containerSize.height],
  );

  const bubbleText = [
    tag.brand && `Brand: ${tag.brand}`,
    tag.store && `Store: ${tag.store}`,
    tag.price && `Price: $${tag.price}`,
  ]
    .filter(Boolean)

    .join("\n");
  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[pinStyles.wrap, { transform: pan.getTranslateTransform() }]}
    >
      <View
        style={[
          pinStyles.bubble,
          isSelected && { borderColor: color, borderWidth: 1.5 },
        ]}
      >
        <Text style={pinStyles.bubbleText} numberOfLines={4}>
          {bubbleText}
        </Text>
      </View>
      <View style={pinStyles.arrow} />
      <View style={[pinStyles.bubbleDot, { backgroundColor: color }]} />
    </Animated.View>
  );
}

// Pin chrome (bubble, arrow, anchor) themed off the same `colors` object as
// the rest of the screen, so it flips light/dark with the app instead of
// staying a fixed black-glass style.
const createPinStyles = (colors: any) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",

      height: 80,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    bubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,

      backgroundColor: `${colors.surface}CC`, // ~60% opacity — translucent, still legible

      borderRadius: 14,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    bubbleDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    bubbleText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    arrow: {
      width: 0,
      height: 0,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 6,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: `${colors.surface}99`,
      marginTop: -1,
    },
    anchor: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      backgroundColor: colors.background,
      marginTop: 2,
    },
  });

export default function TagItems() {
  const router = useRouter();
  const { imageUris, caption } = useLocalSearchParams<{
    imageUris: string;
    caption: string;
  }>();

  const images: string[] = useMemo(() => {
    try {
      return imageUris ? JSON.parse(imageUris as string) : [];
    } catch {
      return [];
    }
  }, [imageUris]);

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tags, setTags] = useState<PostTag[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const idCounter = useRef(0);
  useEffect(() => {
    if (!draft) setColorPickerOpen(false);
  }, [draft]);

  const onImageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setImgSize({ width, height });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / PREVIEW_SIZE);
    setActiveIndex(index);
  };

  const handleImagePress = (e: any, imageIndex: number) => {
    if (draft || !imgSize.width || !imgSize.height) return;
    const { locationX, locationY } = e.nativeEvent;
    const x = Math.max(2, Math.min(98, (locationX / imgSize.width) * 100));
    const y = Math.max(2, Math.min(98, (locationY / imgSize.height) * 100));
    idCounter.current += 1;
    setDraft({
      id: `tag_${Date.now()}_${idCounter.current}`,
      locationX: x,
      locationY: y,
      brand: "",
      store: "",
      price: "",
      is_clothing_tag: true,
      color: PIN_COLORS[tags.length % PIN_COLORS.length],
      imageIndex,
      isNew: true,
    });
  };

  const selectTag = (id: string) => {
    const t = tags.find((t) => t.id === id);
    console.log("Opening:", t);
    if (t) setDraft({ ...t, isNew: false });
  };

  const updateTagPosition = (id: string, x: number, y: number) => {
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, locationX: x, locationY: y } : t)),
    );
  };

  const confirmDraft = () => {
    if (!draft) return;
    console.log("Saving:", draft);
    const hasContent =
      draft.store.trim() || draft.price.trim() || draft.brand.trim();
    if (!hasContent) return;
    const { isNew, ...tag } = draft;
    setTags((prev) => {
      const exists = prev.some((t) => t.id === tag.id);
      return exists
        ? prev.map((t) => (t.id === tag.id ? tag : t))
        : [...prev, tag];
    });
    setDraft(null);
  };

  const deleteDraft = () => {
    if (!draft) return;
    setTags((prev) => prev.filter((t) => t.id !== draft.id));
    setDraft(null);
  };

  const handleContinue = () => {
    const payload = tags.map((t) => ({
      location_x: Number(t.locationX.toFixed(2)),
      location_y: Number(t.locationY.toFixed(2)),
      store: t.store,
      brand: t.brand,
      price: t.price ? Number(t.price) : null,
      is_clothing_tag: t.is_clothing_tag,
      color: t.color,
      imageIndex: t.imageIndex,
    }));
    router.push({
      pathname: "/finalPreviewHaul",
      params: {
        imageUris,
        caption,
        tags: JSON.stringify(payload),
      },
    });
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
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tag your items</Text>
            <Text style={styles.subtitle}>
              {tags.filter((t) => t.imageIndex === activeIndex).length === 0
                ? "Tap the photo to tag what you're wearing"
                : `${tags.filter((t) => t.imageIndex === activeIndex).length} ${
                    tags.filter((t) => t.imageIndex === activeIndex).length ===
                    1
                      ? "tag"
                      : "tags"
                  } on this photo`}
            </Text>

            <View onLayout={onImageLayout}>
              <View style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleScroll}
                  style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                >
                  {images.map((uri, index) => (
                    <Pressable
                      key={index}
                      onPress={(e) => handleImagePress(e, index)}
                      style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                        contentFit="cover"
                      />
                    </Pressable>
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

              {tags.filter((t) => t.imageIndex === activeIndex).length ===
                0 && (
                <View style={styles.hintBadge} pointerEvents="none">
                  <Text style={styles.hintBadgeText}>
                    Tap an item to tag it
                  </Text>
                </View>
              )}

              {tags
                .filter((t) => t.imageIndex === activeIndex)
                .map((tag) => (
                  <DraggablePin
                    key={tag.id}
                    tag={tag}
                    color={tag.color}
                    isSelected={draft?.id === tag.id}
                    containerSize={imgSize}
                    onPress={() => selectTag(tag.id)}
                    onMove={(x, y) => updateTagPosition(tag.id, x, y)}
                  />
                ))}
            </View>

            {tags.length > 0 && (
              <ScrollView
                style={styles.tagListScroll}
                contentContainerStyle={styles.tagList}
                showsVerticalScrollIndicator={false}
              >
                {tags.map((tag, i) => {
                  const details = [
                    tag.brand && `Brand: ${tag.brand}`,
                    tag.store && `Store: ${tag.store}`,
                    tag.price && `Price: $${tag.price}`,
                  ]
                    .filter(Boolean)
                    .join("   ");

                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={styles.tagCard}
                      onPress={() => selectTag(tag.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.tagRowDot,
                          { backgroundColor: tag.color },
                        ]}
                      >
                        <Text style={styles.tagRowDotText}>
                          {tags.findIndex((t) => t.id === tag.id) + 1}
                        </Text>
                      </View>

                      <Text style={styles.tagRowText} numberOfLines={1}>
                        {`Photo ${tag.imageIndex + 1} · ${details || "No details added"}`}
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.postButton]}
              onPress={handleContinue}
            >
              <Text style={styles.postButtonText}>
                {tags.length === 0 ? "Skip tagging" : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tag editor sheet */}
        <Modal
          visible={!!draft}
          transparent
          animationType="slide"
          onRequestClose={() => setDraft(null)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.sheetOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ width: "100%" }}
              >
                <View style={styles.sheet}>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>
                      {draft?.isNew ? "New tag" : "Edit Tag"}
                    </Text>

                    <View style={styles.sheetHeaderActions}>
                      <TouchableOpacity
                        style={[
                          styles.colorSwatchButton,
                          { backgroundColor: draft?.color },
                        ]}
                        onPress={() => setColorPickerOpen((v) => !v)}
                      />
                      <TouchableOpacity onPress={() => setDraft(null)}>
                        <Text style={styles.sheetClose}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {colorPickerOpen && (
                    <View style={styles.colorPickerRow}>
                      {PIN_COLORS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => {
                            draft && setDraft({ ...draft, color: c });
                            setColorPickerOpen(false);
                          }}
                          style={[
                            styles.colorSwatchOption,
                            { backgroundColor: c },
                            draft?.color === c &&
                              styles.colorSwatchOptionSelected,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                  <Text style={styles.fieldLabel}>Brand</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Reformation"
                    placeholderTextColor={colors.textMuted}
                    value={draft?.brand ?? ""}
                    onChangeText={(v) =>
                      draft && setDraft({ ...draft, brand: v })
                    }
                    autoFocus
                  />

                  <Text style={styles.fieldLabel}>Store</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Savers"
                    placeholderTextColor={colors.textMuted}
                    value={draft?.store ?? ""}
                    onChangeText={(v) =>
                      draft && setDraft({ ...draft, store: v })
                    }
                  />

                  <Text style={styles.fieldLabel}>Price</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={draft?.price ?? ""}
                    onChangeText={(v) =>
                      draft &&
                      setDraft({ ...draft, price: v.replace(/[^0-9.]/g, "") })
                    }
                    keyboardType="decimal-pad"
                  />

                  <View style={styles.sheetButtons}>
                    {draft && !draft.isNew && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={deleteDraft}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        styles.postButton,
                        { flex: 1 },
                        !draft?.store.trim() &&
                          !draft?.price.trim() &&
                          !draft?.brand.trim() &&
                          styles.postButtonDisabled,
                      ]}
                      onPress={confirmDraft}
                      disabled={
                        !draft?.store.trim() &&
                        !draft?.price.trim() &&
                        !draft?.brand.trim()
                      }
                    >
                      <Text style={styles.postButtonText}>
                        {draft?.isNew ? "Add tag" : "Save changes"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    dotActive: { backgroundColor: colors.text },
    dotInactive: { backgroundColor: colors.border },
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
    sheetHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    colorSwatchButton: {
      width: 10,
      height: 10,
      borderRadius: 11,
      borderWidth: 1.5,
      marginTop: 2,
      borderColor: colors.border,
      marginRight: 247,
    },
    colorPickerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 16,
      marginTop: -8,
    },
    colorSwatchOption: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: "transparent",
    },
    colorSwatchOptionSelected: {
      borderColor: colors.text,
    },
    tagListScroll: {
      width: "100%",
      maxHeight: 200,
      marginTop: 16,
    },
    tagList: {
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 8,
    },

    tagCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: colors.surface,
      borderRadius: 14,
      width: "100%",
    },
    tagRowText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      textAlign: "left",
    },

    tagInfo: {
      flex: 1,
      gap: 3,
    },
    tagBrand: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    tagMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    tagMetaText: {
      fontSize: 13,
      color: colors.textMuted,
    },

    tagStore: {
      marginTop: 2,
      fontSize: 14,
      color: colors.textSecondary,
    },

    tagPrice: {
      marginTop: 2,
      fontSize: 14,
      color: colors.textSecondary,
    },

    tagEditButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },

    tagEditText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 14,
    },
    modalContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      flex: 1,

      backgroundColor: colors.background,
      paddingTop: 60,
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
    modalTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginTop: 8,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 16,
    },
    previewImage: {
      width: "100%",
      aspectRatio: 1,
      marginBottom: 16,
      borderRadius: 0,
    },
    hintBadge: {
      position: "absolute",
      alignSelf: "center",
      top: "45%",
      backgroundColor: `${colors.surface}CC`,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    hintBadgeText: {
      color: colors.text,
      fontSize: 13,
    },
    pin: {
      position: "absolute",
      width: 26,
      height: 26,
      marginLeft: -13,
      marginTop: -13,
      borderRadius: 13,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    pinText: {
      fontSize: 12,
      fontWeight: "700",
    },

    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      gap: 10,
    },
    tagRowDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    tagRowDotText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#1A0F17",
    },
    tagRowStore: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    tagRowMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    tagRowEdit: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    tagRowEditText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "600",
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 24,
      paddingTop: 8,
    },
    modalButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    postButton: {
      backgroundColor: colors.primary,
    },
    postButtonDisabled: {
      backgroundColor: colors.border,
    },
    postButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    sheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 34,
    },
    sheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    sheetClose: {
      fontSize: 16,
      color: colors.textMuted,
    },
    fieldLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 6,
    },
    fieldInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      marginBottom: 16,
    },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    sheetButtons: {
      flexDirection: "row",
      gap: 10,
    },
    deleteButton: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteButtonText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: "600",
    },
  });
