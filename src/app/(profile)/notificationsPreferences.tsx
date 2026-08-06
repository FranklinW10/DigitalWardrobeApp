import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator, ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationPrefs = {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  follow_requests: boolean;
  replies: boolean;
  reminders: boolean;
};

type NotificationRowProps = {
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  colors: any;
};

const NotificationRow = ({
  label,
  description,
  value,
  onToggle,
  styles,
  colors,
}: NotificationRowProps) => (
  <View style={styles.notificationRow}>
    <View style={styles.notificationContent}>
      <Text style={styles.notificationLabel}>{label}</Text>
      <Text style={styles.notificationDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: colors.border }}
      thumbColor={colors.text}
    />
  </View>
);

export default function NotificationSettings() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    likes: true,
    comments: true,
    follows: true,
    follow_requests: true,
    replies: true,
    reminders: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrefs();
  }, [user?.id]);

  const loadPrefs = async () => {
    if (!user) return;
    try {
      const { data, error: selectError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPrefs({
          likes: data.likes ?? true,
          comments: data.comments ?? true,
          follows: data.follows ?? true,
          follow_requests: data.follow_requests ?? true,
          replies: data.replies ?? true,
          reminders: data.reminders ?? true,
        });
      } else {
        // User not in table, create default record
        const defaultPrefs = {
          user_id: user.id,
          likes: true,
          comments: true,
          follows: true,
          follow_requests: true,
          replies: true,
        };

        const { error: insertError } = await supabase
          .from("notification_preferences")
          .insert(defaultPrefs);

        if (insertError) {
          console.error("Error creating notification prefs:", insertError);
        } else {
          setPrefs({
            likes: true,
            comments: true,
            follows: true,
            follow_requests: true,
            replies: true,
            reminders: true,
          });
        }
      }
    } catch (error) {
      console.error("Error loading notification prefs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user) return;

    setPrefs((prev) => ({ ...prev, [key]: value }));

    try {
      await supabase
        .from("notification_preferences")
        .update({ [key]: value })
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error updating notification pref:", error);
      // Revert on error
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Push Notification Types</Text>
          <View style={styles.section}>
            <NotificationRow
              label="Likes"
              description="When someone likes your post"
              value={prefs.likes}
              onToggle={(v) => updatePref("likes", v)}
              styles={styles}
              colors={colors}
            />
            <View style={styles.divider} />

            <NotificationRow
              label="Comments"
              description="When someone comments on your post"
              value={prefs.comments}
              onToggle={(v) => updatePref("comments", v)}
              styles={styles}
              colors={colors}
            />
            <View style={styles.divider} />

            <NotificationRow
              label="Replies"
              description="When someone replies to your comment"
              value={prefs.replies}
              onToggle={(v) => updatePref("replies", v)}
              styles={styles}
              colors={colors}
            />
            <View style={styles.divider} />

            <NotificationRow
              label="New Followers"
              description="When someone follows you"
              value={prefs.follows}
              onToggle={(v) => updatePref("follows", v)}
              styles={styles}
              colors={colors}
            />
            <View style={styles.divider} />

            <NotificationRow
              label="Follow Requests"
              description="When someone requests to follow you"
              value={prefs.follow_requests}
              onToggle={(v) => updatePref("follow_requests", v)}
              styles={styles}
              colors={colors}
            />
            <View style={styles.divider} />

            <NotificationRow
              label="Daily Reminders"
              description="When you are reminded to check the app each day"
              value={prefs.reminders}
              onToggle={(v) => updatePref("reminders", v)}
              styles={styles}
              colors={colors}
            />
          </View>

          <Text style={styles.sectionTitle}>Other</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Marketing & Updates</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

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
      marginBottom: 12,
      marginLeft: 4,
    },
    section: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 32,
      overflow: "hidden",
    },
    notificationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.card || colors.surface,
    },
    notificationContent: {
      flex: 1,
      marginRight: 12,
    },
    notificationLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    notificationDescription: {
      fontSize: 13,
      color: colors.textMuted,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.card || colors.surface,
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
  });
