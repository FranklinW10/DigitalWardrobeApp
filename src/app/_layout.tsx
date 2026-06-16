import { AuthProvider } from "@/context/AuthContext";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

// TODO: replace with actual auth check
export default function RootLayout() {
  const router = useRouter();
  let isAuth = false; // TODO: replace with actual auth check
  useEffect(() => {
    if (!isAuth) {
      router.replace("/login");
    }
  });
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </AuthProvider>
  );
}
