import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useState } from "react";

export interface Tag {
  id: string;
  brand: string;
  store: string | null;
  price: string | null;
  name?: string | null;
  color?: string | null;
  count: number;
  favorite?: boolean | null;
  tag_image?: string | null;
  created_at: string;
  image_url?: string | null;
  image_id?: string | null;
  in_archive?: boolean | null;
}

// Tag as it appears pinned on a post image
export interface PostTag extends Tag {
  image_id: string | null;
  location_x: number;
  location_y: number;
}

export const useTags = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);

  type TagRow = {
    image_id: string | null;
    location_x: number;
    location_y: number;
    tags_new: {
      id: string;
      brand: string;
      tag_image: string | null;
      price: string | null;
      store: string | null;
      color: string | null;
      favorite: boolean | null;
      in_archive: boolean | null;
      name: string | null;
      created_at: string;
    } | null;
  };

  const flattenTag = (row: TagRow): PostTag | null => {
    if (!row.tags_new) return null;
    return {
      id: row.tags_new.id,
      image_id: row.image_id,
      location_x: row.location_x,
      created_at: row.tags_new.created_at,
      location_y: row.location_y,
      brand: row.tags_new.brand,
      tag_image: row.tags_new.tag_image,
      price: row.tags_new.price,
      store: row.tags_new.store,
      color: row.tags_new.color,
      favorite: row.tags_new.favorite,
      in_archive: row.tags_new.in_archive,
      name: row.tags_new.name,
      count: 0, // not meaningful in this context; posts already know their own tags
    };
  };

  const loadUserTags = async () => {
    if (!user) return;
    console.log("[useTags] loadUserTags called, user:", user?.id);
    try {
      console.log(
        "[useTags] Starting query for in_archive=false and user_id=",
        user.id,
      );
      // Join tags -> post_image_tags -> posts to filter by user and count usage
      const { data, error } = await supabase
        .from("tags_new")
        .select(
          `
          id,
          brand,
          store,
          name,
          price,
          color,
          favorite,
          created_at,
          tag_image,
          
          post_image_tags!inner (
            id,
            post_id,
            image_id,
            images (
              image_url
            ),
            posts!inner (
              id,
              user_id
            )
          )
        `,
        )
        .eq("in_archive", true)
        .eq("post_image_tags.posts.user_id", user.id)
        .eq("post_image_tags.posts.is_active", true);

      console.log("[useTags] Query error:", error);
      console.log("[useTags] Query data:", data);
      console.log("[useTags] Data length:", data?.length);

      if (error) throw error;

      // Also grab tags owned directly by this user (via user_id), which
      // covers tags that aren't attached to any post yet.
      const { data: ownedData, error: ownedError } = await supabase
        .from("tags_new")
        .select(
          `
          id,
          brand,
          store,
          name,
          price,
          color,
          favorite,
          created_at,
          tag_image
        `,
        )
        .eq("user_id", user.id)
        .eq("in_archive", true);

      console.log("[useTags] Owned tags error:", ownedError);
      console.log("[useTags] Owned tags data:", ownedData);

      if (ownedError) throw ownedError;

      // Map each tag with a count of how many posts use it
      const joinedList: Tag[] = (data ?? []).map((tag: any) => ({
        id: tag.id,
        brand: tag.brand,
        name: tag.name,
        store: tag.store,
        price: tag.price,
        color: tag.color,
        created_at: tag.created_at,
        favorite: tag.favorite ?? false,
        tag_image: tag.tag_image,
        image_id: tag.image_id,
        image_url: tag.post_image_tags?.[0]?.images?.image_url ?? null,
        // Count how many times this tag appears across posts
        count: tag.post_image_tags?.length ?? 0,
      }));

      const ownedList: Tag[] = (ownedData ?? []).map((tag: any) => ({
        id: tag.id,
        brand: tag.brand,
        name: tag.name,
        store: tag.store,
        price: tag.price,
        color: tag.color,
        created_at: tag.created_at,
        favorite: tag.favorite ?? false,
        tag_image: tag.tag_image,
        image_id: null,
        image_url: null,
        count: 0,
      }));

      // Merge both lists, deduping by id. Prefer the joined version since
      // it carries post/image info and an accurate usage count.
      const mergedById = new Map<string, Tag>();
      for (const tag of ownedList) {
        mergedById.set(tag.id, tag);
      }
      for (const tag of joinedList) {
        mergedById.set(tag.id, tag);
      }
      const tagList = Array.from(mergedById.values());

      // Sort: favorites first, then by count DESC, then brand ASC
      const sorted = tagList.sort((a, b) => {
        if (a.favorite !== b.favorite) {
          return Number(b.favorite) - Number(a.favorite);
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setTags(sorted);
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

  const loadPostsWithTag = async (tagId: string) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("post_image_tags")
        .select(
          `
          post_id,
          posts!inner (
            *,
            profiles(*),
            images(*),
            post_image_tags(
              image_id,
              location_x,
              location_y,
              tags_new(*)
            )
          )
        `,
        )
        .eq("tag_id", tagId)
        .eq("posts.user_id", user.id)
        .eq("posts.is_active", true);

      console.log("[useTags] Query data:", data);

      if (error) throw error;

      const seen = new Set<string>();
      return (data ?? [])
        .map((row: any) => row.posts)
        .filter(Boolean)
        .filter((post: any) => {
          if (seen.has(post.id)) return false;
          seen.add(post.id);
          return true;
        })
        .map((post: any) => ({
          ...post,
          tags: (post.post_image_tags ?? []).map(flattenTag).filter(Boolean),
        }));
    } catch (error) {
      console.error("Error loading posts with tag:", error);
      return [];
    }
  };

  const toggleFavoriteTag = async (tagId: string) => {
    if (!user) return;

    // Optimistic update
    const previousTags = tags;
    const target = tags.find((t) => t.id === tagId);
    if (!target) return;

    const newFavorite = !target.favorite;

    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, favorite: newFavorite } : t)),
    );

    try {
      const { error } = await supabase
        .from("tags_new")
        .update({ favorite: newFavorite })
        .eq("id", tagId);

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling favorite tag:", error);
      setTags(previousTags);
    }
  };

  const deleteTag = async (tagId: string) => {
    if (!user) return;

    try {
      // Archive the tag so it doesn't show up in library, but keep it on posts
      const { error } = await supabase
        .from("tags_new")
        .update({ in_archive: false })
        .eq("id", tagId);

      if (error) throw error;

      // Remove from local state
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (error) {
      console.error("Error archiving tag:", error);
    }
  };

  return { tags, loadUserTags, loadPostsWithTag, toggleFavoriteTag, deleteTag };
};
