import { useTheme } from "@/context/ThemeContext";
import { Tag, useTags } from "@/hooks/useTags";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface TagPickerModalProps {
  visible: boolean;
  onClose: () => void;
  // Called with the full Tag the user tapped. The screen that placed this
  // modal is responsible for turning it into a PostTagInput (adding
  // location_x/location_y from the tap point, and imageIndex).
  onSelectTag: (tag: Tag) => void;
}

export const TagPickerModal = ({
  visible,
  onClose,
  onSelectTag,
}: TagPickerModalProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { tags, loadUserTags } = useTags();

  // Refresh the list every time the modal opens, so a tag created moments
  // ago (e.g. earlier in this same post-creation flow) shows up.
  useEffect(() => {
    if (visible) {
      loadUserTags();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Choose a tag</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {tags.length === 0 ? (
            <View style={styles.emptyContent}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.list}>
                {tags.map((tag) => {
                  const tagImage = tag.tag_image || tag.image_url || null;

                  return (
                    <Pressable
                      key={tag.id}
                      style={({ pressed }) => [
                        styles.tagRow,
                        pressed && { opacity: 0.6 },
                      ]}
                      onPress={() => {
                        onSelectTag(tag);
                        onClose();
                      }}
                    >
                      <View style={styles.tagImageWrap}>
                        {tagImage ? (
                          <Image
                            source={{ uri: tagImage }}
                            style={styles.tagImage}
                          />
                        ) : (
                          <View style={styles.tagImagePlaceholder}>
                            <Ionicons
                              name="pricetag-outline"
                              size={20}
                              color={colors.textMuted}
                            />
                          </View>
                        )}
                      </View>

                      <View style={styles.tagTextContainer}>
                        {tag.name ? (
                          <Text style={styles.tagTitle} numberOfLines={1}>
                            {tag.name}
                          </Text>
                        ) : null}

                        <View style={{ gap: 1 }}>
                          {tag.brand ? (
                            <Text style={styles.tagDetails} numberOfLines={1}>
                              {tag.brand}
                            </Text>
                          ) : null}
                          {tag.store ? (
                            <Text style={styles.tagDetails} numberOfLines={1}>
                              {tag.store}
                            </Text>
                          ) : null}
                          {tag.price ? (
                            <Text style={styles.tagDetails} numberOfLines={1}>
                              ${tag.price}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {tag.favorite && (
                        <Ionicons name="star" size={16} color={colors.accent} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    tagTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    tagDetails: {
      fontSize: 12,
      color: colors.textMuted,
      fontFamily: "System",
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 36,
      maxHeight: "75%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    list: {
      gap: 10,
    },
    emptyContent: {
      paddingVertical: 40,
      alignItems: "center",
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 12,
    },
    tagImageWrap: {
      width: 70,
      height: 70,
      borderRadius: 12,
      overflow: "hidden",
    },
    tagImage: {
      width: "100%",
      height: "100%",
    },
    tagImagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    tagTextContainer: {
      flex: 1,
      gap: 2,
    },
    tagText: {
      fontSize: 13,
      color: colors.text,
    },
  });
