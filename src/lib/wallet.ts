import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

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
  const { address, isConnected, status, connector, chain } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const ready = mounted && status !== "connecting" && status !== "reconnecting";

  return {
    address: mounted ? (address ?? null) : null,
    wallet: mounted && address ? shortenAddress(address) : null,
    connected: mounted && isConnected,
    connectorName: connector?.name ?? null,
    chainName: chain?.name ?? null,
    ready,
  };
}

export function useDisconnectWallet() {
  const { disconnect } = useDisconnect();
  return disconnect;
}
