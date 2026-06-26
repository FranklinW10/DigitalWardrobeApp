import { useAuth } from "@/context/AuthContext";
import { Liker } from "@/hooks/useLikes";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
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

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);
  if (!visible) return null;
  const { user } = useAuth();
  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backgroundStyle={styles.background}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Liked by</Text>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color="#000" />
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
              {item.profiles?.profile_image_url ? (
                <Image
                  source={{ uri: item.profiles.profile_image_url }}
                  style={styles.avatar}
                  cachePolicy="memory"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {item.profiles?.name?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
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
  title: { fontSize: 16, fontWeight: "700" },
  list: { padding: 16, gap: 16 },
  empty: { textAlign: "center", color: "#999", marginTop: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "600", color: "#666" },
  name: { fontSize: 15, fontWeight: "600" },
  username: { fontSize: 13, color: "#888" },
});
