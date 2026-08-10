import { useAuth } from "@/context/AuthContext";
import { useBlocks } from "@/context/BlocksContext";
import { PostTag } from "@/hooks/useTags";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
export interface SavedCollection {
  id: string;
  name: string;
  created_at: string;
}

export const useSavedPosts = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  // Tracks which collection_ids each saved post_id belongs to, so
  // isSaved() can answer "is this post saved anywhere at all"
  const [savedMap, setSavedMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (user) {
      loadCollections();
      loadSavedMap();
    }
  }, [user]);
  const loadCollections = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("saved_collections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setCollections(data ?? []);
    } catch (error) {
      console.error("Error loading collections:", error);
    }
  };

  // Loads which posts are saved and where, so post cards can show the
  // filled/unfilled bookmark icon without a query per card.
  const loadSavedMap = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("saved_posts")
        .select("post_id, collection_id")
        .eq("user_id", user.id);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((row) => {
        map[row.post_id] = [...(map[row.post_id] ?? []), row.collection_id];
      });
      setSavedMap(map);
    } catch (error) {
      console.error("Error loading saved posts map:", error);
    }
  };

  const createCollection = async (
    name: string,
  ): Promise<SavedCollection | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("saved_collections")
        .insert({ user_id: user.id, name })
        .select()
        .single();
      if (error) throw error;
      setCollections((prev) => [...prev, data]);
      return data;
    } catch (error) {
      console.error("Error creating collection:", error);
      return null;
    }
  };

  const savePostToCollection = async (postId: string, collectionId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("saved_posts").insert({
        user_id: user.id,
        post_id: postId,
        collection_id: collectionId,
      });
      if (error) throw error;
      setSavedMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), collectionId],
      }));
    } catch (error) {
      console.error("Error saving post:", error);
    }
  };

  const flattenPostTags = (post: any): PostTag[] => {
    return (post.post_image_tags ?? [])
      .map((row: any): PostTag | null => {
        if (!row.tags_new) return null;
        return {
          id: row.tags_new.id,
          image_id: row.image_id,
          created_at: row.tags_new.created_at,
          location_x: row.location_x,
          location_y: row.location_y,
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
      .filter(Boolean) as PostTag[];
  };

  const unsavePostFromCollection = async (
    postId: string,
    collectionId: string,
  ) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .eq("collection_id", collectionId);
      if (error) throw error;
      setSavedMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((id) => id !== collectionId),
      }));
    } catch (error) {
      console.error("Error unsaving post:", error);
    }
  };

  // Removes a post from every collection it's in — used by the quick
  // bookmark-icon toggle on post cards, where there's no collection context.
  const unsavePostEverywhere = async (postId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);
      if (error) throw error;
      setSavedMap((prev) => ({ ...prev, [postId]: [] }));
    } catch (error) {
      console.error("Error unsaving post:", error);
    }
  };

  const { blockedIds, blockedByIds } = useBlocks();

  const loadPostsInCollection = async (collectionId: string) => {
    if (!user) return [];

    const allBlockedIds = new Set([...blockedIds, ...blockedByIds]);

    try {
      const { data, error } = await supabase
        .from("saved_posts")
        .select(
          `
          post_id,
          posts (
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
        .eq("user_id", user.id)
        .eq("collection_id", collectionId)
        .eq("posts.is_active", true)
        .order("created_at", { ascending: false });
      console.log(JSON.stringify(data, null, 2));

      if (error) throw error;

      return (data ?? [])
        .map((row: any) => row.posts)
        .filter(Boolean)
        .filter((post: any) => !allBlockedIds.has(post.user_id)) // Filter blocked users
        .map((post: any) => ({
          ...post,
          tags: flattenPostTags(post),
        }));
    } catch (error) {
      console.error("Error loading collection posts:", error);
      return [];
    }
  };
  const isSaved = (postId: string) => (savedMap[postId]?.length ?? 0) > 0;
  const savedCollectionsFor = (postId: string) => savedMap[postId] ?? [];

  return {
    collections,
    loadCollections,
    createCollection,
    savePostToCollection,
    unsavePostFromCollection,
    unsavePostEverywhere,
    loadPostsInCollection,
    loadSavedMap,
    isSaved,
    savedCollectionsFor,
  };
};
