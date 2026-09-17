import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { registryAbi } from "@/contracts/registryAbi";
import { useAddresses } from "@/lib/deployments";
import { parseContractError } from "@/lib/contract-errors";

/**
 * Reads a collection's registration status from the CollectionRegistry.
 * Used in /create to validate the contract address before submitting.
 */
export function useCollectionInfo(nftContract: `0x${string}` | undefined) {
  const addrs = useAddresses();
  return useReadContract({
    address: addrs?.registry,
    abi: registryAbi,
    functionName: "getCollection",
    args: nftContract ? [nftContract] : undefined,
    query: { enabled: !!addrs && !!nftContract },
  });
}

/**
 * Checks whether a collection is already registered.
 */
export function useIsRegistered(nftContract: `0x${string}` | undefined) {
  const addrs = useAddresses();
  return useReadContract({
    address: addrs?.registry,
    abi: registryAbi,
    functionName: "isRegistered",
    args: nftContract ? [nftContract] : undefined,
    query: { enabled: !!addrs && !!nftContract },
  });
}

/**
 * Paginated list of registered collection addresses from the registry.
 */
export function useRegisteredCollections(offset: bigint, limit: bigint) {
  const addrs = useAddresses();
  return useReadContract({
    address: addrs?.registry,
    abi: registryAbi,
    functionName: "getRegisteredCollections",
    args: [offset, limit],
    query: { enabled: !!addrs },
  });
}

/**
 * Write hook: register a collection + set metadata URI.
 *
 * Flow:
 *  1. registerCollection(nftContract, tokenStandard, royaltyRecipient, royaltyBps)
 *  2. (on success) setMetadataURI(nftContract, metadataURI)
 *
 * Pre-conditions (check before calling):
 *  - Connected wallet must be owner() of nftContract (IERC173)
 *  - royaltyBps <= 1000 (max 10%)
 *  - if royaltyBps > 0 then royaltyRecipient != address(0)
 *  - collection must NOT already be registered
 */
export function useRegistry() {
  const addrs = useAddresses();

  const {
    writeContractAsync,
    data: hash,
    isPending,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  async function registerCollection(
    nftContract: `0x${string}`,
    tokenStandard: 0 | 1, // 0 = ERC721, 1 = ERC1155
    royaltyRecipient: `0x${string}`,
    royaltyBps: number, // 0–1000
  ) {
    if (!addrs) throw new Error("Unsupported chain — switch to Base Sepolia.");
    try {
      toast.loading("Submitting registration…", { id: "registry" });
      const txHash = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "registerCollection",
        args: [nftContract, tokenStandard, royaltyRecipient, royaltyBps],
      });
      toast.loading("Waiting for confirmation…", { id: "registry" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "registry" });
      throw err;
    }
  }

  async function setMetadataURI(nftContract: `0x${string}`, metadataURI: string) {
    if (!addrs) throw new Error("Unsupported chain — switch to Base Sepolia.");
    try {
      toast.loading("Saving metadata…", { id: "metadata" });
      const txHash = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "setMetadataURI",
        args: [nftContract, metadataURI],
      });
      toast.loading("Waiting for confirmation…", { id: "metadata" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "metadata" });
      throw err;
    }
  }

  async function setRoyalty(
    nftContract: `0x${string}`,
    recipient: `0x${string}`,
    royaltyBps: number,
  ) {
    if (!addrs) throw new Error("Unsupported chain — switch to Base Sepolia.");
    try {
      toast.loading("Updating royalty…", { id: "royalty" });
      const txHash = await writeContractAsync({
        address: addrs.registry,
        abi: registryAbi,
        functionName: "setRoyalty",
        args: [nftContract, recipient, royaltyBps],
      });
      toast.loading("Waiting for confirmation…", { id: "royalty" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "royalty" });
      throw err;
    }
  }

  return {
    registerCollection,
    setMetadataURI,
    setRoyalty,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  };
}
