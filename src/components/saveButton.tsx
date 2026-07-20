import { useTheme } from "@/context/ThemeContext";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export function SaveButton({
  postId,
  size = 22,
  color = "#000",
}: {
  postId: string;
  size?: number;
  color?: string;
}) {
  const {
    collections,
    loadCollections,
    createCollection,
    savePostToCollection,
    unsavePostFromCollection,
    isSaved,
    savedCollectionsFor,
  } = useSavedPosts();
  const [showPicker, setShowPicker] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);
  useEffect(() => {
    if (showPicker) loadCollections();
  }, [showPicker]);

  const saved = isSaved(postId);
  const savedIn = savedCollectionsFor(postId);

  const handleToggleCollection = async (collectionId: string) => {
    if (savedIn.includes(collectionId)) {
      await unsavePostFromCollection(postId, collectionId);
    } else {
      await savePostToCollection(postId, collectionId);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    setIsCreating(true);
    try {
      const collection = await createCollection(newCollectionName.trim());
      if (collection) {
        await savePostToCollection(postId, collection.id);
        setNewCollectionName("");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create collection.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={() => setShowPicker(true)}>
        <Ionicons
          name={saved ? "bookmark" : "bookmark-outline"}
          size={size}
          color={color}
        />
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={10}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              <Text style={styles.title}>Save to...</Text>

              {collections.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.row}
                  onPress={() => handleToggleCollection(c.id)}
                >
                  <Text style={styles.rowText}>{c.name}</Text>
                  <Ionicons
                    name={
                      savedIn.includes(c.id)
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={22}
                    color={
                      savedIn.includes(c.id) ? colors.text : colors.textMuted
                    }
                  />
                </TouchableOpacity>
              ))}

              <View style={styles.newRow}>
                <TextInput
                  placeholder="New collection name"
                  placeholderTextColor={colors.textMuted}
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  style={styles.input}
                />
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateCollection}
                  disabled={isCreating}
                >
                  <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      maxHeight: "70%",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 16,
      color: colors.text,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowText: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.text,
    },
    newRow: { flexDirection: "row", gap: 8, marginTop: 16 },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    createButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    createButtonText: {
      color: colors.background,
      fontWeight: "600",
      fontSize: 14,
    },
    doneButton: { marginTop: 20, alignItems: "center", padding: 12 },
    doneButtonText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "600",
    },
  });
