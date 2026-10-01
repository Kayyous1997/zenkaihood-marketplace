import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";
import { http, fallback } from "wagmi";
import { robinhoodTestnet } from "./chains";

/**
 * WalletConnect Cloud project id (publishable). Set VITE_WALLETCONNECT_PROJECT_ID
 * to enable mobile/QR WalletConnect wallets; browser extension wallets
 * (MetaMask, Rabby, Coinbase Wallet, ...) work without it.
 */
export const walletConnectProjectId =
  (import.meta.env["VITE_WALLETCONNECT_PROJECT_ID"] as string | undefined) ?? "";

/**
 * Supported chains:
 * 1. Base Sepolia (chain ID 84532)
 * 2. Robinhood Chain Testnet (chain ID 46630)
 *
 * Multi-RPC fallback ensures resilience against individual RPC node downtime or DNS issues.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "NexDrop",
  appDescription: "A premium digital art marketplace.",
  projectId: walletConnectProjectId || "00000000000000000000000000000000",
  chains: [baseSepolia, robinhoodTestnet],
  transports: {
    [baseSepolia.id]: fallback([
      http("https://sepolia.base.org"),
      http("https://base-sepolia-rpc.publicnode.com"),
      http("https://base-sepolia.drpc.org"),
      http("https://base-sepolia.gateway.tenderly.co"),
    ]),
    [robinhoodTestnet.id]: fallback([
      http("https://rpc.testnet.chain.robinhood.com"),
    ]),
  },
  ssr: true,
});
