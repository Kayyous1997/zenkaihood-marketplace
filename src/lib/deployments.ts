import { useChainId } from "wagmi";
import { getAddresses } from "@/contracts/addresses";
import type { Addresses } from "@/contracts/addresses";

/**
 * Returns the deployed contract addresses for the currently connected chain.
 * Returns null when the connected chain is not supported (no deployment).
 *
 * Usage:
 *   const addrs = useAddresses();
 *   if (!addrs) return <SwitchNetworkPrompt />;
 *   // addrs.marketplace, addrs.registry, etc.
 */
export function useAddresses(): Addresses {
  const chainId = useChainId();
  return getAddresses(chainId);
}
