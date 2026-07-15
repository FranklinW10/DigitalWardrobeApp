import { useAuth } from "@/context/AuthContext";
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

  const loadPostsInCollection = async (collectionId: string) => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from("saved_posts")
        .select("post_id, posts(*, profiles(*), images(*))")
        .eq("user_id", user.id)
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => row.posts).filter(Boolean);
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
