import { palettes, themeMeta, ThemeName } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import { uploadProfileImage } from "@/lib/supabase/storage";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const { colors, setTheme } = useTheme();
  const router = useRouter();
  const styles = createStyles(colors);

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(
    (user as any)?.theme ?? "light",
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<TextInput>(null);
  const usernameInputRef = useRef<TextInput>(null);

  // Keep local state in sync if user data changes elsewhere while this screen is open
  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername(user.username);
      setPhone(user.phone ?? "");
      setIsPrivate(user.isPrivate ?? false);
      setSelectedTheme((user as any).theme ?? "light");
    }
  }, [user]);

  const handleUpdateProfileImage = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need camera roll permissions to select an Image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setIsUpdating(true);
      try {
        const imageUrl = await uploadProfileImage(
          user.id,
          result.assets[0].uri,
        );
        await updateUser({ profileImage: imageUrl });
        Alert.alert("Success", "Profile Image Updated");
      } catch (error) {
        console.error("Error updating profile image:", error);
        Alert.alert(
          "Error",
          "Failed to update profile image. Please try again.",
        );
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleComplete = async () => {
    if (!name || !username) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (phone.trim().length > 0 && (digits.length < 10 || digits.length > 15)) {
      setPhoneError("Please enter a valid phone number");
      return;
    }
    setPhoneError(null);

    setIsSubmitting(true);
    try {
      if (!user) throw new Error("User not authenticated");

      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .single();

      if (existingUser) {
        Alert.alert(
          "Error",
          "This username is taken, please choose another one.",
        );
        return;
      }
      await setTheme(selectedTheme);

      await updateUser({
        name,
        username,
        isPrivate,
        phone: digits.length > 0 ? digits : undefined,
        theme: selectedTheme,
      });

      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Edit Profile</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.imagecontainer}
              onPress={handleUpdateProfileImage}
              disabled={isUpdating}
            >
              {user?.profileImage ? (
                <Image
                  cachePolicy="memory-disk"
                  source={{ uri: user.profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.placeholderimage}>
                  <Text style={styles.placeholderText}>+</Text>
                </View>
              )}
              {isUpdating ? (
                <View style={styles.editEditBadge}>
                  <ActivityIndicator size={12} color={colors.background} />
                </View>
              ) : (
                user?.profileImage && (
                  <View style={styles.editEditBadge}>
                    <Text style={styles.editBadgeText}>Edit</Text>
                  </View>
                )
              )}
            </TouchableOpacity>

            <Text style={styles.inputHeader}>Full Name</Text>
            <TextInput
              ref={nameInputRef}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => usernameInputRef.current?.focus()}
            />

            <Text style={styles.inputHeader}>Username</Text>
            <TextInput
              ref={usernameInputRef}
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            <Text style={styles.inputHeader}>Phone Number</Text>
            <TextInput
              placeholder="Phone Number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (phoneError) setPhoneError(null);
              }}
              style={styles.input}
            />
            {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

            <View style={styles.privacyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputHeader}>Private Account</Text>
                <Text style={styles.privacyHint}>
                  Only approved followers can see your posts
                </Text>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate} />
            </View>

            <Text style={styles.inputHeader}>Theme</Text>
            <View style={styles.themeDotRow}>
              {(Object.keys(palettes) as ThemeName[]).map((themeName) => {
                const palette = palettes[themeName];
                const isActive = themeName === selectedTheme;
                return (
                  <TouchableOpacity
                    key={themeName}
                    onPress={() => setSelectedTheme(themeName)}
                    activeOpacity={0.8}
                    style={styles.themeDotWrap}
                  >
                    <View
                      style={[
                        styles.themeStack,
                        {
                          borderColor: isActive ? colors.text : "transparent",
                          borderWidth: isActive ? 2 : 0,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.themeStackDot,
                          { backgroundColor: palette.primary },
                        ]}
                      />
                      <View
                        style={[
                          styles.themeStackDot,
                          styles.themeStackDotMiddle,
                          { backgroundColor: palette.accent },
                        ]}
                      />
                      <View
                        style={[
                          styles.themeStackDot,
                          styles.themeStackDotBack,
                          {
                            backgroundColor: palette.surface,
                            borderWidth: 1,
                            borderColor: palette.border,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.themeStackLabel,
                        { color: colors.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {themeMeta[themeName].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleComplete}>
              {isSubmitting ? (
                <ActivityIndicator size={24} color={colors.background} />
              ) : (
                <Text style={styles.buttontext}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topHeaderTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    formScroll: {
      width: "100%",
    },
    form: {
      flexGrow: 1,
      width: "100%",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 60,
      gap: 4,
      justifyContent: "center",
    },
    imagecontainer: {
      marginBottom: 16,
      position: "relative",
    },
    profileImage: {
      width: 110,
      height: 110,
      borderRadius: 55,
      marginBottom: 16,
    },
    placeholderimage: {
      width: 110,
      height: 110,
      backgroundColor: colors.surface,
      borderRadius: 55,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    placeholderText: {
      fontSize: 40,
      color: colors.secondary,
    },
    inputHeader: {
      fontSize: 13,
      alignSelf: "flex-start",
      color: colors.textMuted,
      paddingHorizontal: 2,
      paddingBottom: 4,
      paddingTop: 6,
    },
    input: {
      backgroundColor: colors.surface,
      width: "100%",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    errorText: {
      color: colors.error || "#ff3b30",
      fontSize: 12,
      marginTop: 4,
    },
    privacyRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 4,
      width: "100%",
    },
    privacyHint: {
      fontSize: 11,
      color: colors.secondary,
      marginTop: 1,
    },
    themeDotRow: {
      flexDirection: "row",
      gap: 18,
      marginTop: 6,
      marginBottom: 18,
      alignSelf: "flex-start",
      paddingHorizontal: 2,
    },
    themeDotWrap: {
      alignItems: "center",
      gap: 6,
    },
    themeStack: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    themeStackDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      position: "absolute",
    },
    themeStackDotMiddle: {
      left: 10,
      top: 2,
    },
    themeStackDotBack: {
      left: 14,
      top: 10,
    },
    themeStackLabel: {
      fontSize: 12,
      fontWeight: "500",
    },
    button: {
      backgroundColor: colors.primary,
      width: "100%",
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 4,
    },
    buttontext: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    cancelModalButton: {
      marginTop: 8,
      width: "100%",
      paddingVertical: 10,
      alignItems: "center",
    },
    cancelModalButtonText: {
      fontSize: 16,
      color: colors.textMuted,
    },
    editEditBadge: {
      position: "absolute",
      bottom: 10,

      transform: [{ translateX: 33 }],
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    editBadgeText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
  });
