
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Image, Share } from "react-native"; // add to your imports

import {
  Animated,
  Modal,
  Pressable,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

const STORAGE_KEY = "welcome_modal_shown";

export function PostedGodModal() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);

  const sheetY = useRef(new Animated.Value(40)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkIfShown();
  }, []);

    const shareApp = async () => {
      try {
        await Share.share({
          message:
            "Check out Posted — this app will change your life and make all your dreams come true! https://apps.apple.com/app/idYOUR_APP_ID",
          // iOS-only: separates the URL for cleaner previews in Messages/iMessage
          url: "https://apps.apple.com/us/app/posted-fits-hauls/id6791696227",
          title: "Posted",
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    };

  const checkIfShown = async () => {
    const alreadyShown = await AsyncStorage.getItem(STORAGE_KEY);
   if (alreadyShown) return; // already shown once, ever — never show again
    setVisible(true);
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

  const closeSheet = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
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
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeSheet}
    >
      <Pressable style={styles.overlay} onPress={closeSheet}>
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
            <Text style={styles.title}>Hello From the Posted Gods</Text>
<View style={styles.iconBadge}>
  <Image
    source={require("@/assets/images/posted-gods-icon.png")}
    style={styles.badgeImage}
  />
</View>

            
            <Text style={styles.subtitle}>
  {"Thank you for staying #Posted\n\n🚨2 Things🚨 \n1. I will increase your streak by one for each person you get to make a Posted account (Tell them to enter your name when they sign up)\n\n2. Huge crazy amazing updates coming soon so get excited and StayPosted"}
3
            </Text>

            <TouchableOpacity style={styles.enableButton} onPress={shareApp}>
              <Text style={styles.enableButtonText}>I'm gonna seize the day </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissButton} onPress={closeSheet}>
  <Text style={styles.dismissButtonText}>Don't care</Text>
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
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    sheet: {
      backgroundColor: colors.background,
      borderRadius: 28,
      paddingTop: 12,
      paddingHorizontal: 24,
      paddingBottom: 28,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: 360,
    },
    iconBadge: {
      width: 150,
      height: 150,
      borderRadius: 10,
      backgroundColor: colors.primary + "1F",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 18,
      marginTop: 8,
    },
    title: {
      fontSize: 40,
      fontWeight: "700",
      color: colors.text,
      
      marginBottom: 8,
      textAlign: "center",
    },
    badgeImage: {
  width: 160,
  height: 160,
  borderRadius: 0,
  resizeMode: "contain",
},
    subtitle: {
      fontSize: 16,
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
    dismissButton: {
  paddingVertical: 8,
},
dismissButtonText: {
  color: colors.textMuted,
  fontSize: 14,
  fontWeight: "500",
},
  });