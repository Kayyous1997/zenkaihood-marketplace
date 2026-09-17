import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CollectionMeta {
  contract_address: string;
  wallet_address: string;
  name: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  twitter_handle: string | null;
  discord_url: string | null;
  telegram_url: string | null;
}

/**
 * Read off-chain metadata for a collection from Supabase (public — no auth).
 * Used on the collection detail page to load logo/banner/socials from Supabase.
 */
export function useCollectionMeta(contractAddress: string | undefined) {
  return useQuery<CollectionMeta | null>({
    queryKey: ["collection-meta", contractAddress?.toLowerCase()],
    queryFn: async () => {
      if (!supabase || !contractAddress) return null;
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("contract_address", contractAddress.toLowerCase())
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!supabase && !!contractAddress,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Upsert off-chain metadata for a collection.
 * Requires an active Supabase session (wallet signed in).
 */
export function useSaveCollectionMeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (meta: CollectionMeta) => {
      if (!supabase) throw new Error("Supabase not configured.");
      const { error } = await supabase
        .from("collections")
        .upsert(
          { ...meta, contract_address: meta.contract_address.toLowerCase(), updated_at: new Date().toISOString() },
          { onConflict: "contract_address" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collection-meta", variables.contract_address.toLowerCase()] });
    },
  });
}
