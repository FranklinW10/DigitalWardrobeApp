import { useAuth } from "@/context/AuthContext";
import { useComments } from "@/hooks/useComments";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";

import {
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetModal,
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
                cachePolicy="none"
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
              placeholderTextColor="#999"
              onChangeText={(val) => {
                textRef.current = val;
              }}
              multiline
            />
            <TouchableOpacity onPress={handleSubmit}>
              <Ionicons name="send" size={24} color={"#000"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BottomSheetFooter>
    ),
    [isSubmitting, user],
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
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comments</Text>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color="#000" />
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
                cachePolicy="none"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.profiles?.username?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={styles.commentContent}>
              <Text style={styles.commentUsername}>
                @{item.profiles?.username}
              </Text>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
            {/* Delete if own comment */}
            {item.user_id === user?.id && (
              <TouchableOpacity onPress={() => deleteComment(item.id)}>
                <Ionicons name="trash-outline" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Input */}
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#fff",
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
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  list: {
    padding: 16,
    gap: 16,
  },
  empty: {
    textAlign: "center",
    color: "#999",
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
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: "#333",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
    backgroundColor: "#fff",
    minHeight: 70,
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
