import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  Linking,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";

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

const TERMS_OF_SERVICE_URL =
  "https://franklinw10.github.io/Posted-Legal/terms-of-service.html";
const PRIVACY_POLICY_URL =
  "https://franklinw10.github.io/Posted-Legal/privacy-policy.html";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const router = useRouter();
  const { signUp, handleAppleSignIn } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all feilds");
      return;
    }
    if (password.length < 3) {
      Alert.alert("Error", "Password must be at least 3 charecters");
      return;
    }
    setIsLoading(true);
    try {
      await signUp(email, password);
      router.push("/(auth)/onboarding");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Faild to sign up. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplePress = async () => {
    setIsAppleLoading(true);
    try {
      await handleAppleSignIn();
      router.push("/(auth)/onboarding");
    } catch (error) {
      Alert.alert("Error", "Apple sign up failed. Please try again.");
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign Up to get started</Text>

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
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
            <TouchableOpacity style={styles.button} onPress={handleEmailSignUp}>
              {isLoading ? (
                <ActivityIndicator size={24} color={colors.background} />
              ) : (
                <Text style={styles.buttontext}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {Platform.OS === "ios" && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
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

            <Text style={styles.legalText}>
              By signing up, you agree to our{" "}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              >
                Privacy Policy
              </Text>
              .
            </Text>

            <TouchableOpacity
              style={styles.linkbutton}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.linkbuttontext}>
                Already have an account?{" "}
                <Text style={styles.linkbuttontextbold}> Login</Text>
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
    content: { flex: 1, padding: 24, justifyContent: "center" },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 4,
      color: colors.text,
    },
    subtitle: { fontSize: 15, color: colors.textMuted, marginBottom: 24 },
    form: { gap: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 8,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: { fontSize: 13, color: colors.textMuted },
    appleButton: { height: 50, width: "100%" },
    buttontext: { color: colors.background, fontSize: 16, fontWeight: "600" },
    linkbutton: { alignItems: "center", marginTop: 16 },
    linkbuttontext: { fontSize: 14, color: colors.textMuted },
    linkbuttontextbold: { fontWeight: "700", color: colors.text },
    legalText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
      marginTop: 4,
    },
    legalLink: {
      color: colors.text,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
  });
