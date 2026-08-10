import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { uploadHaulImages, uploadPostImage } from "@/lib/supabase/storage";
import { useState } from "react";
export interface PostUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  streak: number;
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
  name: string;
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
  streak: number;
}
export interface PostTagInput {
  location_x: number;
  location_y: number;
  store: string;
  brand: string;
  price: number | null;
  is_clothing_tag: boolean;
  color: string;
  saved: boolean;
  saved_tag_id?: string | null;
  name: string;
  imageIndex: number;
  id: string;
}
export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  // Add near the top of this file (or import PostTag from useTags.ts if it's already exported there)
  const flattenPostTags = (post: any) => {
    return (post.post_image_tags ?? [])
      .map((row: any) => {
        if (!row.tags_new) return null;
        return {
          id: row.tags_new.id,
          image_id: row.image_id,
          location_x: row.location_x,
          location_y: row.location_y,
          created_at: row.tags_new.created_at,
          brand: row.tags_new.brand,
          tag_image: row.tags_new.tag_image,
          price: row.tags_new.price,
          store: row.tags_new.store,
          color: row.tags_new.color,
          favorite: row.tags_new.favorite,
          in_archive: row.tags_new.in_archive,
          name: row.tags_new.name,
          count: 0,
        };
      })
      .filter(Boolean);
  };

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
      const { data: blockedData } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      // Get users who blocked you
      const { data: blockedByData } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", user.id);

      const { data: reportedData } = await supabase
        .from("reports")
        .select("target_id")
        .eq("reporter_id", user.id)
        .eq("target_type", "post");

      const blockedUserIds = blockedData?.map((b) => b.blocked_id) ?? [];
      const blockedByUserIds = blockedByData?.map((b) => b.blocker_id) ?? [];
      const allBlockedIds = [
        ...new Set([...blockedUserIds, ...blockedByUserIds]),
      ];
      const reportedPostIds = reportedData?.map((r) => r.target_id) ?? [];

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
                    *,
                    profiles(id,name,username,profile_image_url, streak),
                    images(id,post_id,image_url,order_index),
                    post_image_tags(
  image_id,
  location_x,
  location_y,
  tags_new(*)
)
                    `,
        )
        .eq("is_active", true)
        .not("user_id", "in", `(${allBlockedIds.join(",")})`)
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

      const filtered =
        postsData?.filter((p) => !reportedPostIds.includes(p.id)) ?? [];

      const postsWithProfiles = filtered.map((post) => ({
        ...post,
        profiles: post.profiles || null,
        tags: flattenPostTags(post),
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
      const { data: blockedData } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      // Get users who blocked you
      const { data: blockedByData } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", user.id);

      const { data: reportedData } = await supabase
        .from("reports")
        .select("target_id")
        .eq("reporter_id", user.id)
        .eq("target_type", "post");

      const blockedUserIds = blockedData?.map((b) => b.blocked_id) ?? [];
      const blockedByUserIds = blockedByData?.map((b) => b.blocker_id) ?? [];
      const allBlockedIds = [
        ...new Set([...blockedUserIds, ...blockedByUserIds]),
      ];
      const reportedPostIds = reportedData?.map((r) => r.target_id) ?? [];

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
        *,
        profiles(id, name, username, profile_image_url, isPrivate, streak),
        images(id, post_id, image_url, order_index),
        post_image_tags(
  image_id,
  location_x,
  location_y,
  tags_new(*)
)
      `,
        )
        .eq("is_active", true)
        .not("user_id", "in", `(${allBlockedIds.join(",")})`)

        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const filtered = (postsData ?? []).filter(
        (post) => !post.profiles?.isPrivate,
      );

      const filteredBlocked =
        filtered?.filter((p) => !reportedPostIds.includes(p.id)) ?? [];

      const postsWithTags = filteredBlocked.map((post) => ({
        ...post,
        tags: flattenPostTags(post),
      }));

      setPosts(postsWithTags);
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
                  profiles(id,name,username,profile_image_url, streak),
                  images(id,post_id,image_url,order_index),
                  post_image_tags(
  image_id,
  location_x,
  location_y,
  tags_new(*)
)
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
        tags: flattenPostTags(post),
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
      const todayStr = getLocalDateString();
      let postStreak: number | null = null;
      if (isOutfitPost) {
        const { data: existingTodayPosts, error: checkError } = await supabase
          .from("posts")
          .select("id")
          .eq("user_id", user.id)
          .eq("isoutfit_post", true)
          .eq("post_date", todayStr);

        if (checkError) {
          console.error("Error checking today's post:", checkError);
        }

        const alreadyPostedToday = (existingTodayPosts ?? []).length > 0;

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

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("streak, max_streak")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching streak:", profileError);
          throw profileError;
        }
        if (!alreadyPostedToday) {
          const newStreak = (profile.streak ?? 0) + 1;
          const newMaxStreak = Math.max(newStreak, profile.max_streak ?? 0);

          const { error: streakError } = await supabase
            .from("profiles")
            .update({
              streak: newStreak,
              max_streak: newMaxStreak,
            })
            .eq("id", user.id);

          if (streakError) {
            console.error("Error updating streak:", streakError);
            throw streakError;
          }
          postStreak = newStreak;
        } else {
          // Replacing today's post — the streak itself doesn't change,
          // just carry the current value onto this post too.
          postStreak = profile.streak ?? 0;
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
          post_date: todayStr,
          streak: postStreak,
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
        const tagIds: string[] = [];

        for (const t of tags) {
          if (t.saved && t.saved_tag_id) {
            // Picked from the archive — reuse the existing tags_new row.
            tagIds.push(t.saved_tag_id);
          } else {
            // New tag, insert it
            const { data: newTag, error: newTagError } = await supabase
              .from("tags_new")
              .insert({
                name: t.name,
                brand: t.brand,
                store: t.store,
                price: t.price,
                color: t.color,
                favorite: false,
                in_archive: true,
              })
              .select()
              .single();

            if (newTagError) {
              console.error("Error inserting new tag:", newTagError);
            }

            if (newTag) {
              tagIds.push(newTag.id);
            }
          }
        }

        // Step 2: Insert linking rows — filter out any tag whose id resolution
        // failed above, so a bad insert doesn't produce a null tag_id row.
        const linkRows = tags
          .map((t, i) => ({
            post_id: post.id,
            image_id:
              uploadedImages.find((img) => img.order_index === t.imageIndex)
                ?.id ?? null,
            tag_id: tagIds[i],
            location_x: t.location_x,
            location_y: t.location_y,
          }))
          .filter((row) => row.tag_id != null);

        const { error: linkError } = await supabase
          .from("post_image_tags")
          .insert(linkRows);

        if (linkError) {
          console.error("Error linking tags to post:", linkError);
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
    isLoading,
  };
};
