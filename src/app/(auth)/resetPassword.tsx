import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ code?: string }>();
  const url = Linking.useURL();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    establishSession();
  }, [params.code, url]);

  const establishSession = async () => {
    console.log("Full URL:", url);
    console.log("Router params:", params);
    try {
      // PKCE flow — Supabase appends ?code=... to the redirect URL,
      // which expo-router exposes directly as a search param.
      if (params.code) {
        console.log("Found PKCE code:", params.code);
        const { error } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        if (error) throw error;
        setIsValidSession(true);
        setIsVerifying(false);
        return;
      }

      // Implicit flow fallback — tokens arrive after a # fragment, which
      // expo-router doesn't parse as search params, so pull them from
      // the raw URL manually.
      if (url) {
        const hashPart = url.split("#")[1];
        console.log("Hash:", hashPart);
        if (hashPart) {
          const fragmentParams = new URLSearchParams(hashPart);
          console.log("access_token:", fragmentParams.get("access_token"));
          console.log("refresh_token:", fragmentParams.get("refresh_token"));
          const access_token = fragmentParams.get("access_token");
          const refresh_token = fragmentParams.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
            setIsValidSession(true);
            setIsVerifying(false);
            return;
          }
        }
      }

      // Neither token form found — link is missing, malformed, or expired
      setIsValidSession(false);
      setIsVerifying(false);
    } catch (error) {
      console.error("Error establishing recovery session:", error);
      setIsValidSession(false);
      setIsVerifying(false);
    }
  };

  const handleReset = async () => {
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert("Success", "Your password has been reset.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ?? "Failed to reset password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isValidSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.title}>Link Expired</Text>
          <Text selectable>URL: {url ?? "null"}</Text>

          <Text selectable>Code: {String(params.code)}</Text>

          <Text selectable>Params:</Text>

          <Text selectable>{JSON.stringify(params, null, 2)}</Text>

          <Text style={styles.subtitle}>
            This password reset link is invalid or has expired. Please request a
            new one.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace("/(auth)/forgotPassword")}
          >
            <Text style={styles.buttonText}>Request New Link</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Enter a new password for your account.
          </Text>
        </View>

        <TextInput
          placeholder="New Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor={colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleReset}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size={24} color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      gap: 16,
    },
    content: { flex: 1, justifyContent: "center", padding: 24 },
    header: { marginBottom: 32 },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 8,
      color: colors.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      color: colors.textMuted,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      width: "100%",
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      width: "100%",
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
  });
