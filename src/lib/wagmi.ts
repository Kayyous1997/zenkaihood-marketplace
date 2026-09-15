import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, base, mainnet, optimism, polygon } from "wagmi/chains";

/**
 * WalletConnect Cloud project id (publishable). Set VITE_WALLETCONNECT_PROJECT_ID
 * to enable mobile/QR WalletConnect wallets; browser extension wallets
 * (MetaMask, Rabby, Coinbase Wallet, ...) work without it.
 */
export const walletConnectProjectId =
  (import.meta.env['VITE_WALLETCONNECT_PROJECT_ID'] as string | undefined) ?? "";

export const wagmiConfig = getDefaultConfig({
  appName: "Zenkaihood",
  appDescription: "A premium digital art marketplace.",
  projectId: walletConnectProjectId || "00000000000000000000000000000000",
  chains: [mainnet, base, arbitrum, optimism, polygon],
  ssr: true,
});
