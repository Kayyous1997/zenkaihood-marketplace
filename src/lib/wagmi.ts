import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

/**
 * WalletConnect Cloud project id (publishable). Set VITE_WALLETCONNECT_PROJECT_ID
 * to enable mobile/QR WalletConnect wallets; browser extension wallets
 * (MetaMask, Rabby, Coinbase Wallet, ...) work without it.
 */
export const walletConnectProjectId =
  (import.meta.env["VITE_WALLETCONNECT_PROJECT_ID"] as string | undefined) ?? "";

/**
 * Primary supported chain: Base Sepolia (chain ID 84532).
 * All Marketplace + CollectionRegistry contracts are deployed here.
 * Update this array when mainnet contracts are deployed.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "Zenkaihood",
  appDescription: "A premium digital art marketplace.",
  projectId: walletConnectProjectId || "00000000000000000000000000000000",
  chains: [baseSepolia],
  ssr: true,
});
