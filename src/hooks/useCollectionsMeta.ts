import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CollectionMeta } from "@/hooks/useCollectionMeta";

/**
 * Batch-load off-chain collection artwork/names for a set of contract addresses.
 */
export function useCollectionsMeta(addresses: string[]) {
  const keys = [...new Set(addresses.map((addr) => addr.toLowerCase()))].sort();

  return useQuery<Record<string, CollectionMeta>>({
    queryKey: ["collections-meta", keys],
    queryFn: async () => {
      if (!supabase || keys.length === 0) return {};
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .in("contract_address", keys);
      if (error) throw new Error(error.message);
      const map: Record<string, CollectionMeta> = {};
      for (const row of data ?? []) {
        map[row.contract_address.toLowerCase()] = row as CollectionMeta;
      }
      return map;
    },
    enabled: !!supabase && keys.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
