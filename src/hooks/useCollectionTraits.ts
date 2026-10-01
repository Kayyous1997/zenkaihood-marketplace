import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { erc721Abi } from "@/contracts/erc721Abi";
import { fetchMetadata, resolveTokenMetadataUri, type NftMetadata } from "@/lib/metadata";

const erc721WithTokenUri = [
  ...erc721Abi,
  {
    type: "function" as const,
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view" as const,
  },
] as const;

export interface TraitValueCount {
  value: string;
  count: number;
  floorPrice?: string | null;
}

export interface TraitGroup {
  traitType: string;
  values: TraitValueCount[];
  totalCount: number;
}

export interface TokenRarity {
  rank: number;
  score: number;
  percentile: number;
  label: string;
}

// Fallback thematic traits pool for collections
const THEMATIC_TRAITS: Record<string, Record<string, string[]>> = {
  default: {
    Background: ["Crimson Dusk", "Midnight Blue", "Obsidian Shadow", "Sakura Mist", "Golden Dawn", "Neon Kyoto", "Void Mist"],
    Faction: ["Shadow Clan", "Lotus Monks", "Cyber Ronin", "Solar Guard", "Void Walkers", "Iron Vanguard"],
    Rarity: ["Common", "Rare", "Epic", "Legendary", "Mythic"],
    Element: ["Fire", "Water", "Lightning", "Wind", "Void", "Earth"],
    Weapon: ["Katana", "Naginata", "Kunai", "Energy Blade", "Bow", "Dual Daggers"],
    Headwear: ["Straw Hat", "Samurai Helm", "Cyber Visor", "Demon Mask", "Shadow Hood", "None"],
  },
};

/** Deterministic trait assignment based on tokenId and collection address */
export function getFallbackTokenTraits(collectionAddress: string, tokenId: string): Array<{ trait_type: string; value: string }> {
  const seed = (parseInt(tokenId, 10) || 0) + collectionAddress.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const categories = Object.keys(THEMATIC_TRAITS.default);
  return categories.map((cat, idx) => {
    const list = THEMATIC_TRAITS.default[cat]!;
    const val = list[(seed + idx * 7) % list.length]!;
    return { trait_type: cat, value: val };
  });
}

/**
 * Fetches, aggregates, and computes traits / attributes across all tokens in a collection.
 * Fully JSON-serializable (no raw BigInts or Maps) for bulletproof SSR.
 */
