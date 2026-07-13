import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

function RouteGaurd() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === "(auth)";
  const inTabsGroup = segments[0] === "(tabs)";
  const inProfilesGroup = segments[0] === "(profile)";
  console.log("User:", JSON.stringify(user));

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
    } else if (!user.onboardingCompleated) {
      router.replace("/(auth)/onboarding");
    } else {
      if (!inTabsGroup && !inProfilesGroup && segments[0] !== "(post)") {
        router.replace("/(tabs)");
      }
    }
  }, [user, segments, router, isLoading]);
  // if (isLoading){
  //   return null
  // };

  if (isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(post)" />
    </Stack>
  );
}
export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGaurd />
    </AuthProvider>
  );
}
