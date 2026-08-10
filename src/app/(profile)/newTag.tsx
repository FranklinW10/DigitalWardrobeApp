import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase/client";
import { uploadTagImage } from "@/lib/supabase/storage";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    InputAccessoryView,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateTag() {
  // Optional: pass an imageId (e.g. from a post) if this tag should be
  // linked to an image via post_image_tags when created.
  const { imageId } = useLocalSearchParams<{ imageId?: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const styles = createStyles(colors);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // tagImage holds either a local file uri (not yet uploaded) or a
  // remote storage URL once the tag has been created and uploaded.
  const [tagImage, setTagImage] = useState<string | null>(null);
  const [isLocalImage, setIsLocalImage] = useState(false);

  const [brand, setBrand] = useState("");
  const [store, setStore] = useState("");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState("");

  const brandInputRef = useRef<TextInput>(null);
  const storeInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);
  const colorInputRef = useRef<TextInput>(null);
  const INPUT_ACCESSORY_ID = "createTagInputDone";
  const [name, setName] = useState("");
  const nameInputRef = useRef<TextInput>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need camera roll permissions to select an image.",
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
      handleImageSelect(result.assets[0].uri);
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
      handleImageSelect(result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    Alert.alert("Tag Photo", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // A new tag has no id yet, so we can't upload to storage right away
  // (uploadTagImage expects a tagId). Just preview the local uri and
  // upload it once the tag row has been created in handleSave.
  const handleImageSelect = (uri: string) => {
    setTagImage(uri);
    setIsLocalImage(true);
  };

  const handleSave = async () => {
    if (!brand.trim() && !store.trim() && !price.trim()) {
      Alert.alert("Error", "Please fill in at least one field.");
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        Alert.alert("Error", "You must be signed in to create a tag.");
        setIsSaving(false);
        return;
      }

      const { data: newTag, error } = await supabase
        .from("tags_new")
        .insert({
          user_id: user.id,
          name: name.trim() || null,
          brand: brand.trim() || "",
          store: store.trim() || null,
          price: price.trim() || null,
          color: color.trim() || null,
          in_archive: true,
        })
        .select()
        .single();

      if (error) throw error;

      // If the user picked a local image, upload it now that we have a
      // tag id, then attach the resulting URL to the new row.
      if (tagImage && isLocalImage) {
        setIsUploadingImage(true);
        try {
          const uploadedUrl = await uploadTagImage(newTag.id, tagImage);
          const { error: imageUpdateError } = await supabase
            .from("tags_new")
            .update({ tag_image: uploadedUrl })
            .eq("id", newTag.id);
          if (imageUpdateError) throw imageUpdateError;
        } catch (imageError) {
          console.error("Error uploading tag image:", imageError);
          Alert.alert(
            "Warning",
            "Tag was created, but the image failed to upload.",
          );
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Optionally link the new tag to an image/post.
      if (imageId) {
        const { error: linkError } = await supabase
          .from("post_image_tags")
          .insert({ image_id: imageId, tag_id: newTag.id });
        if (linkError) throw linkError;
      }

      router.back();
    } catch (error) {
      console.error("Error creating tag:", error);
      Alert.alert("Error", "Failed to create tag. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>New Tag</Text>
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
            <View style={styles.titleContainer}>
              <TextInput
                ref={nameInputRef}
                placeholder="Tag name"
                placeholderTextColor={`${colors.textMuted}40`}
                value={name}
                onChangeText={setName}
                style={name ? styles.titleText : styles.titlePlaceholder}
                textAlign="center"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                inputAccessoryViewID={
                  Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined
                }
              />
              {!name && (
                <TouchableOpacity
                  style={styles.titleEditBadge}
                  onPress={() => nameInputRef.current?.focus()}
                  hitSlop={8}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={showImagePicker}
              disabled={isUploadingImage}
            >
              {tagImage ? (
                <Image
                  cachePolicy="memory-disk"
                  source={{ uri: tagImage }}
                  style={styles.tagImagePreview}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.photoPlaceholderText}>+</Text>
                </View>
              )}
              {isUploadingImage ? (
                <View style={styles.editImageBadge}>
                  <ActivityIndicator size={12} color={colors.background} />
                </View>
              ) : (
                <View style={styles.editImageBadge}>
                  <Text style={styles.editBadgeText}>
                    {tagImage ? "Edit" : "Add"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.inputHeader}>Brand</Text>
            <TextInput
              ref={brandInputRef}
              placeholder="Brand"
              placeholderTextColor={colors.textMuted}
              value={brand}
              onChangeText={setBrand}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => storeInputRef.current?.focus()}
              inputAccessoryViewID={
                Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined
              }
            />

            <Text style={styles.inputHeader}>Store</Text>
            <TextInput
              ref={storeInputRef}
              placeholder="Store"
              placeholderTextColor={colors.textMuted}
              value={store}
              onChangeText={setStore}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => priceInputRef.current?.focus()}
              inputAccessoryViewID={
                Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined
              }
            />

            <Text style={styles.inputHeader}>Price</Text>
            <TextInput
              ref={priceInputRef}
              placeholder="Price"
              placeholderTextColor={colors.textMuted}
              value={price}
              onChangeText={setPrice}
              style={styles.input}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => colorInputRef.current?.focus()}
              inputAccessoryViewID={
                Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined
              }
            />

            {Platform.OS === "ios" && (
              <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
                <View style={styles.accessoryBar}>
                  <TouchableOpacity onPress={Keyboard.dismiss}>
                    <Text style={styles.accessoryDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </InputAccessoryView>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size={24} color={colors.background} />
              ) : (
                <Text style={styles.buttontext}>Create Tag</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    titleContainer: {
      position: "relative",
      width: "100%",
      marginBottom: 24,
      minHeight: 40,
      justifyContent: "center",
    },
    titleText: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    titlePlaceholder: {
      fontSize: 28,
      fontWeight: "700",
      color: `${colors.text}40`,
      textAlign: "center",
    },
    titleEditBadge: {
      position: "absolute",
      right: 0,
      top: 0,
      padding: 8,
    },
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
    },
    imageContainer: {
      marginBottom: 20,
      position: "relative",
    },
    tagImagePreview: {
      width: 250,
      height: 250,
      borderRadius: 24,
    },
    imagePlaceholder: {
      width: 250,
      height: 250,
      borderRadius: 24,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    photoPlaceholderText: {
      color: colors.text,
      fontSize: 40,
      fontWeight: "300",
    },
    editImageBadge: {
      position: "absolute",
      bottom: -16,
      left: "50%",
      transform: [{ translateX: -78 }],
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
    accessoryBar: {
      backgroundColor: colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: "flex-end",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    accessoryDoneText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    button: {
      backgroundColor: colors.primary,
      width: "100%",
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 16,
    },
    buttontext: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButton: {
      marginTop: 8,
      width: "100%",
      paddingVertical: 10,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.textMuted,
    },
  });
