import { baseSepolia } from "wagmi/chains";
import { robinhoodTestnet } from "@/lib/chains";

/** Chain ID for the default primary deployment network. */
export const CHAIN_ID = baseSepolia.id; // 84532

/**
 * Deployed contract addresses, keyed by chain ID.
 * Supports Base Sepolia (84532) and Robinhood Chain Testnet (46630).
 */
export const ADDRESSES = {
  [baseSepolia.id]: {
    /** CollectionRegistry — permissionless collection registration */
    registry: "0xABCB5db96fcB6a9743Da56F4d4870B3505eBAD85" as `0x${string}`,
    /** Marketplace — listings, offers, auctions, sweep */
    marketplace: "0x1E4b93C28B1Cc2135894521a3b1b4d58cc21da5d" as `0x${string}`,
    /** MarketplaceViews — paginated read-only enumeration */
    marketplaceViews: "0x4CA91348E44481C2dc923FfC69f8017Ac4731FcD" as `0x${string}`,
    /** CollectionTokenViews — token supply & enumeration */
    tokenViews: "0x8118a477450cf4d7581cdf0dc973ed22cdcc4f24" as `0x${string}`,
  },
  [robinhoodTestnet.id]: {
    /** CollectionRegistry — permissionless collection registration */
    registry: "0xABCB5db96fcB6a9743Da56F4d4870B3505eBAD85" as `0x${string}`,
    /** Marketplace — listings, offers, auctions, sweep */
    marketplace: "0x1E4b93C28B1Cc2135894521a3b1b4d58cc21da5d" as `0x${string}`,
    /** MarketplaceViews — paginated read-only enumeration */
    marketplaceViews: "0x4CA91348E44481C2dc923FfC69f8017Ac4731FcD" as `0x${string}`,
    /** CollectionTokenViews — token supply & enumeration */
    tokenViews: "0x8118a477450cf4d7581cdf0dc973ed22cdcc4f24" as `0x${string}`,
  },
} as const;

export type SupportedChainId = keyof typeof ADDRESSES;

/**
 * Returns the contract addresses for a given chain ID,
 * or null if the chain is not supported.
 */
export function getAddresses(chainId: number) {
  return ADDRESSES[chainId as SupportedChainId] ?? null;
}

/** Type of the addresses object for a supported chain. */
export type Addresses = ReturnType<typeof getAddresses>;
