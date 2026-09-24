import { defineChain } from "viem";
import { baseSepolia as wagmiBaseSepolia } from "wagmi/chains";
import { BASE_ICON_DATA_URL, ROBINHOOD_ICON_DATA_URL } from "@/components/chain-icons";

/**
 * Base Sepolia Testnet with custom icon metadata
 */
export const baseSepolia = {
  ...wagmiBaseSepolia,
  iconUrl: BASE_ICON_DATA_URL,
  iconBackground: "#0052FF",
};

/**
 * Robinhood Chain Testnet (Arbitrum Orbit L2)
 * Chain ID: 46630
 */
export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Testnet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.chain.robinhood.com"],
    },
    public: {
      http: ["https://rpc.testnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  iconUrl: ROBINHOOD_ICON_DATA_URL,
  iconBackground: "#000000",
  testnet: true,
});

export const SUPPORTED_CHAINS = [baseSepolia, robinhoodTestnet] as const;
export const SUPPORTED_CHAIN_IDS = [baseSepolia.id, robinhoodTestnet.id] as const;

export function isSupportedChainId(chainId: number | undefined | null): boolean {
  return chainId != null && (chainId === baseSepolia.id || chainId === robinhoodTestnet.id);
}
