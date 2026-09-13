import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Keyboard, Platform, TouchableWithoutFeedback } from "react-native";

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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const { signIn, handleAppleSignIn } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      await signIn(email, password);
      router.push("/(tabs)");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Incorrect email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplePress = async () => {
    setIsAppleLoading(true);
    try {
      await handleAppleSignIn();
      router.push("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Apple sign in failed. Please try again.");
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome To Posted</Text>
          <Text style={styles.subtitle}>Sign In to Continue</Text>

          <View style={styles.form}>
            <TextInput
              placeholder="Email..."
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <TextInput
              placeholder="Password..."
              placeholderTextColor={colors.textMuted}
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity style={styles.button} onPress={handleSignIn}>
              {isLoading ? (
                <ActivityIndicator size={24} color={colors.background} />
              ) : (
                <Text style={styles.buttontext}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgotPassword")}
              style={styles.forgotbutton}
            >
              <Text style={styles.linkbuttontext}>Forgot password?</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {Platform.OS === "ios" && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  colors.background === "#000000" || colors.text === "#ffffff"
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={12}
                style={styles.appleButton}
                onPress={handleApplePress}
              />
            )}
            {isAppleLoading && (
              <ActivityIndicator
                size={20}
                color={colors.text}
                style={{ marginTop: 8 }}
              />
            )}

            <TouchableOpacity
              style={styles.linkbutton}
              onPress={() => router.push("/(auth)/signup")}
            >
              <Text style={styles.linkbuttontext}>
                Don't have an account?{" "}
                <Text style={styles.linkbuttontextbold}> Sign-up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, justifyContent: "center", padding: 24 },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 8,
      color: colors.text,
    },
    subtitle: { fontSize: 16, marginBottom: 24, color: colors.textMuted },
    form: { width: "100%" },
    input: {
      backgroundColor: colors.surface,
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
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
    },
    forgotbutton: {
      borderRadius: 12,
      padding: 16,
      marginBottom: -8,
      alignItems: "center",
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 16,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    appleButton: {
      height: 50,
      width: "100%",
    },
    linkbutton: { marginTop: 12, alignItems: "center" },
    linkbuttontext: { color: colors.textMuted, fontSize: 14 },
    linkbuttontextbold: { fontWeight: "600", color: colors.text },
    buttontext: { color: colors.background, fontSize: 16, fontWeight: "600" },
  });
