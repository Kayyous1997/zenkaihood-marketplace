import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  COLLECTION_CATEGORIES,
  getCategoryById,
  type CategoryOption,
} from "@/lib/categories";

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

/**
 * Fetch categories from Supabase `categories` table with fallback to static categories.
 */
export function useCategories() {
  return useQuery<CategoryOption[]>({
    queryKey: ["categories-list"],
    queryFn: async () => {
      if (!supabase) return [...COLLECTION_CATEGORIES];
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("created_at", { ascending: true });

        if (error || !data || data.length === 0) {
          return [...COLLECTION_CATEGORIES];
        }

        return data.map((row: DbCategory) => {
          const staticCat = getCategoryById(row.id);
          return {
            id: row.id,
            label: row.name || staticCat?.label || row.id,
            desc: row.description || staticCat?.desc || "",
            icon: staticCat?.icon || COLLECTION_CATEGORIES[0]!.icon,
          };
        });
      } catch {
        return [...COLLECTION_CATEGORIES];
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
