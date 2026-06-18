import { supabase } from "@/lib/supabase/client";
import * as FileSystem from "expo-file-system/legacy";

import { File } from "expo-file-system";

export const uploadProfileImage = async (userId: string, imageUri: string) => {
  try {
    const fileExtention = imageUri.split(".").pop() || "jpg";
    const fileName = `${userId}/profile.${fileExtention}`;
    const file = new File(imageUri);
    const bytes = await file.bytes();

    const { error } = await supabase.storage
      .from("profiles")
      .upload(fileName, bytes, {
        contentType: `image/${fileExtention}`,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("profiles")
      .getPublicUrl(fileName);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

export const uploadPostImage = async (
  userId: string,
  imageUri: string,
  postId?: string,
) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  console.log("Session when uploading:", session?.user?.id);

  try {
    const fileExtension = imageUri.split(".").pop() || "jpg";
    const fileName = `${userId}/${postId}/${Date.now()}.${fileExtension}`;

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    console.log("Uploading to path:", fileName);
    console.log("User ID:", userId);

    const { error } = await supabase.storage
      .from("posts")
      .upload(fileName, bytes, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("posts")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading post image:", error);
    throw error;
  }
};

export const uploadHaulImages = async (
  userId: string,
  postId: string,
  imageUris: string[],
) => {
  try {
    await Promise.all(
      imageUris.map(async (imageUri, index) => {
        // upload to storage
        const publicUrl = await uploadPostImage(userId, imageUri, postId);

        // insert row into post_images
        const { error } = await supabase.from("images").insert({
          post_id: postId,
          image_url: publicUrl,
          order_index: index,
        });

        if (error) throw error;
      }),
    );
  } catch (error) {
    console.error("Error uploading haul images:", error);
    throw error;
  }
};
