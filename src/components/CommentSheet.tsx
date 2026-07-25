import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useComments } from "@/hooks/useComments";
import { formatTimeAgo } from "@/lib/date-helper";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CommentsSheetProps {
  postId: string;
  postOwnerId: string;
  visible: boolean;
  onClose: () => void;
}

export const CommentsSheet = ({
  postId,
  postOwnerId,
  visible,
  onClose,
}: CommentsSheetProps) => {
  const { user } = useAuth();
  const { comments, addComment, deleteComment } = useComments(postId);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["94%", "75%"], []);
  const textRef = useRef("");
  const inputRef = useRef<any>(null);
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    const val = textRef.current.trim();
    if (!val || !user) return;
    try {
      await addComment(val, postOwnerId);
      textRef.current = "";
      inputRef.current?.clear();
    } finally {
      // nothing
    }
  }, [user, addComment, postOwnerId]);

  const renderFooter = useCallback(
    (props: any) => (
      <BottomSheetFooter {...props} bottomInset={24}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={10}
        >
          <View style={styles.inputRow}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.inputAvatar}
                cachePolicy="memory"
              />
            ) : (
              <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}

            <BottomSheetTextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              onChangeText={(val) => {
                textRef.current = val;
              }}
              multiline
            />
            <TouchableOpacity onPress={handleSubmit}>
              <Ionicons name="send" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BottomSheetFooter>
    ),
    [isSubmitting, user, handleSubmit],
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backgroundStyle={styles.background}
      footerComponent={renderFooter}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comments</Text>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Comments list */}
      <BottomSheetFlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No comments yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            {item.profiles?.profile_image_url ? (
              <Image
                source={{ uri: item.profiles.profile_image_url }}
                style={styles.avatar}
                cachePolicy="memory"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.profiles?.username?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={styles.commentContent}>
              <View style={styles.commentHeaderRow}>
                <Text style={styles.commentUsername}>
                  @{item.profiles?.username}
                </Text>
                <Text style={styles.commentTime}>
                  {formatTimeAgo(item.created_at)}
                </Text>
              </View>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
            {/* Delete if own comment */}
            {item.user_id === user?.id && (
              <TouchableOpacity onPress={() => deleteComment(item.id)}>
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Input */}
    </BottomSheetModal>
  );
};
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    commentHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 2,
    },
    commentTime: {
      fontSize: 11,
      color: colors.textMuted,
    },
    background: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    list: {
      padding: 16,
      gap: 16,
    },
    handle: {
      backgroundColor: colors.background,
      paddingTop: 8,
      paddingBottom: 4,
    },
    handleIndicator: {
      backgroundColor: colors.border,
      width: 36,
      height: 4,
    },
    empty: {
      textAlign: "center",
      color: colors.textMuted,
      marginTop: 32,
    },
    comment: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    avatarPlaceholder: {
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
    },
    commentContent: {
      flex: 1,
    },
    commentUsername: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 2,
      color: colors.text,
    },
    commentText: {
      fontSize: 14,
      color: colors.text,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
      backgroundColor: colors.background,
      minHeight: 70,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      maxHeight: 100,
    },
    inputAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
  });
