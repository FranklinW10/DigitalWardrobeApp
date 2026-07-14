import { useAuth } from "@/context/AuthContext";
import { useContactFriends } from "@/hooks/useContactFriends";
import { useFollows } from "@/hooks/useFollows";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddFriendsScreen() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const { matches, isLoading, findFriendsFromContacts } = useContactFriends();
  const { addFollow, unfollowUser, isFollowing, isPending, loadFollowing } =
    useFollows();
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    loadFollowing();
    findFriendsFromContacts();
  }, []);

  const handleContinue = async () => {
    setIsFinishing(true);
    try {
      await updateUser({ friendsStepCompleted: true });
      // No explicit navigation needed — RouteGaurd sees the updated
      // user object and redirects to (tabs) on its own.
    } catch (error) {
      console.error("Error completing friends step:", error);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Friends</Text>
        <Text style={styles.subtitle}>
          See who from your contacts is already here
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color="#ccc" />
          <Text style={styles.emptyText}>
            No contacts found using the app yet
          </Text>
        </View>
      ) : (
        matches.map((m) => (
          <View key={m.id} style={styles.row}>
            <View style={styles.userInfo}>
              {m.profile_image_url ? (
                <Image
                  source={{ uri: m.profile_image_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {m.name?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.username}>@{m.username}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing(m.id) && styles.followingButton,
                isPending(m.id) && styles.pendingButton,
              ]}
              onPress={() =>
                isFollowing(m.id) || isPending(m.id)
                  ? unfollowUser(m.id)
                  : addFollow(m.id)
              }
            >
              <Text
                style={[
                  styles.followButtonText,
                  (isFollowing(m.id) || isPending(m.id)) &&
                    styles.followingButtonText,
                ]}
              >
                {isFollowing(m.id)
                  ? "Following"
                  : isPending(m.id)
                    ? "Requested"
                    : "Follow"}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        disabled={isFinishing}
      >
        {isFinishing ? (
          <ActivityIndicator size={24} color="#fff" />
        ) : (
          <Text style={styles.buttontext}>
            {matches.length === 0 ? "Continue" : "Done"}
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#666" },
  emptyContainer: { alignItems: "center", marginTop: 40, gap: 8, flex: 1 },
  emptyText: { color: "#999", fontSize: 14, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "600", fontSize: 16 },
  name: { fontWeight: "600", fontSize: 14 },
  username: { color: "#888", fontSize: 12 },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
  },
  followingButton: { backgroundColor: "#000" },
  pendingButton: { backgroundColor: "#ccc" },
  followButtonText: { fontWeight: "600", fontSize: 13 },
  followingButtonText: { color: "#fff" },
  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttontext: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
