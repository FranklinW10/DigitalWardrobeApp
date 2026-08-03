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

// Strips everything except digits and a leading +, assumes US numbers
// by default — same normalization approach used in useContactFriends.
const normalizePhone = (raw: string) => {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  return `+1${digits.replace(/^1/, "")}`;
};

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "phone">("email");

  // Email/password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signInWithPhoneOtp, verifyPhoneOtp } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all feilds");
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

  const handleSendCode = async () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number.");
      return;
    }
    setIsLoading(true);
    try {
      await signInWithPhoneOtp(normalizePhone(phone));
      setOtpSent(true);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to send code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter the code we sent you.");
      return;
    }
    setIsLoading(true);
    try {
      await verifyPhoneOtp(normalizePhone(phone), code.trim());
      router.push("/(tabs)");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Incorrect code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: "email" | "phone") => {
    setMode(next);
    setOtpSent(false);
    setCode("");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome To Fit Check</Text>
          <Text style={styles.subtitle}>Sign In to Continue</Text>

          <View style={styles.methodToggle}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                mode === "email" && styles.methodButtonActive,
              ]}
              onPress={() => switchMode("email")}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  mode === "email" && styles.methodButtonTextActive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.methodButton,
                mode === "phone" && styles.methodButtonActive,
              ]}
              onPress={() => switchMode("phone")}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  mode === "phone" && styles.methodButtonTextActive,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {mode === "email" ? (
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
              </>
            ) : (
              <>
                <TextInput
                  placeholder="Phone number..."
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!otpSent}
                  style={[styles.input, otpSent && styles.inputDisabled]}
                />

                {otpSent && (
                  <TextInput
                    placeholder="Enter code..."
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={code}
                    onChangeText={setCode}
                    style={styles.input}
                    autoFocus
                  />
                )}

                <TouchableOpacity
                  style={styles.button}
                  onPress={otpSent ? handleVerifyCode : handleSendCode}
                >
                  {isLoading ? (
                    <ActivityIndicator size={24} color={colors.background} />
                  ) : (
                    <Text style={styles.buttontext}>
                      {otpSent ? "Verify Code" : "Send Code"}
                    </Text>
                  )}
                </TouchableOpacity>

                {otpSent && (
                  <TouchableOpacity
                    onPress={handleSendCode}
                    style={styles.forgotbutton}
                  >
                    <Text style={styles.linkbuttontext}>Resend code</Text>
                  </TouchableOpacity>
                )}
              </>
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 8,
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      marginBottom: 24,
      color: colors.textMuted,
    },
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
    form: {
      width: "100%",
    },
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
    inputDisabled: {
      opacity: 0.6,
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
      marginBottom: -16,
      alignItems: "center",
    },
    linkbutton: {
      marginTop: 12,
      alignItems: "center",
    },
    linkbuttontext: {
      color: colors.textMuted,
      fontSize: 14,
    },
    linkbuttontextbold: {
      fontWeight: "600",
      color: colors.text,
    },
    buttontext: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
  });
