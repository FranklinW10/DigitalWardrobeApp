import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usePosts } from "@/hooks/usePosts";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationPermissionModal } from "@/components/NotificationPermissionModal";
import { PostedGodModal } from "@/components/PostedGodModal";
import {
  Animated,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function TabsLayout() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const { posts, refreshPosts } = usePosts();
  const { user } = useAuth();

  const sheetY = useRef(new Animated.Value(40)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) {
      refreshPosts();
    }
  }, [user?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && user?.id) {
        refreshPosts();
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        refreshPosts();
      }
    }, [user?.id]),
  );

  useEffect(() => {
    if (showModal) {
      sheetY.setValue(40);
      sheetOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(sheetY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
          mass: 0.9,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showModal]);

  const closeModal = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 40,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModal(false);
      onDone?.();
    });
  };

  const userActivePost = (posts ?? []).find(
    (post) =>
      post.user_id === user?.id &&
      post.is_active &&
      post.is_post_today &&
      post.isoutfit_post,
  );

  const hasActivePost = !!userActivePost;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={{ flex: 1 }}>
      <NotificationPermissionModal />
      <NativeTabs backgroundColor={colors.background}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={"house"} />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={"magnifyingglass"} />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="newpost">
          <NativeTabs.Trigger.Label>　</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="wardrobe">
          <NativeTabs.Trigger.Label>Wardrobe</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={"tshirt"} />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={"person"} />
        </NativeTabs.Trigger>
      </NativeTabs>

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => closeModal()}
      >
        <Pressable style={styles.modalContainer} onPress={() => closeModal()}>
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: sheetOpacity,
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />

              <Text style={styles.eyebrow}>New post</Text>
              <Text style={styles.sheetTitle}>What are you sharing?</Text>

              <View style={styles.cardRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.card}
                  onPress={() =>
                    closeModal(() =>
                      router.push({
                        pathname: "/(post)/fit",
                        params: {
                          hasActivePost: hasActivePost ? "true" : "false",
                        },
                      }),
                    )
                  }
                >
                  <View
                    style={[
                      styles.iconBadge,
                      { backgroundColor: colors.primary + "1F" },
                    ]}
                  >
                    <Ionicons
                      name="shirt-outline"
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.cardTitle}>
                    {hasActivePost ? "Replace fit" : "Fit"}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {hasActivePost ? "Swap today's post" : "Today's outfit"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.card}
                  onPress={() => closeModal(() => router.push("/(post)/haul"))}
                >
                  <View
                    style={[
                      styles.iconBadge,
                      { backgroundColor: colors.primary + "1F" },
                    ]}
                  >
                    <Ionicons
                      name="bag-handle-outline"
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.cardTitle}>Haul</Text>
                  <Text style={styles.cardSubtitle}>New pieces</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => closeModal()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      bottom: 23,
      left: "50%",
      marginLeft: -33,
      width: 60,
      height: 60,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    fabText: {
      color: colors.background,
      fontSize: 50,
      fontWeight: "300",
      lineHeight: 54,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: 36,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 18,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.textMuted ?? colors.secondary,
      textAlign: "center",
      marginBottom: 4,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 20,
    },
    cardRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 22,
      paddingHorizontal: 12,
      alignItems: "center",
      gap: 4,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textMuted ?? colors.secondary,
    },
    cancelButton: {
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelButtonText: {
      color: colors.textMuted ?? colors.secondary,
      fontSize: 15,
      fontWeight: "600",
    },
  });
