import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { uploadHaulImages, uploadPostImage } from "@/lib/supabase/storage";
import { useEffect, useState } from "react";
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
}

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user]);

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
                    images(id,post_id,image_url,order_index)
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

  const loadOwnPosts = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
                    *,
                    profiles(id,name,username,profile_image_url)
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

  const createPost = async (
    imageUri?: string,
    description?: string,
    isPublic?: boolean,
    isOutfitPost?: boolean,
    imageUris?: string[],
  ) => {
    if (!user) {
      throw new Error("User Not Authenticated");
    }
    try {
      //deactivate any existing posts today
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
      //adding to the table
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: null,
        description: description || null,
        is_active: true,
        is_public: isPublic,
        isoutfit_post: isOutfitPost || false,
        is_post_today: true,
      });

      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select()
        .eq("user_id", user.id)
        .eq("is_post_today", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error("Error fetching created post:", fetchError);
        throw fetchError;
      }

      console.log("Created post:", post);
      console.log("Post id:", post?.id);
      if (error) {
        console.error("Error creating post:", error);
        throw error;
      }

      if (imageUris && imageUris.length > 0) {
        // haul post — upload to post_images table
        await uploadHaulImages(user.id, post.id, imageUris);
      }
      //Refresh posts
      else if (imageUri) {
        // fit post — upload single image and update image_url
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
  const refreshOwnPosts = async () => {
    await loadOwnPosts();
  };

  return { createPost, refreshPosts, posts, refreshOwnPosts };
};
