import { useAuth } from "@/context/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const { verifyPhoneOtp, signInWithPhoneOtp } = useAuth();

  const handleVerify = async () => {
    if (code.length < 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }
    setIsLoading(true);
    try {
      await verifyPhoneOtp(phone, code);
      router.push("/(auth)/onboarding");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await signInWithPhoneOtp(phone);
      Alert.alert("Sent", "A new code has been sent.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Enter Code</Text>
        <Text style={styles.subtitle}>We sent a code to {phone}</Text>

        <TextInput
          placeholder="123456"
          placeholderTextColor={"#999"}
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          style={styles.input}
          maxLength={6}
        />

        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          {isLoading ? (
            <ActivityIndicator size={24} color="#fff" />
          ) : (
            <Text style={styles.buttontext}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkbutton}
          onPress={handleResend}
          disabled={isResending}
        >
          <Text style={styles.linkbuttontext}>
            {isResending ? "Resending..." : "Resend code"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 6,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttontext: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkbutton: { alignItems: "center", marginTop: 16 },
  linkbuttontext: { fontSize: 14, color: "#666" },
});
