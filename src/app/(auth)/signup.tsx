import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Keyboard, TouchableWithoutFeedback } from "react-native";

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

type SignUpMethod = "email" | "phone";

export default function SignUpScreen() {
  const [method, setMethod] = useState<SignUpMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signUp, signInWithPhoneOtp } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all feilds");
    }
    if (password.length < 3) {
      Alert.alert("Error", "Password must be at least 3 charecters");
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

  const handlePhoneSignUp = async () => {
    if (!phone) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }
    setIsLoading(true);
    try {
      await signInWithPhoneOtp(phone);
      router.push({ pathname: "/(auth)/verify-otp", params: { phone } });
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Faild to send verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign Up to get started</Text>

          <View style={styles.methodToggle}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                method === "email" && styles.methodButtonActive,
              ]}
              onPress={() => setMethod("email")}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  method === "email" && styles.methodButtonTextActive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.methodButton,
                method === "phone" && styles.methodButtonActive,
              ]}
              onPress={() => setMethod("phone")}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  method === "phone" && styles.methodButtonTextActive,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {method === "email" ? (
              <>
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
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleEmailSignUp}
                >
                  {isLoading ? (
                    <ActivityIndicator size={24} color={colors.background} />
                  ) : (
                    <Text style={styles.buttontext}>Sign Up</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  placeholder="+1 555 123 4567"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                />
                <Text style={styles.hint}>
                  Include your country code, e.g. +1 for the US
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handlePhoneSignUp}
                >
                  {isLoading ? (
                    <ActivityIndicator size={24} color={colors.background} />
                  ) : (
                    <Text style={styles.buttontext}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

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
    methodToggle: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 4,
      marginBottom: 20,
    },
    methodButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    },
    methodButtonActive: {
      backgroundColor: colors.background,
      shadowColor: colors.text,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    methodButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
    },
    methodButtonTextActive: { color: colors.text },
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
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -6,
      marginBottom: 4,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    buttontext: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    linkbutton: { alignItems: "center", marginTop: 16 },
    linkbuttontext: { fontSize: 14, color: colors.textMuted },
    linkbuttontextbold: { fontWeight: "700", color: colors.text },
  });
