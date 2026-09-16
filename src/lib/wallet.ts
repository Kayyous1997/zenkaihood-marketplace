import { useEffect, useState } from "react";
import { useAccount, useChains, useDisconnect } from "wagmi";

/** Shorten an EVM address for display: 0x7a3f...9c2e */
export function shortenAddress(address?: string | null) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Real wallet state, backed by wagmi / RainbowKit.
 * `ready` stays false until the client has hydrated and reconnection settled.
 */
export function useWallet() {
  const { address, isConnected, status, connector, chain, chainId } = useAccount();
  const supportedChains = useChains();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const ready = mounted && status !== "connecting" && status !== "reconnecting";
  const unsupported =
    mounted && isConnected && chainId != null && !supportedChains.some((c) => c.id === chainId);

  return {
    address: mounted ? (address ?? null) : null,
    wallet: mounted && address ? shortenAddress(address) : null,
    connected: mounted && isConnected,
    connectorName: connector?.name ?? null,
    // On an unsupported network, wagmi resolves `chain` as undefined — surface that.
    chainName: chain?.name ?? null,
    chainId: chainId ?? null,
    unsupported,
    ready,
  };
}

export function useDisconnectWallet() {
  const { disconnect } = useDisconnect();
  return disconnect;
}
