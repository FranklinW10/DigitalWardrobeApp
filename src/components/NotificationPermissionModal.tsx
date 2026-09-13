// components/NotificationPermissionModal.tsx
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STORAGE_KEY = "notification_prompt_attempts";
const MAX_ATTEMPTS = 2;

export function NotificationPermissionModal() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);
  const [canAskNatively, setCanAskNatively] = useState(true);

  const sheetY = useRef(new Animated.Value(40)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const attempts = await AsyncStorage.getItem(STORAGE_KEY);
    const attemptCount = attempts ? parseInt(attempts) : 0;
    
    // Only show if under max attempts
    if (attemptCount >= MAX_ATTEMPTS) return;

    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      setCanAskNatively(canAskAgain);
      setVisible(true);
    }
  };

  useEffect(() => {
    if (visible) {
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
  }, [visible]);

  const closeSheet = async (onDone?: () => void) => {
    // Increment attempt counter
    const attempts = await AsyncStorage.getItem(STORAGE_KEY);
    const attemptCount = (attempts ? parseInt(attempts) : 0) + 1;
    await AsyncStorage.setItem(STORAGE_KEY, attemptCount.toString());

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
      setVisible(false);
      onDone?.();
    });
  };

  const handleEnable = async () => {
    if (canAskNatively) {
      await Notifications.requestPermissionsAsync();
      closeSheet();
    } else {
      if (Platform.OS === "ios") {
        Linking.openURL("app-settings:");
      } else {
        Linking.openSettings();
      }
      closeSheet();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => closeSheet()}
    >
      <Pressable style={styles.overlay} onPress={() => closeSheet()}>
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: sheetOpacity,
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <Pressable
  onPress={(e) => e.stopPropagation()}
  style={{ width: "100%", alignItems: "center" }}
>


            <View style={styles.iconBadge}>
              <Ionicons
                name="notifications-outline"
                size={32}
                color={colors.primary}
              />
            </View>

            <Text style={styles.title}>Turn on notifications</Text>
            <Text style={styles.subtitle}>
              Get notified when friends like, comment, or follow you.
            </Text>

            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleEnable}
            >
              <Text style={styles.enableButtonText}>
                {canAskNatively ? "Enable Notifications" : "Open Settings"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => closeSheet()}
            >
              <Text style={styles.skipButtonText}>Not now</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",   // was: "flex-end"
      alignItems: "center",       // add
      paddingHorizontal: 24,      // add
    },
    sheet: {
      backgroundColor: colors.background,
      borderRadius: 28,           // was: borderTopLeftRadius/borderTopRightRadius: 28
      paddingTop: 12,
      paddingHorizontal: 24,
      paddingBottom: 28,          // was: 40 (that padding was for safe-area at the bottom of the screen, not needed centered)
      alignItems: "center",
      justifyContent: "center",
      width: "100%",              // add
      maxWidth: 360,              // add
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 20,
    },
    iconBadge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + "1F",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 18,
      marginTop: 8
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    enableButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      width: "100%",
      borderRadius: 24,
      alignItems: "center",
      marginBottom: 10,
    },
    enableButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "700",
    },
    skipButton: {
      paddingVertical: 8,
    },
    skipButtonText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: "500",
    },
  });