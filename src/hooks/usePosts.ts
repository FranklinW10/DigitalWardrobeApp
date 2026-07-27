import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { uploadHaulImages, uploadPostImage } from "@/lib/supabase/storage";
import { useState } from "react";
export interface PostUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}
export interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  order_index: number;
}

export interface PostTag {
  id: string;
  post_id: string;
  image_id: string | null;
  location_x: number;
  location_y: number;
  brand: string;
  store: string;
  price: number | null;
  is_clothing_tag: boolean;
  color: string;
}

export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  description?: string;
  created_at: string;
  is_public: boolean;
  is_active: boolean;
  isoutfit_post: boolean;
  is_post_today: boolean;
  profiles?: PostUser;
  images?: PostImage[];
  tags?: PostTag[]; // ← new
  post_date: string;
  ispostedontime: boolean;
}
export interface PostTagInput {
  location_x: number;
  location_y: number;
  store: string;
  brand: string;
  price: number | null;
  is_clothing_tag: boolean;
  color: string;
  imageIndex: number;
}
export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const getLocalDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const loadPosts = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
                    *,
                    profiles(id,name,username,profile_image_url),
                    images(id,post_id,image_url,order_index),
                    tags(*)
                    `,
        )
        .eq("is_active", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (postsError) {
        console.error("Error loading posts:", postsError);
        throw postsError;
      }
      if (postsData && postsData.length > 0) {
        console.log("First post data:", JSON.stringify(postsData[0]));
      }
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }
      const postsWithProfiles = postsData.map((post) => ({
        ...post,
        profiles: post.profiles || null,
      }));
      setPosts(postsWithProfiles);
    } catch (error) {
      console.error("Error in loadPosts:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadPublicPosts = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
        *,
        profiles(id, name, username, profile_image_url, isPrivate),
        images(id, post_id, image_url, order_index),
        tags(*)
      `,
        )
        .eq("is_active", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const filtered = (postsData ?? []).filter(
        (post) => !post.profiles?.isPrivate,
      );

      setPosts(filtered);
    } catch (error) {
      console.error("Error in loadPublicPosts:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadOwnPosts = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
                  *,
                  profiles(id,name,username,profile_image_url),
                  images(id,post_id,image_url,order_index),
                  tags(*)
                  `,
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (postsError) {
        console.error("Error loading posts:", postsError);
        throw postsError;
      }
      if (postsData && postsData.length > 0) {
        console.log("First post data:", JSON.stringify(postsData[0]));
      }
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }
      const postsWithProfiles = postsData.map((post) => ({
        ...post,
        profiles: post.profiles || null,
      }));
      setPosts(postsWithProfiles);
    } catch (error) {
      console.error("Error in loadPosts:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // usePosts.ts

  const createPost = async (
    imageUri?: string,
    description?: string,
    isPublic?: boolean,
    isOutfitPost?: boolean,
    imageUris?: string[],
    tags?: PostTagInput[],
  ) => {
    if (!user) {
      throw new Error("User Not Authenticated");
    }
    try {
      if (isOutfitPost) {
        const { error: deactivateError } = await supabase
          .from("posts")
          .update({ is_post_today: false, is_active: false })
          .eq("is_post_today", true)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .eq("isoutfit_post", true);
        if (deactivateError) {
          console.error("Error deactivating old posts:", deactivateError);
        }
      }

      const { data: post, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          image_url: null,
          description: description || null,
          is_active: true,
          is_public: isPublic,
          isoutfit_post: isOutfitPost || false,
          is_post_today: true,
          post_date: getLocalDateString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating post:", error);
        throw error;
      }

      console.log("Created post:", post);

      // Track uploaded images so tags can be linked to the right one by index
      let uploadedImages: { id: string; order_index: number }[] = [];

      if (imageUris && imageUris.length > 0) {
        uploadedImages = await uploadHaulImages(user.id, post.id, imageUris);
      } else if (imageUri) {
        const imageUrl = await uploadPostImage(user.id, imageUri, post.id);
        await supabase
          .from("posts")
          .update({ image_url: imageUrl })
          .eq("id", post.id);
      }

      if (tags && tags.length > 0) {
        const tagRows = tags.map((t) => {
          // Match each tag to the image it was placed on via imageIndex.
          // Falls back to null (no image link) for single-image posts or
          // if something's out of range — tag still saves, just unlinked.
          const matchedImage = uploadedImages.find(
            (img) => img.order_index === t.imageIndex,
          );

          return {
            post_id: post.id,
            image_id: matchedImage?.id ?? null,
            location_x: t.location_x,
            location_y: t.location_y,
            store: t.store,
            brand: t.brand,
            price: t.price,
            is_clothing_tag: t.is_clothing_tag,
            color: t.color,
          };
        });

        const { error: tagsError } = await supabase
          .from("tags")
          .insert(tagRows);

        if (tagsError) {
          console.error("Error saving post tags:", tagsError);
        }
      }

      return post;
    } catch (error) {
      console.error("Error in createPost:", error);
      throw error;
    }
  };

  const createoldPost = async (
    imageUri?: string,
    description?: string,
    isOutfitPost?: boolean,
    imageUris?: string[],
    postDate?: string,
  ) => {
    if (!user) throw new Error("User Not Authenticated");

    const dateToUse = postDate ?? new Date().toISOString();

    try {
      // Only deactivate today's post if this is a today post, not a backdated one

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: null,
        description: description || null,
        is_active: true,
        is_public: false,
        isoutfit_post: isOutfitPost || false,
        is_post_today: false,
        post_date: dateToUse,
        ispostedontime: false,
      });

      if (error) throw error;

      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select()
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      if (imageUris && imageUris.length > 0) {
        await uploadHaulImages(user.id, post.id, imageUris);
      } else if (imageUri) {
        const imageUrl = await uploadPostImage(user.id, imageUri, post.id);
        await supabase
          .from("posts")
          .update({ image_url: imageUrl })
          .eq("id", post.id);
      }
    } catch (error) {
      console.error("Error in createPost:", error);
      throw error;
    }
  };

  // const createHaulPost = async (
  //   imageUris: string[],
  //   description?: string,
  //   isPublic?: boolean,
  //   isOutfitPost?: boolean,
  // ) => {
  //   if (!user) {
  //     throw new Error("User Not Authenticated");
  //   }
  //   try {
  //     const imageUrl = await uploadPostImage(user.id, imageUri);
  //     const now = new Date();
  //     //adding to the table
  //     const { error } = await supabase
  //       .from("posts")
  //       .insert({
  //         user_id: user.id,
  //         image_url: imageUrl,
  //         description: description || null,
  //         is_active: true,
  //         is_public: isPublic,
  //         isoutfit_post: isOutfitPost || false,
  //         is_post_today: true,
  //       })
  //       .select()
  //       .single();
  //     if (error) {
  //       console.error("Error creating post:", error);
  //       throw error;
  //     }
  //     //Refresh posts
  //   } catch (error) {
  //     console.error("Error in createPost:", error);
  //     throw error;
  //   }
  // };
  const refreshPosts = async () => {
    await loadPosts();
  };
  const refreshExplorePosts = async () => {
    await loadPublicPosts();
  };
  const refreshOwnPosts = async () => {
    await loadOwnPosts();
  };

  return {
    createPost,
    refreshPosts,
    posts,
    refreshOwnPosts,
    createoldPost,
    refreshExplorePosts,
  };
};
