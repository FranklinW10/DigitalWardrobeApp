import { useAuth } from "@/context/AuthContext";

import { supabase } from "@/lib/supabase/client";
import { uploadProfileImage } from "@/lib/supabase/storage";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { user, updateUser } = useAuth();
  const router = useRouter();

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
      quality: 0.8,
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
      quality: 0.8,
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
        onboardingCompleated: true,
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
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Compleate Your Profile</Text>
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
                cachePolicy={"none"}
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.placeholderimage}>
                <Text>+</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editText}>Edit</Text>
            </View>
          </TouchableOpacity>
          <TextInput
            placeholder="Full Name"
            placeholderTextColor={"#999"}
            value={name}
            onChangeText={setName}
            style={styles.input}
            autoCapitalize="words"
          />
          <TextInput
            placeholder="Username"
            placeholderTextColor={"#999"}
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={handleCompleate}>
            {isLoading ? (
              <ActivityIndicator size={24} color="#fff" />
            ) : (
              <Text style={styles.buttontext}>Compleate Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  helloworldTitle: {
    color: "red",
  },
  image: {
    width: 200,
    height: 200,
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
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    color: "#666",
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
    backgroundColor: "#f5f5f5",
  },
  placeholderimage: {
    width: 120,
    height: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 48,
    color: "#999",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#f5f5f5",
    width: "100%",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  button: {
    backgroundColor: "#000",
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
    color: "#666",
    fontSize: 14,
  },
  linkbuttontextbold: {
    fontWeight: "600",
    color: "#000",
  },
  buttontext: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
