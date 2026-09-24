import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { marketplaceAbi } from "@/contracts/marketplaceAbi";
import { registryAbi } from "@/contracts/registryAbi";
import { useAddresses } from "@/lib/deployments";
import { useWallet } from "@/lib/wallet";
import { parseContractError } from "@/lib/contract-errors";

export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
export const VERIFIER_ROLE = "0x25066dc7e4cb03e4d94356e974e6caee3db53be9907c08ec25f9b4c09d57a2c8" as `0x${string}`;
export const PAUSER_ROLE = "0x8973ec64b6352263323739f220460866e0d96bf116805837fb4f37bd82857bbc" as `0x${string}`;

export function useAdmin() {
  const addrs = useAddresses();
  const { address } = useWallet();

  // 1. Marketplace Contract Reads
  const { data: marketplaceOwner, refetch: refetchMarketplaceOwner, isLoading: isLoadingOwner } = useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "owner",
    query: { enabled: !!addrs?.marketplace },
  });

  const { data: pendingOwner, refetch: refetchPendingOwner } = useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "pendingOwner",
    query: { enabled: !!addrs?.marketplace },
  });

  const { data: marketplacePaused, refetch: refetchMarketplacePaused } = useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "paused",
    query: { enabled: !!addrs?.marketplace },
  });

  const { data: platformFeeBps, refetch: refetchPlatformFeeBps } = useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "platformFeeBps",
    query: { enabled: !!addrs?.marketplace },
  });

  const { data: feeRecipient, refetch: refetchFeeRecipient } = useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "feeRecipient",
    query: { enabled: !!addrs?.marketplace },
  });

  // 2. Collection Registry Reads
  const { data: isRegistryAdmin, refetch: refetchRegistryAdmin, isLoading: isLoadingAdmin } = useReadContract({
    address: addrs?.registry,
    abi: registryAbi,
    functionName: "hasRole",
    args: address ? [DEFAULT_ADMIN_ROLE, address as `0x${string}`] : undefined,
    query: { enabled: !!addrs?.registry && !!address },
  });

  const { data: isRegistryVerifier, refetch: refetchRegistryVerifier, isLoading: isLoadingVerifier } = useReadContract({
    address: addrs?.registry,
    abi: registryAbi,
    functionName: "hasRole",
    args: address ? [VERIFIER_ROLE, address as `0x${string}`] : undefined,
    query: { enabled: !!addrs?.registry && !!address },
  });

  const { data: isRegistryPauser, refetch: refetchRegistryPauser, isLoading: isLoadingPauser } = useReadContract({
    address: addrs?.registry,
    abi: registryAbi,
    functionName: "hasRole",
    args: address ? [PAUSER_ROLE, address as `0x${string}`] : undefined,
    query: { enabled: !!addrs?.registry && !!address },
  });

  const { data: registryPaused, refetch: refetchRegistryPaused } = useReadContract({
    address: addrs?.registry,
    abi: registryAbi,
    functionName: "paused",
    query: { enabled: !!addrs?.registry },
  });

  // 3. Write contracts
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isMarketplaceOwner =
    !!address && !!marketplaceOwner && marketplaceOwner.toLowerCase() === address.toLowerCase();

  const isPendingOwner =
    !!address && !!pendingOwner && pendingOwner.toLowerCase() === address.toLowerCase();

  const isAdmin =
    isMarketplaceOwner ||
    Boolean(isRegistryAdmin) ||
    Boolean(isRegistryVerifier) ||
    Boolean(isRegistryPauser);

  const isLoading =
    isLoadingOwner ||
    (!!address && (isLoadingAdmin || isLoadingVerifier || isLoadingPauser));

  // 4. Refetch all
  function refetchAll() {
    refetchMarketplaceOwner();
    refetchPendingOwner();
    refetchMarketplacePaused();
    refetchPlatformFeeBps();
    refetchFeeRecipient();
    refetchRegistryAdmin();
    refetchRegistryVerifier();
    refetchRegistryPauser();
    refetchRegistryPaused();
  }

  // ─── Marketplace Admin Actions ──────────────────────────────────────────

  async function setPlatformFeeBps(newBps: number) {
    if (!addrs?.marketplace) throw new Error("Marketplace not configured on this network.");
    try {
      toast.loading("Updating platform fee…", { id: "admin-fee" });
      const tx = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "setPlatformFeeBps",
        args: [BigInt(newBps)],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-fee" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-fee" });
      throw err;
    }
  }

  async function setFeeRecipient(newRecipient: `0x${string}`) {
    if (!addrs?.marketplace) throw new Error("Marketplace not configured on this network.");
    try {
      toast.loading("Updating fee recipient…", { id: "admin-recipient" });
      const tx = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "setFeeRecipient",
        args: [newRecipient],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-recipient" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-recipient" });
      throw err;
    }
  }

  async function setPaymentTokenSupported(token: `0x${string}`, supported: boolean) {
    if (!addrs?.marketplace) throw new Error("Marketplace not configured on this network.");
    try {
      toast.loading(`${supported ? "Enabling" : "Disabling"} payment token…`, { id: "admin-token" });
      const tx = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "setPaymentTokenSupported",
        args: [token, supported],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-token" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-token" });
      throw err;
    }
  }

  async function toggleMarketplacePause(pause: boolean) {
    if (!addrs?.marketplace) throw new Error("Marketplace not configured on this network.");
    try {
      toast.loading(`${pause ? "Pausing" : "Unpausing"} Marketplace…`, { id: "admin-pause-mkt" });
      const tx = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: pause ? "pause" : "unpause",
      });
      toast.loading("Waiting for confirmation…", { id: "admin-pause-mkt" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-pause-mkt" });
      throw err;
    }
  }

  async function transferMarketplaceOwnership(newOwner: `0x${string}`) {
    if (!addrs?.marketplace) throw new Error("Marketplace not configured on this network.");
    try {
      toast.loading("Initiating ownership transfer…", { id: "admin-owner" });
      const tx = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "transferOwnership",
        args: [newOwner],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-owner" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-owner" });
      throw err;
    }
  }

  async function acceptMarketplaceOwnership() {
    if (!addrs?.marketplace) throw new Error("Marketplace not configured on this network.");
    try {
      toast.loading("Claiming ownership…", { id: "admin-accept-owner" });
      const tx = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "acceptOwnership",
      });
      toast.loading("Waiting for confirmation…", { id: "admin-accept-owner" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-accept-owner" });
      throw err;
    }
  }

  // ─── Collection Registry Admin Actions ────────────────────────────────────

  async function setCollectionVerified(nftContract: `0x${string}`, verified: boolean) {
    if (!addrs?.registry) throw new Error("Registry not configured on this network.");
    try {
      toast.loading(`${verified ? "Verifying" : "Unverifying"} collection…`, { id: "admin-verify" });
      const tx = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "setCollectionVerified",
        args: [nftContract, verified],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-verify" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-verify" });
      throw err;
    }
  }

  async function setCollectionActive(nftContract: `0x${string}`, active: boolean) {
    if (!addrs?.registry) throw new Error("Registry not configured on this network.");
    try {
      toast.loading(`${active ? "Activating" : "Deactivating"} collection…`, { id: "admin-activate" });
      const tx = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: active ? "activateCollection" : "deactivateCollection",
        args: [nftContract],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-activate" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-activate" });
      throw err;
    }
  }

  async function toggleRegistryPause(pause: boolean) {
    if (!addrs?.registry) throw new Error("Registry not configured on this network.");
    try {
      toast.loading(`${pause ? "Pausing" : "Unpausing"} Collection Registry…`, { id: "admin-pause-reg" });
      const tx = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: pause ? "pause" : "unpause",
      });
      toast.loading("Waiting for confirmation…", { id: "admin-pause-reg" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-pause-reg" });
      throw err;
    }
  }

  async function grantRegistryRole(role: `0x${string}`, account: `0x${string}`) {
    if (!addrs?.registry) throw new Error("Registry not configured on this network.");
    try {
      toast.loading("Granting role…", { id: "admin-role" });
      const tx = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "grantRole",
        args: [role, account],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-role" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-role" });
      throw err;
    }
  }

  async function revokeRegistryRole(role: `0x${string}`, account: `0x${string}`) {
    if (!addrs?.registry) throw new Error("Registry not configured on this network.");
    try {
      toast.loading("Revoking role…", { id: "admin-role" });
      const tx = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "revokeRole",
        args: [role, account],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-role" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-role" });
      throw err;
    }
  }

  async function setRoyalty(
    nftContract: `0x${string}`,
    recipient: `0x${string}`,
    royaltyBps: number,
  ) {
    if (!addrs?.registry) throw new Error("Registry not configured on this network.");
    try {
      toast.loading("Updating collection royalty…", { id: "admin-royalty" });
      const tx = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "setRoyalty",
        args: [nftContract, recipient, BigInt(royaltyBps)],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-royalty" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-royalty" });
      throw err;
    }
  }

  async function setMetadataURI(nftContract: `0x${string}`, metadataURI: string) {
    if (!addrs?.registry) throw new Error("Registry not configured on this network.");
    try {
      toast.loading("Saving collection metadata URI…", { id: "admin-meta" });
      const tx = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "setMetadataURI",
        args: [nftContract, metadataURI],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-meta" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-meta" });
      throw err;
    }
  }

  async function registerCollectionByVerifier(
    nftContract: `0x${string}`,
    creator: `0x${string}`,
    tokenStandard: 0 | 1,
    royaltyRecipient: `0x${string}`,
    royaltyBps: number,
  ) {
    if (!addrs?.registry) throw new Error("Registry not configured on this network.");
    try {
      toast.loading("Executing verifier collection registration…", { id: "admin-reg-verifier" });
      const tx = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "registerCollectionByVerifier",
        args: [nftContract, creator, tokenStandard, royaltyRecipient, BigInt(royaltyBps)],
      });
      toast.loading("Waiting for confirmation…", { id: "admin-reg-verifier" });
      return tx;
    } catch (err) {
      toast.error(parseContractError(err), { id: "admin-reg-verifier" });
      throw err;
    }
  }

  return {
    // Roles & Access
    marketplaceOwner: marketplaceOwner as `0x${string}` | undefined,
    pendingOwner: pendingOwner as `0x${string}` | undefined,
    isMarketplaceOwner,
    isPendingOwner,
    isRegistryAdmin: Boolean(isRegistryAdmin),
    isRegistryVerifier: Boolean(isRegistryVerifier),
    isRegistryPauser: Boolean(isRegistryPauser),
    isAdmin,
    isLoading,

    // Status & Config
    marketplacePaused: Boolean(marketplacePaused),
    registryPaused: Boolean(registryPaused),
    platformFeeBps: platformFeeBps != null ? Number(platformFeeBps) : 0,
    feeRecipient: feeRecipient as `0x${string}` | undefined,

    // Writes
    setPlatformFeeBps,
    setFeeRecipient,
    setPaymentTokenSupported,
    toggleMarketplacePause,
    transferMarketplaceOwnership,
    acceptMarketplaceOwnership,
    setCollectionVerified,
    setCollectionActive,
    setRoyalty,
    setMetadataURI,
    registerCollectionByVerifier,
    toggleRegistryPause,
    grantRegistryRole,
    revokeRegistryRole,
    refetchAll,

    // Tx State
    hash,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  };
}
