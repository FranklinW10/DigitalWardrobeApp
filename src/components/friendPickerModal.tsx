import { useTheme } from "@/context/ThemeContext";
import { useFriendSearch, User } from "@/hooks/useFriendSearch";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface FriendPickerModalProps {
  visible: boolean;
  onClose: () => void;
  // Called with array of selected user IDs when user confirms
  onSelectFriends: (friendIds: string[]) => void;
  currentUserId?: string; // Current user ID to prioritize friends
  excludeUserIds?: string[]; 
}

export const FriendPickerModal = ({
  visible,
  onClose,
  onSelectFriends,
  currentUserId,
  excludeUserIds = [],
  
}: FriendPickerModalProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { users, loading, searchUsers } = useFriendSearch(currentUserId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    new Set()
  );

const availableUsers = users.filter((u) => !excludeUserIds.includes(u.id));
  // Clear search when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
      setSelectedFriendIds(new Set());
    }
  }, [visible]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const toggleFriend = (userId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onSelectFriends(Array.from(selectedFriendIds));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Tag friends</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="done"
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => handleSearch("")}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading && searchQuery ? (
            <View style={styles.emptyContent}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : availableUsers.length === 0 && searchQuery ? (
            <View style={styles.emptyContent}>
              <Text style={styles.emptyText}>No friends found</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.listContent}>
                {availableUsers.map((user) => {
                  const isSelected = selectedFriendIds.has(user.id);

                  return (
                    <Pressable
                      key={user.id}
                      style={({ pressed }) => [
                        styles.userRow,
                        pressed && { opacity: 0.6 },
                      ]}
                      onPress={() => toggleFriend(user.id)}
                    >
                      <View style={styles.userImageWrap}>
                        {user.profile_image_url ? (
                          <Image
                            source={{ uri: user.profile_image_url }}
                            style={styles.userImage}
                          />
                        ) : (
                          <View style={styles.userImagePlaceholder}>
                            <Ionicons
                              name="person-circle"
                              size={40}
                              color={colors.textMuted}
                            />
                          </View>
                        )}
                      </View>

                      <View style={styles.userTextContainer}>
                        <View style={styles.userNameRow}>
                          {user.name ? (
                            <Text style={styles.userName} numberOfLines={1}>
                              {user.name}
                            </Text>
                          ) : null}
                          {user.isFollowing && (
                            <View style={styles.followingBadge}>
                              <Text style={styles.followingBadgeText}>
                                Following
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.userUsername} numberOfLines={1}>
                          @{user.username}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.checkbox,
                          isSelected && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={colors.background}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedFriendIds.size === 0 && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selectedFriendIds.size === 0}
            >
              <Text style={styles.confirmButtonText}>
                {selectedFriendIds.size === 0
                  ? "Select friends"
                  : `Tag ${selectedFriendIds.size} ${
                      selectedFriendIds.size === 1 ? "friend" : "friends"
                    }`}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
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
      paddingBottom: 20,
      maxHeight: "80%",
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
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      borderWidth: 0, // Remove if you had it
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    list: {
      maxHeight: 400,
    },
    listContent: {
      gap: 10,
    },
    emptyContent: {
      paddingVertical: 40,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 12,
    },
    userImageWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: "hidden",
    },
    userImage: {
      width: "100%",
      height: "100%",
    },
    userImagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    userTextContainer: {
      flex: 1,
      gap: 2,
    },
    userNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    userName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    followingBadge: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    followingBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.primary,
    },
    userUsername: {
      fontSize: 13,
      color: colors.textMuted,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    footer: {
      paddingTop: 12,
      gap: 8,
    },
    confirmButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    confirmButtonDisabled: {
      backgroundColor: colors.border,
      opacity: 0.5,
    },
    confirmButtonText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: "600",
    },
  });