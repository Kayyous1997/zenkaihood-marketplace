import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider
        appInfo={{ appName: "Zenkaihood" }}
        theme={darkTheme({
          accentColor: "hsl(var(--primary))",
          accentColorForeground: "hsl(var(--primary-foreground))",
          borderRadius: "small",
          overlayBlur: "small",
        })}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
