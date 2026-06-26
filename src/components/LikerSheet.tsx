import { Liker } from "@/hooks/useLikes";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Liked by</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={likers}
              keyExtractor={(item) => item.user_id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>No likes yet</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    onClose();
                    router.push(`/(profile)/${item.user_id}`);
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
                    <Text style={styles.name}>{item.profiles?.name}</Text>
                    <Text style={styles.username}>
                      @{item.profiles?.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
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