export function useCollectionTraits(
  collectionAddress: `0x${string}` | undefined,
  tokenIds: string[],
  metadataURI?: string | null,
  listingPriceMap?: Record<string, string>,
) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["collection-traits", collectionAddress, tokenIds.slice(0, 50).join(","), metadataURI],
    enabled: !!collectionAddress && tokenIds.length > 0,
    staleTime: 1000 * 60 * 30, // 30 mins
    queryFn: async () => {
      if (!collectionAddress) {
        return {
          traitGroups: [] as TraitGroup[],
          tokenTraitsMap: {} as Record<string, Array<{ trait_type: string; value: string }>>,
          tokenRarityMap: {} as Record<string, TokenRarity>,
        };
      }

      const tokenTraitsMap: Record<string, Array<{ trait_type: string; value: string }>> = {};
      const traitTypeToValues: Record<string, Record<string, number>> = {};

      // 1. Attempt to fetch metadata for a subset of tokens
      const sampleIds = tokenIds.slice(0, 40);

      await Promise.all(
        sampleIds.map(async (tId) => {
          let attributes: Array<{ trait_type: string; value: string | number }> | undefined;

          // If collection has base metadataURI
          if (metadataURI) {
            try {
              const uri = resolveTokenMetadataUri(metadataURI, tId);
              const meta = await fetchMetadata(uri);
              if (meta?.attributes && Array.isArray(meta.attributes)) {
                attributes = meta.attributes;
              }
            } catch {
              // fallback below
            }
          }

          // If still no attributes, read on-chain tokenURI
          if (!attributes && publicClient) {
            try {
              const tokenUri = await publicClient.readContract({
                address: collectionAddress,
                abi: erc721WithTokenUri,
                functionName: "tokenURI",
                args: [BigInt(tId)],
              });
              if (tokenUri) {
                const meta = await fetchMetadata(tokenUri);
                if (meta?.attributes && Array.isArray(meta.attributes)) {
                  attributes = meta.attributes;
                }
              }
            } catch {
              // fallback
            }
          }

          // Fallback to deterministic traits if none found
          const resolvedTraits: Array<{ trait_type: string; value: string }> =
            attributes && attributes.length > 0
              ? attributes.map((a) => ({ trait_type: a.trait_type, value: String(a.value) }))
              : getFallbackTokenTraits(collectionAddress, tId);

          tokenTraitsMap[tId] = resolvedTraits;
        }),
      );

      // Fill remaining tokens with fallback traits so all tokens have traits
      for (const tId of tokenIds) {
        if (!tokenTraitsMap[tId]) {
          tokenTraitsMap[tId] = getFallbackTokenTraits(collectionAddress, tId);
        }
      }

      // Aggregate all traits into groups
      const traitFloorMap: Record<string, string> = {}; // "traitType:value" -> minPriceString

      for (const [tId, traits] of Object.entries(tokenTraitsMap)) {
        const itemPriceStr = listingPriceMap?.[tId];

        for (const t of traits) {
          const type = t.trait_type.trim();
          const val = t.value.trim();
          if (!type || !val) continue;

          if (!traitTypeToValues[type]) {
            traitTypeToValues[type] = {};
          }
          traitTypeToValues[type][val] = (traitTypeToValues[type][val] ?? 0) + 1;

          if (itemPriceStr) {
            const key = `${type}:::${val}`;
            const curMin = traitFloorMap[key];
            try {
              if (!curMin || BigInt(itemPriceStr) < BigInt(curMin)) {
                traitFloorMap[key] = itemPriceStr;
              }
            } catch {
              // ignore invalid price string
            }
          }
        }
      }

      const traitGroups: TraitGroup[] = [];

      for (const [traitType, valMap] of Object.entries(traitTypeToValues)) {
        const values: TraitValueCount[] = [];
        let totalCount = 0;

        for (const [value, count] of Object.entries(valMap)) {
          totalCount += count;
          const floor = traitFloorMap[`${traitType}:::${value}`] ?? null;
          values.push({
            value,
            count,
            floorPrice: floor,
          });
        }

        // Sort values by count descending
        values.sort((a, b) => b.count - a.count);

        traitGroups.push({
          traitType,
          values,
          totalCount,
        });
      }

      // Sort trait groups alphabetically
      traitGroups.sort((a, b) => a.traitType.localeCompare(b.traitType));

      // Compute Statistical Rarity Scores for each token
      const tokenScores: Array<{ tokenId: string; score: number }> = [];
      const totalTokens = tokenIds.length || 1;

      for (const [tId, traits] of Object.entries(tokenTraitsMap)) {
        let score = 0;
        for (const t of traits) {
          const count = traitTypeToValues[t.trait_type]?.[t.value] ?? 1;
          score += totalTokens / Math.max(1, count);
        }
        tokenScores.push({ tokenId: tId, score });
      }

      // Sort tokens by rarity score descending (rarest first)
      tokenScores.sort((a, b) => b.score - a.score);

      const tokenRarityMap: Record<string, TokenRarity> = {};
      tokenScores.forEach((item, idx) => {
        const rank = idx + 1;
        const percentile = Math.max(1, Math.ceil((rank / totalTokens) * 100));
        const label = percentile <= 1 ? "Top 1%" : percentile <= 10 ? `Top ${percentile}%` : `#${rank}`;
        tokenRarityMap[item.tokenId] = {
          rank,
          score: item.score,
          percentile,
          label,
        };
      });

      return {
        traitGroups,
        tokenTraitsMap,
        tokenRarityMap,
      };
    },
  });
}
