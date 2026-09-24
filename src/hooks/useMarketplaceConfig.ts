import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { gqlClient } from "@/indexer/client";
import { GET_MARKETPLACE_CONFIG, type MarketplaceConfigResult } from "@/indexer/queries";
import { SLOW_REFETCH_MS } from "@/indexer/events";
import { marketplaceAbi } from "@/contracts/marketplaceAbi";
import { useAddresses } from "@/lib/deployments";

export interface MarketplaceConfigData {
  marketplace: string;
  registry: string;
  platformFeeBps: number;
  platformFeePercent: string;
  platformFeeFraction: number;
  feeRecipient: string;
  paused: boolean;
  registryPaused: boolean;
}

/**
 * Fetch live platform config (platformFeeBps, feeRecipient, pause state)
 * from the Subgraph with automatic on-chain fallback if subgraph is syncing.
 */
export function useMarketplaceConfig() {
  const addrs = useAddresses();

  // 1. Query Subgraph
  const {
    data: subgraphData,
    isLoading: subgraphLoading,
    error: subgraphError,
    refetch,
  } = useQuery({
    queryKey: ["marketplace-config"],
    queryFn: async () => {
      try {
        const res = await gqlClient.request<MarketplaceConfigResult>(GET_MARKETPLACE_CONFIG);
        const config = res?.marketplaceConfigs?.[0] ?? res?.marketplaceConfig ?? null;
        return config;
      } catch (err) {
        console.warn("Could not load marketplace config from subgraph:", err);
        return null;
      }
    },
    refetchInterval: SLOW_REFETCH_MS,
    staleTime: SLOW_REFETCH_MS,
  });

  // 2. On-chain fallback query via readContract if subgraph has not yet indexed or returned null
  const { data: onChainFeeBps, isLoading: onChainLoading } = useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "platformFeeBps",
    query: {
      enabled: !subgraphData && !!addrs?.marketplace,
    },
  });

  const rawFeeBps =
    subgraphData?.platformFeeBps != null
      ? Number(subgraphData.platformFeeBps)
      : onChainFeeBps != null
      ? Number(onChainFeeBps)
      : 0;

  const platformFeeBps = Number.isNaN(rawFeeBps) ? 0 : rawFeeBps;
  const platformFeePercent =
    platformFeeBps % 100 === 0
      ? `${platformFeeBps / 100}%`
      : `${(platformFeeBps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
  const platformFeeFraction = platformFeeBps / 10000;

  return {
    config: subgraphData,
    platformFeeBps,
    platformFeePercent,
    platformFeeFraction,
    feeRecipient: subgraphData?.feeRecipient ?? "",
    isPaused: subgraphData?.paused ?? false,
    isRegistryPaused: subgraphData?.registryPaused ?? false,
    isLoading: subgraphLoading && onChainLoading,
    refetch,
    /** Calculate platform fee in wei for a given price in wei */
    calculateFee: (priceWei: bigint) => (priceWei * BigInt(platformFeeBps)) / 10000n,
  };
}
