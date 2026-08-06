import { useAuth } from "@/context/AuthContext";
import { useBlocks } from "@/context/BlocksContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Linking } from "react-native";

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
  styles: ReturnType<typeof createStyles>;
  mutedColor: string;
};

const SettingRow = ({
  label,
  onPress,
  destructive,
  styles,
  mutedColor,
}: SettingRowProps) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
    <Text style={[styles.rowLabel, destructive && styles.destructiveText]}>
      {label}
    </Text>
    {!destructive && (
      <Ionicons name="chevron-forward" size={18} color={mutedColor} />
    )}
  </TouchableOpacity>
);
export default function Settings() {
  const { blockedIds } = useBlocks();
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const PRIVACY_POLICY_URL = "https://franklinw10.github.io/FitCheck-Legal/";
  const TERMS_OF_SERVICE_URL =
    "https://franklinw10.github.io/FitCheck-Legal/terms-of-service.html";
  const SUPPORT_URL =
    "https://franklinw10.github.io/FitCheck-Legal/help-support.html";

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
          <SettingRow
            label="Edit Profile"
            onPress={() => router.push("/(profile)/EditProfile")}
            styles={styles}
            mutedColor={colors.textMuted}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Notifications"
            onPress={() => router.push("/(profile)/notificationsPreferences")}
            styles={styles}
            mutedColor={colors.textMuted}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Blocked Users"
            onPress={() => router.push("/(profile)/blockedUsers")}
            styles={styles}
            mutedColor={colors.textMuted}
          />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <SettingRow
            label="Help & Support"
            onPress={() => Linking.openURL(SUPPORT_URL)}
            styles={styles}
            mutedColor={colors.textMuted}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Terms of Service"
            onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
            styles={styles}
            mutedColor={colors.textMuted}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Privacy Policy"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            styles={styles}
            mutedColor={colors.textMuted}
          />
        </View>

        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.section}>
          <SettingRow
            label="Sign Out"
            onPress={handleSignOut}
            styles={styles}
            mutedColor={colors.textMuted}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Delete Account"
            onPress={handleDeleteAccount}
            destructive
            styles={styles}
            mutedColor={colors.textMuted}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    back: {
      fontSize: 22,
      color: colors.text,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    content: {
      paddingTop: 32,
      paddingHorizontal: 24,
      paddingBottom: 48,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 8,
      marginLeft: 4,
    },
    section: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
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
      backgroundColor: colors.card || colors.surface, // Standard row surface background
    },
    rowLabel: {
      fontSize: 16,
      color: colors.text,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 16,
    },
    destructiveText: {
      color: colors.destructive || "#ff3b30", // Fallback to safe system red if token isn't present
    },
  });
