import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usePosts } from "@/hooks/usePosts";
import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TabsLayout() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const { posts, refreshPosts } = usePosts();
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id) {
      refreshPosts();
    }
  }, [user?.id]);

  const userActivePost = (posts ?? []).find(
    (post) =>
      post.user_id === user?.id &&
      post.is_active &&
      post.is_post_today &&
      post.isoutfit_post,
  );
  console.log("userActivePost", userActivePost);

  const hasActivePost = !!userActivePost;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={{ flex: 1 }}>
      <NativeTabs>
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

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalTitle}
              onPress={() => {
                setShowModal(false);
                router.push({
                  pathname: "/(post)/fit",
                  params: { hasActivePost: hasActivePost ? "true" : "false" },
                });
              }}
            >
              <Text style={styles.modalTitle}>
                {" "}
                {hasActivePost ? "Replace your post" : "Post your Fit"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalTitle}
              onPress={() => {
                setShowModal(false);
                router.push("/(post)/haul");
              }}
            >
              <Text style={styles.modalTitle}>Post your Haul</Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}> Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      bottom: 23, // sits just above the tab bar
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
      lineHeight: 54, // this centers the + vertically
    },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      gap: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    modalButtons: {
      marginTop: 8,
    },
    modalButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.surface,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });
