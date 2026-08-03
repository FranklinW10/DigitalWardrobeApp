import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useState } from "react";

export interface Tag {
  brand: string;
  store: string;
  price: string;
  color?: string;
  count: number;
}

export const useTags = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);

  const loadUserTags = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("tags")
        .select(`*, posts(*)`)
        .eq("posts.user_id", user.id);

      if (error) throw error;

      // Group by tag attributes and count
      const tagMap = new Map<string, Tag>();
      data?.forEach((tag) => {
        const key = `${tag.brand}|${tag.store}|${tag.price}|${tag.color || ""}`;
        if (tagMap.has(key)) {
          const existing = tagMap.get(key)!;
          existing.count += 1;
        } else {
          tagMap.set(key, {
            brand: tag.brand,
            store: tag.store,
            price: tag.price,
            color: tag.color,
            count: 1,
          });
        }
      });

      // Sort: count DESC, then brand ASC
      const sorted = Array.from(tagMap.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.brand.localeCompare(b.brand);
      });

      setTags(sorted);
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

  return { tags, loadUserTags };
};
