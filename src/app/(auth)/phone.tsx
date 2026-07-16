import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddPhoneNumberScreen() {
  const { updateUser } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizePhone = (raw: string) => {
    // Strip everything except digits
    const digits = raw.replace(/\D/g, "");
    return digits;
  };

  const isValidPhone = (digits: string) => {
    // Basic sanity check: 10-15 digits covers most real numbers (E.164 max is 15)
    return digits.length >= 10 && digits.length <= 15;
  };

  const handleContinue = async () => {
    const digits = normalizePhone(phoneNumber);

    if (phoneNumber.trim().length > 0 && !isValidPhone(digits)) {
      setError("Please enter a valid phone number");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await updateUser({
        phone: digits.length > 0 ? digits : undefined,
        PhoneAsked: true,
      });
      // RouteGuard will take care of navigation
    } catch (err) {
      console.error("Error saving phone number:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await updateUser({
        PhoneAsked: true,
      });
      // RouteGuard will take care of navigation
    } catch (err) {
      console.error("Error skipping phone number step:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="call-outline" size={40} color="#000" />
        </View>

        <Text style={styles.title}>Help Friends Find You</Text>

        <Text style={styles.subtitle}>
          Add your phone number so friends who already have your number can
          discover your account.
        </Text>

        <Text style={styles.description}>
          Your phone number is never shown publicly and is only used to help
          people you know connect with you.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={(text) => {
            setPhoneNumber(text);
            if (error) setError(null);
          }}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 28,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 17,
    textAlign: "center",
    color: "#444",
    lineHeight: 24,
    marginBottom: 12,
  },

  description: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 36,
  },

  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 20,
  },

  errorText: {
    color: "#d00",
    fontSize: 13,
    marginTop: -12,
    marginBottom: 16,
    textAlign: "center",
  },

  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  skipButton: {
    marginTop: 20,
    alignItems: "center",
  },

  skipText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "500",
  },
});
