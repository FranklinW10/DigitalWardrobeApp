import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function settings() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}> Edit Profile</Text>
            <Text style={styles.settingValue}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}> Notifacations</Text>
            <Text style={styles.settingValue}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Privacy</Text>
            <Text style={styles.settingValue}>➔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Help & Support</Text>
            <Text style={styles.settingValue}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Text style={styles.settingValue}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.settingValue}>➔</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.settingItem, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, styles.deleteButton]}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 32,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    fontSize: 40,
    fontWeight: "600",
    color: "#666",
  },
  editBadge: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    transform: [{ translateX: -22 }],
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#000",
  },
  username: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#999",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 18,
    color: "#999",
  },
  settingValue: {
    fontSize: 18,
    color: "#999",
  },
  signOutButton: {
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
  },
  signOutText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  deleteText: {
    fontSize: 16,
    color: "#ff3b30",
    fontWeight: "500",
  },

  header: {
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: "#000",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 16,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
  },
  followButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 24,
  },
  followingButton: {
    backgroundColor: "#000",
  },
  followButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  followingButtonText: {
    color: "#fff",
  },
  postsHeader: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  postImage: {
    width: "100%",
    height: 300,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  topHeaderUsername: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {},
  closeButtonText: {
    fontSize: 22,
    color: "#000",
    fontWeight: "400",
  },
});
