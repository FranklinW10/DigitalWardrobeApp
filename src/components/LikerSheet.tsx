import { StreakAvatar } from "@/components/StreakAvatar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Liker } from "@/hooks/useLikes";

import { Ionicons } from "@expo/vector-icons";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface LikersSheetProps {
  likers: Liker[];
  isLoading: boolean;
  visible: boolean;
  onClose: () => void;
}

export const LikersSheet = ({
  likers,
  isLoading,
  visible,
  onClose,
}: LikersSheetProps) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["94%", "75%"], []);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useAuth();

  useEffect(() => {
    console.log("visible:", visible);
    if (visible) {
      console.log("present()");
      bottomSheetRef.current?.present();
    } else {
      console.log("dismiss()");
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      console.log("LikersSheet unmounted");
    };
  }, []);

  // Generate the stylesheet dynamically using the current theme colors

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
      stackBehavior="push"
      onChange={(index) => console.log("sheet index", index)}
      onDismiss={() => {
        console.log("dismissed");
        onClose();
      }}
      backgroundStyle={styles.background}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Liked by</Text>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <BottomSheetFlatList
          data={likers}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No likes yet</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                handleClose();
                {
                  item.user_id === user?.id
                    ? router.push(`/(tabs)/profile`)
                    : router.push(`/(profile)/${item.user_id}`);
                }
              }}
            >
              <StreakAvatar
                uri={item.profiles?.profile_image_url}
                initial={item.profiles?.username?.[0]?.toUpperCase() || "U"}
                streak={item.profiles?.streak ?? 0}
                size={40}
                colors={colors}
                RING_WIDTH={2.5}
                RING_GAP={2}
              />
              <View>
                <Text style={styles.name}>
                  {item.user_id === user?.id ? "You" : item.profiles?.name}
                </Text>
                <Text style={styles.username}>@{item.profiles?.username}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </BottomSheetModal>
  );
};
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
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
    list: { padding: 16, gap: 16 },
    empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPlaceholder: {
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textMuted,
    },
    name: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    username: {
      fontSize: 13,
      color: colors.textMuted,
    },
    handle: {
      backgroundColor: colors.background,
      paddingTop: 8,
      paddingBottom: 4,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    handleIndicator: {
      backgroundColor: colors.border,
      width: 36,
      height: 4,
    },
  });
