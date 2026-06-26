import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
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

type SettingRowProps = {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
};

const SettingRow = ({ label, onPress, destructive }: SettingRowProps) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
    <Text style={[styles.rowLabel, destructive && styles.destructiveText]}>
      {label}
    </Text>
    {!destructive && <Ionicons name="chevron-forward" size={18} color="#999" />}
  </TouchableOpacity>
);

export default function Settings() {
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
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
  const handleDeleteAccount = () => {
    Alert.alert("Delete Account", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete Account ",
        style: "destructive",
        onPress: () => handleDeleteAccountFinal(),
      },
    ]);
  };
  const handleDeleteAccountFinal = () => {
    Alert.prompt(
      "Confirm Deletion",
      'Type "DELETE ACCOUNT" to confirm',
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async (input: string | undefined) => {
            if (input?.trim() === "DELETE ACCOUNT") {
              try {
                const {
                  data: { session },
                } = await supabase.auth.getSession();

                const response = await fetch(
                  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${session?.access_token}`,
                    },
                  },
                );

                if (!response.ok) throw new Error("Failed to delete account");

                await signOut();
                router.replace("/(auth)/login");
              } catch (error) {
                Alert.alert(
                  "Error",
                  "Failed to delete account. Please try again.",
                );
              }
            } else {
              Alert.alert(
                "Incorrect",
                'You must type "DELETE ACCOUNT" exactly.',
              );
            }
          },
        },
      ],
      "plain-text",
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <SettingRow label="Edit Profile" />
          <View style={styles.divider} />
          <SettingRow label="Notifications" />
          <View style={styles.divider} />
          <SettingRow label="Privacy" />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <SettingRow label="Help & Support" />
          <View style={styles.divider} />
          <SettingRow label="Terms of Service" />
          <View style={styles.divider} />
          <SettingRow label="Privacy Policy" />
        </View>

        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.section}>
          <SettingRow label="Sign Out" onPress={handleSignOut} />
          <View style={styles.divider} />
          <SettingRow
            label="Delete Account"
            onPress={handleDeleteAccount}
            destructive
          />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  back: {
    fontSize: 22,
    color: "#000",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  content: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 32,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  rowLabel: {
    fontSize: 16,
    color: "#000",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e0e0e0",
    marginLeft: 16,
  },
  destructiveText: {
    color: "#ff3b30",
  },
});
