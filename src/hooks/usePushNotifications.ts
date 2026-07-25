// hooks/usePushNotifications.ts
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

// Foreground behavior: show alert + play sound even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushTokenAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission not granted.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn("No EAS projectId found — check app.json/eas.json.");
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  return tokenResponse.data;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const hasRegistered = useRef(false);

  useEffect(() => {
    if (!user || hasRegistered.current) return;

    const register = async () => {
      const token = await registerForPushTokenAsync();
      if (!token) return;

      const { error } = await supabase
        .from("profiles")
        .update({ push_token: token })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving push token:", error);
      } else {
        hasRegistered.current = true;
      }
    };

    register();
  }, [user]);

  // Handle taps on notifications (navigate wherever makes sense)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        // Example: navigate based on notification type/post_id
        // router.push(`/(post)/${data.post_id}`) — wire up to your router
        console.log("Notification tapped:", data);
      },
    );

    return () => subscription.remove();
  }, []);
};
