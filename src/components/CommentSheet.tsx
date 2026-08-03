import { LikersSheet } from "@/components/LikerSheet";
import { ReportModal } from "@/components/reportModal";
import { StreakAvatar } from "@/components/StreakAvatar";
import { useAuth } from "@/context/AuthContext";
import { useBlocks } from "@/context/BlocksContext";
import { useTheme } from "@/context/ThemeContext";
import { Comment, useComments } from "@/hooks/useComments";
import { Liker } from "@/hooks/useLikes";
import { formatTimeAgo } from "@/lib/date-helper";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Dimensions } from "react-native";

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
import { useSafeAreaInsets } from "react-native-safe-area-context";
const SCREEN_HEIGHT = Dimensions.get("window").height;
interface CommentsSheetProps {
  postId: string;
  postOwnerId: string;
  visible: boolean;
  onClose: () => void;
}

interface ReplyTarget {
  commentId: string;
  userId: string;
  username: string;
}

export const CommentsSheet = ({
  postId,
  postOwnerId,
  visible,
  onClose,
}: CommentsSheetProps) => {
  const { user } = useAuth();
  const {
    comments,
    addComment,
    deleteComment,
    toggleCommentLike,
    fetchCommentLikers,
  } = useComments(postId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set(),
  );
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["94%", "75%"], []);
  const textRef = useRef("");
  const inputRef = useRef<any>(null);
  const { colors } = useTheme();
  const { blockUser } = useBlocks();
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  // In the CommentsSheet component:
  const { blockedIds, blockedByIds } = useBlocks();
  const allBlockedIds = new Set([...blockedIds, ...blockedByIds]);
  useEffect(() => {
    console.log("CommentsSheet mounted");

    return () => {
      console.log("CommentsSheet unmounted");
    };
  }, []);

  // Comment-likers sheet state
  const [showLikers, setShowLikers] = useState(false);
  const [commentLikers, setCommentLikers] = useState<Liker[]>([]);
  const [isLoadingLikers, setIsLoadingLikers] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
      setReplyTarget(null);
    }
  }, [visible]);

  const handleLongPressComment = useCallback(
    (item: Comment) => {
      const isOwnComment = item.user_id === user?.id;
      if (isOwnComment) return; // no report/block on your own comments

      Alert.alert("Comment Options", "", [
        {
          text: "Report Comment",
          onPress: () => setReportTarget(item.id),
        },
        {
          text: "Block User",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Block this user?",
              `You won't see content from @${item.profiles?.username} anymore.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Block",
                  style: "destructive",
                  onPress: () => blockUser(item.user_id),
                },
              ],
            );
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [user, blockUser],
  );

  const handleSubmit = useCallback(async () => {
    const val = textRef.current.trim();
    if (!val || !user) return;
    try {
      await addComment(
        val,
        postOwnerId,
        replyTarget?.commentId,
        replyTarget?.userId,
      );
      textRef.current = "";
      inputRef.current?.clear();
      setReplyTarget(null);
    } finally {
      // nothing
    }
  }, [user, addComment, postOwnerId, replyTarget]);

  const startReply = useCallback(
    (topLevelCommentId: string, userId: string, username: string) => {
      setReplyTarget({ commentId: topLevelCommentId, userId, username });
      inputRef.current?.focus();
    },
    [],
  );

  const cancelReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  const navigateToProfile = (userId: string) => {
    onClose();

    // Small delay lets the bottom sheet dismiss smoothly before navigation
    setTimeout(() => {
      router.push({
        pathname: "/[user_id]",
        params: {
          user_id: userId,
        },
      });
    }, 100);
  };
  const handleOpenCommentLikers = useCallback(
    async (commentId: string) => {
      setShowLikers(true);
      setIsLoadingLikers(true);
      try {
        const likers = await fetchCommentLikers(commentId);
        console.log("comment likers:", likers);

        // Filter out blocked users
        const filtered =
          (likers as any[])?.filter(
            (liker) => !allBlockedIds.has(liker.user_id),
          ) ?? [];

        setCommentLikers(filtered);
      } finally {
        setIsLoadingLikers(false);
      }
    },
    [fetchCommentLikers, allBlockedIds],
  );

  const renderFooter = useCallback(
    (props: any) => (
      <BottomSheetFooter {...props}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={10}
        >
          {replyTarget && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>
                Replying to @{replyTarget.username}
              </Text>
              <TouchableOpacity onPress={cancelReply} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

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
              placeholder={
                replyTarget
                  ? `Reply to @${replyTarget.username}...`
                  : "Add a comment..."
              }
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
    [isSubmitting, user, handleSubmit, replyTarget, cancelReply],
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);

  if (!visible) return null;

  const renderCommentRow = (item: Comment, isReply: boolean) => {
    const isExpanded = expandedReplies.has(item.id);
    const hasReplies = !isReply && item.replies.length > 0;
    const isOwnComment = item.user_id === user?.id;

    return (
      <View>
        <View style={[styles.comment, isReply && styles.replyIndent]}>
          <TouchableOpacity
            onPress={() =>
              navigateToProfile(isOwnComment ? user?.id! : item.user_id)
            }
          >
            <StreakAvatar
              uri={item.profiles?.profile_image_url}
              initial={item.profiles?.username?.[0]?.toUpperCase() || "U"}
              streak={item.profiles?.streak ?? 0}
              size={item.parent_comment_id ? 30 : 36}
              colors={colors}
              RING_WIDTH={1.5}
              RING_GAP={1}
            />
          </TouchableOpacity>

          <View style={styles.commentContent}>
            <TouchableOpacity
              onPress={() =>
                navigateToProfile(isOwnComment ? user?.id! : item.user_id)
              }
              onLongPress={() => handleLongPressComment(item)}
              delayLongPress={350}
            >
              <View style={styles.commentHeaderRow}>
                <Text style={styles.commentUsername}>
                  @{item.profiles?.username}
                </Text>
                <Text style={styles.commentTime}>
                  {formatTimeAgo(item.created_at)}
                </Text>
              </View>
              <Text style={styles.commentText}>{item.content}</Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              {!isReply && (
                <TouchableOpacity
                  style={styles.actionRowItem}
                  onPress={() =>
                    startReply(
                      item.id,
                      item.user_id,
                      item.profiles?.username ?? "",
                    )
                  }
                  hitSlop={6}
                >
                  <Text style={styles.actionRowText}>Reply</Text>
                </TouchableOpacity>
              )}

              {item.user_id === user?.id && (
                <TouchableOpacity
                  style={styles.actionRowItem}
                  onPress={() =>
                    Alert.alert(
                      "Delete Comment",
                      "Are you sure you would like to delete this comment?",
                      [
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteComment(item.id),
                        },
                      ],
                    )
                  }
                  hitSlop={6}
                >
                  <Text style={styles.actionRowText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>

            {hasReplies && (
              <TouchableOpacity
                onPress={() => toggleReplies(item.id)}
                hitSlop={6}
                style={styles.viewRepliesButton}
              >
                <View style={styles.viewRepliesLine} />
                <Text style={styles.viewRepliesText}>
                  {isExpanded
                    ? "Hide replies"
                    : `View ${item.replies.length} ${
                        item.replies.length === 1 ? "reply" : "replies"
                      }`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[isReply ? styles.replylikeContainer : styles.likeContainer]}
          >
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => toggleCommentLike(item.id, item.user_id)}
            >
              <Ionicons
                name={item.is_liked ? "heart" : "heart-outline"}
                size={14}
                color={item.is_liked ? colors.accent : colors.textMuted}
              />
            </TouchableOpacity>
            {item.like_count > 0 && (
              <TouchableOpacity
                onPress={() => handleOpenCommentLikers(item.id)}
                hitSlop={6}
              >
                <Text style={styles.likeButtonText}>{item.like_count}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {hasReplies &&
          isExpanded &&
          item.replies.map((reply) => (
            <View key={reply.id}>{renderCommentRow(reply, true)}</View>
          ))}
      </View>
    );
  };
  const insets = useSafeAreaInsets();

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        enablePanDownToClose
        maxDynamicContentSize={SCREEN_HEIGHT - insets.top - 200} // 👈 hard cap, leaves a gap under the notch
        onDismiss={onClose}
        backgroundStyle={styles.background}
        footerComponent={renderFooter}
        handleStyle={styles.handle}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Comments</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <BottomSheetFlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No comments yet.</Text>
          }
          renderItem={({ item }) => renderCommentRow(item, false)}
        />
      </BottomSheetModal>
      <LikersSheet
        likers={commentLikers}
        isLoading={isLoadingLikers}
        visible={showLikers}
        onClose={() => setShowLikers(false)}
      />
      <ReportModal
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        targetType="comment"
        targetId={reportTarget ?? ""}
      />
    </>
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
    viewRepliesButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    viewRepliesLine: {
      width: 16,
      height: 1,
      backgroundColor: colors.border,
    },
    viewRepliesText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    commentTime: {
      fontSize: 11,
      color: colors.textMuted,
    },
    background: {
      backgroundColor: colors.background,
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
      paddingBottom: 100,
      gap: 16,
    },
    likeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingTop: 20,
    },
    replylikeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingTop: 6,
    },
    handle: {
      backgroundColor: colors.background,
      paddingTop: 8,
      paddingBottom: 4,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
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
      marginTop: 0,
    },
    replyIndent: {
      marginLeft: 30,
      marginTop: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    BannerX: {
      marginBottom: 8,
    },
    replyAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
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
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginTop: 6,
    },
    actionRowItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    actionRowText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    likeButton: {
      padding: 0,
    },

    likeButtonText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textMuted,
    },
    replyBanner: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    replyBannerText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingBottom: 32,
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
