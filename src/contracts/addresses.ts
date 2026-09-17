import { baseSepolia } from "wagmi/chains";

/** Chain ID for the primary deployment network. */
export const CHAIN_ID = baseSepolia.id; // 84532

/**
 * Deployed contract addresses, keyed by chain ID.
 * All addresses are on Base Sepolia.
 */
export const ADDRESSES = {
  [baseSepolia.id]: {
    /** CollectionRegistry — permissionless collection registration */
    registry: "0x1209Ea7122A50AB8c8ab31ee9c20D9912f3D0cc6" as `0x${string}`,
    /** Marketplace — listings, offers, auctions, sweep */
    marketplace: "0xb3fb5aA85e5578C0B2F98bEe45985038Ae931b4C" as `0x${string}`,
    /** MarketplaceViews — paginated read-only enumeration */
    marketplaceViews: "0x4CA91348E44481C2dc923FfC69f8017Ac4731FcD" as `0x${string}`,
    /** CollectionTokenViews — token supply & enumeration */
    tokenViews: "0xb799CDB12657fB28bA53E6Ce572030Fc9Bd73068" as `0x${string}`,
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
