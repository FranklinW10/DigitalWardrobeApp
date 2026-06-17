import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { uploadPostImage } from "@/lib/supabase/storage";
import { useEffect, useState } from "react";
export interface PostUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
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
}

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
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
    imageUri: string,
    description?: string,
    isPublic?: boolean,
    isOutfitPost?: boolean,
  ) => {
    if (!user) {
      throw new Error("User Not Authenticated");
    }
    try {
      //deactivate any existing posts today
      const { error: deactivateError } = await supabase
        .from("posts")
        .update({ is_post_today: false, is_active: false })
        .eq("is_post_today", true)
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (deactivateError) {
        console.error("Error deactivating old posts:", deactivateError);
      }
      // calculating expire time
      const imageUrl = await uploadPostImage(user.id, imageUri);
      const now = new Date();
      //adding to the table
      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          description: description || null,
          is_active: true,
          is_public: isPublic,
          isoutfit_post: isOutfitPost || false,
          is_post_today: true,
        })
        .select()
        .single();
      if (error) {
        console.error("Error creating post:", error);
        throw error;
      }
      //Refresh posts
    } catch (error) {
      console.error("Error in createPost:", error);
      throw error;
    }
  };
  const refreshPosts = async () => {
    await loadPosts();
  };
  const refreshOwnPosts = async () => {
    await loadOwnPosts();
  };
  return { createPost, refreshPosts, posts, refreshOwnPosts };
};
