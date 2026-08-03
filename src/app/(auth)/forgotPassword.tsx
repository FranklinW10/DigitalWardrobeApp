import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      // "myapp" matches app.json's "scheme" — this is what makes tapping
      // the emailed link open the app directly to resetPassword.tsx
      // instead of a browser.
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: "myapp://resetPassword" },
      );
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ?? "Failed to send reset email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {sent
              ? "Check your email for a link to reset your password."
              : "Enter your email and we'll send you a link to reset your password."}
          </Text>
        </View>

        {!sent && (
          <>
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleSendReset}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size={24} color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.back()}
        >
          <Text style={styles.linkButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, justifyContent: "center", padding: 24 },
    header: { marginBottom: 32 },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 8,
      color: colors.text,
    },
    subtitle: { fontSize: 16, color: colors.textMuted, lineHeight: 22 },
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
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    linkButton: { marginTop: 24, alignItems: "center" },
    linkButtonText: { color: colors.textMuted, fontSize: 14 },
  });
