import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Keyboard, TouchableWithoutFeedback } from "react-native";

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
  const { colors } = useTheme();

  // Generate the stylesheet dynamically using the current theme colors
  const styles = createStyles(colors);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    return digits;
  };

  const isValidPhone = (digits: string) => {
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
    } catch (err) {
      console.error("Error skipping phone number step:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="call-outline" size={40} color={colors.text} />
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
              placeholderTextColor={colors.textMuted}
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
                <ActivityIndicator color={colors.background} />
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
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

// ---- Dynamic Styles ----
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      backgroundColor: colors.surface,
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
      color: colors.text,
    },

    subtitle: {
      fontSize: 17,
      textAlign: "center",
      color: colors.secondary,
      lineHeight: 24,
      marginBottom: 12,
    },

    description: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 36,
    },

    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      marginBottom: 20,
    },

    errorText: {
      color: colors.danger,
      fontSize: 13,
      marginTop: -12,
      marginBottom: 16,
      textAlign: "center",
    },

    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
    },

    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },

    skipButton: {
      marginTop: 20,
      alignItems: "center",
    },

    skipText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "500",
    },
  });
