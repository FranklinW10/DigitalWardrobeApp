import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import { uploadProfileImage } from "@/lib/supabase/storage";
import { Keyboard, ScrollView, TouchableWithoutFeedback } from "react-native";

import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [link, setLink] = useState("");
  const [linkLabel, setlinkLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
    const [referredBy, setReferredBy] = useState("");   // add

  const styles = createStyles(colors);

  const pickImage = async () => {
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
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need camera permissions to take a photo.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    Alert.alert("Select Profile Image", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleCompleate = async () => {
    if (!name || !username) {
      Alert.alert("Error", "Please fill in all feilds");
    }
    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 charecters");
    }

    setIsLoading(true);
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      // Check if username exists
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
        setIsLoading(false);
        return;
      }

      //upload profile img
      let profileImageUrl: string | undefined;
      if (profileImage) {
        try {
          profileImageUrl = await uploadProfileImage(user.id, profileImage);
        } catch (error) {
          console.error("Error uploading profile image:", error);
          Alert.alert(
            "warning",
            "Failed to upload the profileimage. Continuing without image.",
          );
        }
      }

      //update profile
      await updateUser({
        name,
        username,
        profileImage: profileImageUrl,
        isPrivate,
        onboardingCompleated: true,
        bio,
        link,
        linkLabel,
        referred_by: referredBy.trim() || undefined,
      });
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Error",
        "Faild to compleate the Onboarding. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
              <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Add your information to get started
            </Text>
          </View>
          <View style={styles.form}>
            <TouchableOpacity
              style={styles.imagecontainer}
              onPress={showImagePicker}
            >
              {profileImage ? (
                <Image
                  cachePolicy={"memory-disk"}
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.placeholderimage}>
                  <Text style={styles.placeholderText}>+</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Text style={styles.editText}>Edit</Text>
              </View>
            </TouchableOpacity>
            <TextInput
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoCapitalize="words"
            />
            <TextInput
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
            />

            <TextInput
              placeholder="Bio (optional)"
              placeholderTextColor={colors.textMuted}
              value={bio}
              onChangeText={setBio}
              style={[
                styles.input,
                { minHeight: 70, textAlignVertical: "top" },
              ]}
              multiline
              maxLength={150}
            />
            <Text style={styles.bioCharCount}>{bio.length}/150</Text>
                        <TextInput
              placeholder="Referred by (optional)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={referredBy}
              onChangeText={setReferredBy}
              style={styles.input}
            />

            <View style={styles.privacyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyLabel}>Private Account</Text>
                <Text style={styles.privacyHint}>
                  Only approved followers can see your posts
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleCompleate}>
              {isLoading ? (
                <ActivityIndicator size={24} color={colors.background} />
              ) : (
                <Text style={styles.buttontext}>Complete Setup</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    privacyRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      marginBottom: 10,
    },
    privacyLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
    privacyHint: { fontSize: 12, color: colors.textMuted },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      marginBottom: 32,
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
      marginBottom: 32,
      color: colors.textMuted,
    },
    form: {
      width: "100%",
      alignItems: "center",
    },
    imagecontainer: {
      marginBottom: 32,
      position: "relative",
    },
    profileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
    },
    placeholderimage: {
      width: 120,
      height: 120,
      backgroundColor: colors.surface,
      borderRadius: 60,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    placeholderText: {
      fontSize: 48,
      color: colors.textMuted,
    },
    editBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    editText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
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
    },
    linkbutton: {
      marginTop: 24,
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
    bioCharCount: {
      fontSize: 11,
      color: colors.textMuted,
      alignSelf: "flex-end",
      marginTop: -10,
      marginBottom: 8,
    },
  });
